import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface DailyStats {
  userId: string;
  date: string; // YYYY-MM-DD
  calories: number;
  goalCalories: number;
  steps: number;
  distance: number;
  restingHeartRate: number;
  sleepScore: number;
  lastWeekCalories: number;
  lastWeekSteps: number;
  lastWeekRestingHeartRate: number;
  lastWeekSleepScore: number;
  lastUpdated: any;
}

export interface PersonalBests {
  userId: string;
  maxCalories: number;
  maxSteps: number;
  maxDistance: number;
  totalWorkouts: number;
  currentStreak: number;
  lastWorkoutDate: string | null;
  longestStreak: number;
  exerciseBests?: Record<string, { weight: number; reps: number; date: string }>;
}

const getTodayDate = () => new Date().toISOString().split('T')[0];

export async function initializeDailyStats(userId: string) {
  const date = getTodayDate();
  const docId = `${userId}_${date}`;
  const docRef = doc(db, 'dailyStats', docId);

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      // Get user's preferred goal
      const userSnap = await getDoc(doc(db, 'users', userId));
      const goalCalories = userSnap.exists() ? (userSnap.data().goalCalories || 600) : 600;

      const initialStats: DailyStats = {
        userId,
        date,
        calories: 0,
        goalCalories,
        steps: 0,
        distance: 0,
        restingHeartRate: 0, // No mock data
        sleepScore: 0,      // No mock data
        lastWeekCalories: 0,
        lastWeekSteps: 0,
        lastWeekRestingHeartRate: 0,
        lastWeekSleepScore: 0,
        lastUpdated: serverTimestamp()
      };
      await setDoc(docRef, initialStats);
      return initialStats;
    }
    return snap.data() as DailyStats;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `dailyStats/${docId}`);
    return null;
  }
}

export async function addWorkoutToStats(userId: string, caloriesBurned: number) {
  const date = getTodayDate();
  const docId = `${userId}_${date}`;
  const docRef = doc(db, 'dailyStats', docId);

  try {
    const snapBefore = await getDoc(docRef);
    if (!snapBefore.exists()) {
      await initializeDailyStats(userId);
    }

    await updateDoc(docRef, {
      calories: increment(caloriesBurned),
      lastUpdated: serverTimestamp()
    });
    
    // Check personal bests after update
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return await updatePersonalBests(userId, snap.data() as DailyStats);
    }
    return { streaks: { current: 1, best: 1 }, newPBs: [] };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `dailyStats/${docId}`);
    return { streaks: { current: 0, best: 0 }, newPBs: [] };
  }
}

