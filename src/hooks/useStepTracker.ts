import { useState, useEffect, useRef, useCallback } from 'react';
import { updateSteps } from '../services/fitnessService';

export function useStepTracker(userId: string | undefined) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentSteps, setCurrentSteps] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const lastSyncSteps = useRef(0);
  const stepCount = useRef(0);
  const lastStepTime = useRef(0);
  
  // Detection constants
  const THRESHOLD = 12.0; 
  const COOLDOWN = 350; // ms between steps (max ~170 steps per min)
  
  // Standard constants
  const STEP_TO_KM = 0.00076; 
  const STEP_TO_KCAL = 0.045; 

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    const x = acc.x || 0;
    const y = acc.y || 0;
    const z = acc.z || 0;

    // Filter noise and focus on overall magnitude
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const now = Date.now();

    if (magnitude > THRESHOLD && now - lastStepTime.current > COOLDOWN) {
      stepCount.current += 1;
      lastStepTime.current = now;
      setCurrentSteps(stepCount.current);
    }
  }, []);

  const startTracking = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && 'requestPermission' in DeviceMotionEvent) {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          setIsTracking(true);
        } else {
          setPermissionGranted(false);
        }
      } catch (err) {
        console.error('Permission request failed', err);
        setPermissionGranted(false);
      }
    } else {
      // Browser doesn't require explicit permission (or desktop/other device)
      setPermissionGranted(true);
      setIsTracking(true);
    }
  };

  const stopTracking = () => {
    setIsTracking(false);
    // Push final data
    syncNow();
  };

  const syncNow = useCallback(() => {
    if (!userId || stepCount.current <= lastSyncSteps.current) return;

    const stepsToSync = stepCount.current - lastSyncSteps.current;
    const addedDistance = Number((stepsToSync * STEP_TO_KM).toFixed(4));
    const addedCalories = Number((stepsToSync * STEP_TO_KCAL).toFixed(2));
    
    updateSteps(userId, stepsToSync, addedDistance, addedCalories);
    lastSyncSteps.current = stepCount.current;
  }, [userId]);

  useEffect(() => {
    if (isTracking) {
      window.addEventListener('devicemotion', handleMotion);
    } else {
      window.removeEventListener('devicemotion', handleMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isTracking, handleMotion]);

  // Sync to Firestore every 20 steps
  useEffect(() => {
    const stepsToSync = currentSteps - lastSyncSteps.current;
    if (stepsToSync >= 20) {
      syncNow();
    }
  }, [currentSteps, syncNow]);

  return {
    isTracking,
    currentSteps,
    permissionGranted,
    startTracking,
    stopTracking,
    distance: currentSteps * STEP_TO_KM,
    calories: currentSteps * STEP_TO_KCAL,
    pendingSteps: currentSteps - lastSyncSteps.current,
    pendingDistance: (currentSteps - lastSyncSteps.current) * STEP_TO_KM,
    pendingCalories: (currentSteps - lastSyncSteps.current) * STEP_TO_KCAL
  };
}