export async function updateExercisePBs(userId: string, sessionExercises: any[]) {
  const pbRef = doc(db, 'personalBests', userId);
  const newExercisePBs: string[] = [];

  try {
    const snap = await getDoc(pbRef);
    if (!snap.exists()) return [];

    const data = snap.data() as PersonalBests;
    const currentBests = data.exerciseBests || {};
    const updates: any = {};
    const today = getTodayDate();
    let hasUpdates = false;

    sessionExercises.forEach(ex => {
      const maxWeight = Math.max(...ex.sets.map((s: any) => s.weight));
      const bestSet = ex.sets.find((s: any) => s.weight === maxWeight);
      
      const previousBest = currentBests[ex.name];
      if (!previousBest || maxWeight > previousBest.weight) {
        currentBests[ex.name] = {
          weight: maxWeight,
          reps: bestSet?.reps || 0,
          date: today
        };
        newExercisePBs.push(ex.name);
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      await updateDoc(pbRef, { exerciseBests: currentBests });
    }

    return newExercisePBs;
  } catch (err) {
    console.error('Error updating exercise PBs:', err);
    return [];
  }
}

export async function updatePersonalBests(userId: string, currentStats: DailyStats) {
  const pbRef = doc(db, 'personalBests', userId);
  const today = getTodayDate();
  
  try {
    const snap = await getDoc(pbRef);
    const newPBs: string[] = [];
    let streakInfo = { current: 1, best: 1 };

    if (!snap.exists()) {
      await setDoc(pbRef, {
        userId,
        maxCalories: currentStats.calories,
        maxSteps: currentStats.steps,
        maxDistance: currentStats.distance,
        totalWorkouts: 1,
        currentStreak: 1,
        lastWorkoutDate: today,
        longestStreak: 1
      });
      newPBs.push('First Workout!');
    } else {
      const data = snap.data() as PersonalBests;
      const updates: any = {};
      
      if (currentStats.calories > (data.maxCalories || 0)) {
        updates.maxCalories = currentStats.calories;
        newPBs.push('Max Calories');
      }
      if (currentStats.steps > (data.maxSteps || 0)) {
        updates.maxSteps = currentStats.steps;
        newPBs.push('Max Steps');
      }
      if (currentStats.distance > (data.maxDistance || 0)) {
        updates.maxDistance = currentStats.distance;
        newPBs.push('Max Distance');
      }

      // Streak logic
      if (data.lastWorkoutDate !== today) {
        const lastDate = data.lastWorkoutDate ? new Date(data.lastWorkoutDate) : null;
        const todayDate = new Date(today);
        
        if (lastDate) {
          const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            // Consecutive day
            updates.currentStreak = (data.currentStreak || 0) + 1;
          } else if (diffDays > 1) {
            // Streak broken
            updates.currentStreak = 1;
          }
        } else {
          updates.currentStreak = 1;
        }
        
        updates.lastWorkoutDate = today;
        
        if (updates.currentStreak > (data.longestStreak || 0)) {
          updates.longestStreak = updates.currentStreak;
          newPBs.push('Longest Streak');
        }
        
        streakInfo.current = updates.currentStreak || data.currentStreak || 1;
        streakInfo.best = updates.longestStreak || data.longestStreak || 1;
      } else {
        streakInfo.current = data.currentStreak || 1;
        streakInfo.best = data.longestStreak || 1;
      }
      
      updates.totalWorkouts = increment(1);
      
      await updateDoc(pbRef, updates);
    }
    
    return { streaks: streakInfo, newPBs };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `personalBests/${userId}`);
    return { streaks: { current: 0, best: 0 }, newPBs: [] };
  }
}

export function subscribeToDailyStats(userId: string, callback: (stats: DailyStats) => void) {
  const date = getTodayDate();
  const docId = `${userId}_${date}`;
  return onSnapshot(
    doc(db, 'dailyStats', docId), 
    { includeMetadataChanges: true },
    (doc) => {
      if (doc.exists()) {
        callback(doc.data() as DailyStats);
      }
    },
    (err) => {
      if (!auth.currentUser) return; // Suppress noise during logout
      handleFirestoreError(err, OperationType.GET, `dailyStats/${docId}`);
    }
  );
}

export function subscribeToPersonalBests(userId: string, callback: (pb: PersonalBests) => void) {
  return onSnapshot(
    doc(db, 'personalBests', userId),
    { includeMetadataChanges: true },
    (doc) => {
      if (doc.exists()) {
        callback(doc.data() as PersonalBests);
      }
    },
    (err) => {
      if (!auth.currentUser) return; // Suppress noise during logout
      handleFirestoreError(err, OperationType.GET, `personalBests/${userId}`);
    }
  );
}

export async function updateSteps(userId: string, addedSteps: number, addedDistance: number, addedCalories: number) {
  const date = getTodayDate();
  const docId = `${userId}_${date}`;
  const docRef = doc(db, 'dailyStats', docId);

  try {
    await updateDoc(docRef, {
      steps: increment(addedSteps),
      distance: increment(addedDistance),
      calories: increment(addedCalories),
      lastUpdated: serverTimestamp()
    });
    
    // Also check for PBs periodically
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updatePersonalBests(userId, snap.data() as DailyStats);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `dailyStats/${docId}`);
  }
}

export async function getRecentWorkouts(userId: string, limitCount: number = 3) {
  const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
  const path = 'workouts';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function getPersonalBests(userId: string) {
  const { doc, getDoc } = await import('firebase/firestore');
  const path = `personalBests/${userId}`;
  try {
    const docRef = doc(db, 'personalBests', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as PersonalBests;
      if (data.exerciseBests) {
        return Object.entries(data.exerciseBests).map(([name, best]) => ({
          exerciseName: name,
          ...best
        }));
      }
    }
    return [];
  } catch (err) {
    if (!auth.currentUser) {
      console.warn('Synapse: getPersonalBests called while auth.currentUser is null. This usually happens during auth state transitions.');
      return [];
    }
    handleFirestoreError(err, OperationType.GET, path);
    return [];
  }
}

// Internal Data System
export async function logSleep(userId: string, hours: number) {
  const date = getTodayDate();
  const docId = `${userId}_${date}`;
  const docRef = doc(db, 'sleep_data', docId);
  
  try {
    // 1. Log detailed sleep entry
    await setDoc(docRef, {
      userId,
      date,
      hours,
      timestamp: serverTimestamp()
    });
    
    // 2. Update daily stats sleep score (1-100 scale based on hours)
    // Formula: (hours / 8) * 100 capped at 100
    const sleepScore = Math.min(Math.round((hours / 8) * 100), 100);
    const statsRef = doc(db, 'dailyStats', `${userId}_${date}`);
    
    const statsSnap = await getDoc(statsRef);
    if (statsSnap.exists()) {
      await updateDoc(statsRef, { sleepScore, lastUpdated: serverTimestamp() });
    } else {
      // Initialize with defaults if missing
      await setDoc(statsRef, {
        userId,
        date,
        calories: 0,
        goalCalories: 600,
        steps: 0,
        distance: 0,
        restingHeartRate: 0,
        sleepScore,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    }
    
    // 3. Recalculate readiness
    await updateReadinessScore(userId);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `sleep_data/${docId}`);
  }
}

export async function logBodyMetrics(userId: string, weight: number, bodyFat: number) {
  const date = getTodayDate();
  const docId = `${userId}_${date}`;
  const docRef = doc(db, 'body_data', docId);
  
  try {
    await setDoc(docRef, {
      userId,
      date,
      weight,
      bodyFat,
      timestamp: serverTimestamp()
    });
    
    // Update user profile with latest weight
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { weight, bodyFat, lastBodyUpdate: date });
    
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `body_data/${docId}`);
  }
}

export async function logHeartRate(userId: string, bpm: number) {
  const date = getTodayDate();
  const docId = `${userId}_${date}`;
  const statsRef = doc(db, 'dailyStats', docId);

  try {
    const snap = await getDoc(statsRef);
    if (!snap.exists()) {
      await initializeDailyStats(userId);
    }

    await updateDoc(statsRef, {
      restingHeartRate: bpm,
      lastUpdated: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `dailyStats/${docId}`);
  }
}

async function updateReadinessScore(userId: string) {
  const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
  const date = getTodayDate();
  
  try {
    // Fetch last 7 days of sleep for average consistency
    const q = query(
      collection(db, 'sleep_data'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(7)
    );
    const snap = await getDocs(q);
    const sleepLogs = snap.docs.map(d => d.data().hours);
    
    if (sleepLogs.length === 0) return;
    
    const avgSleep = sleepLogs.reduce((a, b) => a + b, 0) / sleepLogs.length;
    // readiness_score = (avgSleep * 10) adjusted to max 100
    const score = Math.min(Math.round(avgSleep * 12), 100); // Using 12 to make 8.3h = 100
    
    const readinessRef = doc(db, 'readiness_data', `${userId}_${date}`);
    await setDoc(readinessRef, {
      userId,
      date,
      score,
      lastUpdated: serverTimestamp()
    });
  } catch (err) {
    console.error('Readiness Calculation Error:', err);
  }
}

export function subscribeToReadiness(userId: string, callback: (score: number) => void) {
  const date = getTodayDate();
  const docId = `${userId}_${date}`;
  return onSnapshot(
    doc(db, 'readiness_data', docId), 
    (doc) => {
      if (doc.exists()) {
        callback(doc.data().score);
      } else {
        callback(0);
      }
    },
    (err) => {
      if (!auth.currentUser) return; // Suppress noise during logout
      handleFirestoreError(err, OperationType.GET, `readiness_data/${docId}`);
    }
  );
}
