import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Pause,
  Square, 
  Plus, 
  Minus,
  Trash2, 
  Check, 
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  History as HistoryIcon,
  Trophy,
  Flame,
  Sparkles,
  Star,
  Zap,
  RefreshCw
} from 'lucide-react';
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { addWorkoutToStats, updateExercisePBs } from '../services/fitnessService';
import Logo from './Logo';

const EXERCISE_DATABASE = [
  {
    name: 'Bench Press',
    variations: ['Flat Barbell', 'Incline Barbell', 'Decline Barbell', 'Flat Dumbbell', 'Incline Dumbbell', 'Decline Dumbbell', 'Machine Press']
  },
  {
    name: 'Deadlift',
    variations: ['Conventional', 'Sumo', 'Stiff Leg', 'Romanian', 'Trap Bar', 'Rack Pull']
  },
  {
    name: 'Squat',
    variations: ['High Bar Back', 'Low Bar Back', 'Front', 'Goblet', 'Hack Squat', 'Leg Press', 'Box Squat']
  },
  {
    name: 'Shoulder Press',
    variations: ['Overhead Barbell', 'Seated Dumbbell', 'Arnold Press', 'Military Press', 'Machine Press']
  },
  {
    name: 'Bicep Curl',
    variations: ['Standing Barbell', 'Hammer Curl', 'Preacher Curl', 'Incline Dumbbell', 'EZ-Bar Curl', 'Cable Curl']
  },
  {
    name: 'Tricep Extension',
    variations: ['Cable Pushdown', 'Skullcrusher', 'Overhead Dumbbell', 'Dips', 'Close Grip Bench']
  },
  {
    name: 'Row',
    variations: ['Bent Over Barbell', 'One-Arm Dumbbell', 'Seated Cable', 'T-Bar Row', 'Chest Supported']
  },
  {
    name: 'Lat Pulldown',
    variations: ['Wide Grip', 'Close Grip', 'Underhand', 'Neutral Grip', 'Pull Up', 'Chin Up']
  }
];

interface Set {
  weight: number;
  reps: number;
  isCompleted: boolean;
  type: 'working' | 'warmup' | 'dropset' | 'amrap';
  rpe?: number;
  notes?: string;
  error?: string;
}

interface Exercise {
  id: string;
  name: string;
  variation: string;
  sets: Set[];
  notes?: string;
}

export default function WorkoutSession() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(() => {
    return localStorage.getItem('synapse_active_session') === 'true';
  });
  const [seconds, setSeconds] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>(() => {
    const savedExercises = localStorage.getItem('synapse_session_exercises');
    return savedExercises ? JSON.parse(savedExercises) : [];
  });
  const [isFinishing, setIsFinishing] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [personalBests, setPersonalBests] = useState<Record<string, { weight: number; reps: number; date: string }>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [restSeconds, setRestSeconds] = useState(0);
  const [isRestPaused, setIsRestPaused] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const restIntervalRef = useRef<any>(null);
  const startTimeRef = useRef<number | null>(null);
  const restEndTimeRef = useRef<number | null>(null);

  // Initialize startTimeRef from localStorage on mount
  useEffect(() => {
    const savedStart = localStorage.getItem('synapse_session_start');
    if (savedStart && isActive) {
      startTimeRef.current = parseInt(savedStart);
    }
  }, []);

  useEffect(() => {
    const loadPlan = async () => {
      if (!user || exercises.length > 0) return;
      setLoadingPlan(true);
      try {
        const planSnap = await getDoc(doc(db, 'workoutPlans', user.uid));
        if (planSnap.exists()) {
          const planData = planSnap.data();
          const today = new Date().getDay();
          const todaySchedule = planData.week_schedule[today];
          
          if (todaySchedule && todaySchedule.exercises.length > 0) {
            const planExercises = todaySchedule.exercises.map((ex: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              name: ex.name,
              variation: 'Standard',
              sets: Array(ex.sets || 3).fill(null).map(() => ({ 
                weight: 0, 
                reps: parseInt(ex.reps) || 12,
                isCompleted: false,
                type: 'working'
              })),
              notes: ''
            }));
            setExercises(planExercises);
          }
        }
      } catch (err) {
        console.error('Error loading plan:', err);
      } finally {
        setLoadingPlan(false);
      }
    };
    if (isActive) loadPlan();
  }, [user.uid, isActive]);

  useEffect(() => {
    const loadPBs = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'personalBests', user.uid));
        if (snap.exists()) {
          setPersonalBests(snap.data().exerciseBests || {});
        }
      } catch (err) {
        console.error('Error loading PBs:', err);
      }
    };
    if (isActive) loadPBs();
  }, [user.uid, isActive]);

  useEffect(() => {
    if (isActive) {
      localStorage.setItem('synapse_active_session', 'true');
      localStorage.setItem('synapse_session_exercises', JSON.stringify(exercises));
      if (!localStorage.getItem('synapse_session_start')) {
        const now = Date.now();
        localStorage.setItem('synapse_session_start', now.toString());
        startTimeRef.current = now;
      } else if (!startTimeRef.current) {
        startTimeRef.current = parseInt(localStorage.getItem('synapse_session_start')!);
      }
    } else {
      localStorage.removeItem('synapse_active_session');
      localStorage.removeItem('synapse_session_start');
      localStorage.removeItem('synapse_session_exercises');
      startTimeRef.current = null;
    }
  }, [isActive, exercises]);

  useEffect(() => {
    let interval: any = null;
    
    const tick = () => {
      if (startTimeRef.current) {
        setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    };

    if (isActive) {
      tick();
      interval = setInterval(tick, 1000);

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') tick();
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      clearInterval(interval);
      setSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    const updateRest = () => {
      if (restEndTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((restEndTimeRef.current - Date.now()) / 1000));
        setRestSeconds(remaining);
        if (remaining === 0) {
          restEndTimeRef.current = null;
        }
      }
    };

    if (restSeconds > 0 && !isRestPaused) {
      restIntervalRef.current = setInterval(updateRest, 1000);
      
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') updateRest();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        clearInterval(restIntervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    }
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, [restSeconds, isRestPaused]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startWorkout = () => {
    const now = Date.now();
    startTimeRef.current = now;
    localStorage.setItem('synapse_session_start', now.toString());
    setIsActive(true);
    if (exercises.length === 0) {
      addExercise();
    }
  };

  const addExercise = () => {
    const defaultEx = EXERCISE_DATABASE[0];
    setExercises([...exercises, { 
      id: Math.random().toString(36).substr(2, 9),
      name: defaultEx.name, 
      variation: defaultEx.variations[0],
      sets: [{ weight: 0, reps: 0, isCompleted: false, type: 'working' }],
      notes: ''
    }]);
  };

  const updateExerciseName = (index: number, name: string) => {
    const newExercises = [...exercises];
    const dbEntry = EXERCISE_DATABASE.find(e => e.name === name);
    newExercises[index].name = name;
    newExercises[index].variation = dbEntry?.variations[0] || 'Standard';
    setExercises(newExercises);
  };

  const updateExerciseVariation = (index: number, variation: string) => {
    const newExercises = [...exercises];
    newExercises[index].variation = variation;
    setExercises(newExercises);
  };

  const removeExercise = (index: number) => {
    const newExercises = [...exercises];
    newExercises.splice(index, 1);
    setExercises(newExercises);
  };

  const addSet = (exerciseIndex: number) => {
    const newExercises = [...exercises];
    const lastSet = newExercises[exerciseIndex].sets[newExercises[exerciseIndex].sets.length - 1];
    newExercises[exerciseIndex].sets.push({ 
      weight: lastSet?.weight || 0, 
      reps: lastSet?.reps || 0,
      isCompleted: false,
      type: lastSet?.type || 'working',
      rpe: lastSet?.rpe
    });
    setExercises(newExercises);
  };

  const skipRest = () => {
    setRestSeconds(0);
    restEndTimeRef.current = null;
    setIsRestPaused(false);
  };

  const toggleRestPause = () => {
    if (!isRestPaused) {
      // Pausing: restEndTime holds the future timestamp. 
      // We don't need to do anything special here as the interval will stop.
    } else {
      // Unpausing: Recalculate restEndTime based on remaining seconds
      restEndTimeRef.current = Date.now() + restSeconds * 1000;
    }
    setIsRestPaused(!isRestPaused);
  };

  const adjustRestDuration = (amount: number) => {
    setRestDuration(prev => Math.max(10, prev + amount));
    if (restSeconds > 0) {
      setRestSeconds(prev => Math.max(5, prev + amount));
      if (restEndTimeRef.current) {
        restEndTimeRef.current += amount * 1000;
      }
    }
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof Set, value: any) => {
    const newExercises = [...exercises];
    const currentSet = newExercises[exerciseIndex].sets[setIndex];
    
    // Validation logic
    let error = '';
    if (field === 'weight') {
      const weight = parseFloat(value);
      if (isNaN(weight) || weight < 0) error = 'Invalid Weight';
      if (weight > 1000) error = 'Weight exceeds limit';
    } else if (field === 'reps') {
      const reps = parseInt(value);
      if (isNaN(reps) || reps < 0) error = 'Invalid Reps';
      if (reps > 999) error = 'Reps exceed limit';
    } else if (field === 'rpe') {
      const rpe = value === '' ? undefined : parseFloat(value);
      if (rpe !== undefined && (isNaN(rpe) || rpe < 0 || rpe > 10)) {
        error = 'RPE must be 0-10';
      }
    }

    (currentSet as any)[field] = value;
    currentSet.error = error;
    
    // Trigger rest timer when marking as completed
    if (field === 'isCompleted' && value === true) {
      if (currentSet.error) {
        addNotification('info', 'Validation Error', currentSet.error);
        (currentSet as any)[field] = false;
        setExercises(newExercises);
        return;
      }
      setRestSeconds(restDuration);
      restEndTimeRef.current = Date.now() + restDuration * 1000;
      setIsRestPaused(false);
    }
    
    setExercises(newExercises);
  };

  const updateExerciseNotes = (index: number, notes: string) => {
    const newExercises = [...exercises];
    newExercises[index].notes = notes;
    setExercises(newExercises);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newExercises = [...exercises];
    newExercises[exerciseIndex].sets.splice(setIndex, 1);
    if (newExercises[exerciseIndex].sets.length === 0) {
      newExercises.splice(exerciseIndex, 1);
    }
    setExercises(newExercises);
  };

  const finishWorkout = async () => {
    if (!user) return;
    setIsFinishing(true);
    const path = 'workouts';
    
    // Final calculation of duration for maximum accuracy
    let finalDuration = seconds;
    if (startTimeRef.current) {
      finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    }

    try {
      const completedExercises = exercises.filter(ex => ex.sets.some(s => s.isCompleted));
      const workoutData = {
        userId: user.uid,
        duration: finalDuration,
        timestamp: serverTimestamp(),
        exercises: completedExercises.map(ex => ({
          ...ex,
          sets: ex.sets.filter(s => s.isCompleted)
        }))
      };

      await addDoc(collection(db, 'workouts'), workoutData);

      // Update Daily Stats & Personal Bests
      const caloriesBurned = Math.round((finalDuration / 60) * 8); // ~8 kcal per minute avg
      const [results, exercisePBResults] = await Promise.all([
        addWorkoutToStats(user.uid, caloriesBurned),
        updateExercisePBs(user.uid, workoutData.exercises)
      ]);

      // Prepare Summary Data
      const totalVolume = workoutData.exercises.reduce((acc, ex) => 
        acc + ex.sets.reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0), 0
      );
      
      setSummaryData({
        duration: finalDuration,
        totalVolume,
        exerciseCount: workoutData.exercises.length,
        streaks: results?.streaks || { current: 1, best: 1 },
        newPBs: results?.newPBs || [], // General stats PBs
        exercisePBs: exercisePBResults || [], // Exercise specific PBs
        exercises: workoutData.exercises
      });

      localStorage.removeItem('synapse_active_session');
      localStorage.removeItem('synapse_session_start');
      localStorage.removeItem('synapse_session_exercises');
      
      addNotification(
        'success',
        'Session Synchronized',
        'Your performance data has been uploaded to the neural core. Exceptional work.'
      );

      if (results?.newPBs && results.newPBs.length > 0) {
        setTimeout(() => {
          addNotification(
            'milestone',
            'Shattered Reality',
            `You achieved ${results.newPBs.length} new personal records. Neuro-adaptation in progress.`
          );
        }, 1500);
      }

      setShowSummary(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setIsFinishing(false);
    }
  };

  if (showSummary && summaryData) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-bg-primary text-text-primary p-8 pt-20 text-center"
      >
        <header className="mb-14">
          <div className="w-24 h-24 neural-gradient rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-brand-primary/20 relative">
            <Trophy size={48} className="text-white relative z-10" />
            <motion.div 
              animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
              transition={{ duration: 10, repeat: Infinity }}
              className="absolute inset-0 border-2 border-white/20 border-dashed rounded-[2.5rem]"
            />
          </div>
          <h1 className="text-5xl font-bold italic uppercase tracking-tighter mb-4 font-display leading-none">Protocol<br/><span className="neural-text-gradient">Finalized</span></h1>
          <p className="text-[10px] text-brand-primary font-bold uppercase tracking-[0.4em] font-display">Optimization Successful</p>
        </header>

        <div className="grid grid-cols-2 gap-6 mb-14">
          <div className="bg-bg-card p-8 rounded-[3rem] border border-border-color shadow-sm relative group">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Clock size={20} />
              </div>
              <div className="text-4xl font-bold italic uppercase tracking-tighter font-display text-text-primary">{Math.floor(summaryData.duration / 60)}</div>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.2em] font-display">Temporal Depth</p>
            </div>
          </div>
          <div className="bg-bg-card p-8 rounded-[3rem] border border-border-color shadow-sm relative group">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-vibrant/10 flex items-center justify-center text-brand-vibrant">
                <Flame size={20} />
              </div>
              <div className="text-4xl font-bold italic uppercase tracking-tighter font-display text-text-primary">{summaryData.streaks.current}</div>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.2em] font-display">Neural Streak</p>
            </div>
          </div>
          <div className="bg-bg-card p-8 rounded-[3rem] border border-border-color shadow-sm relative group">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                <Zap size={20} />
              </div>
              <div className="text-4xl font-bold italic uppercase tracking-tighter font-display text-text-primary">{summaryData.totalVolume.toLocaleString()}</div>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.2em] font-display">Payload Mass</p>
            </div>
          </div>
          <div className="bg-bg-card p-8 rounded-[3rem] border border-border-color shadow-sm relative group">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Check size={20} />
              </div>
              <div className="text-4xl font-bold italic uppercase tracking-tighter font-display text-text-primary">{summaryData.exerciseCount}</div>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.2em] font-display">Modules Sync'd</p>
            </div>
          </div>
        </div>

        {(summaryData.newPBs.length > 0 || summaryData.exercisePBs.length > 0) && (
          <motion.section 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-14 bg-bg-secondary border border-brand-primary/20 p-10 rounded-[4rem] relative overflow-hidden group shadow-2xl"
          >
            <div className="absolute inset-0 bg-brand-primary/5 blur-3xl rounded-full scale-150 group-hover:scale-175 transition-transform duration-1000" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-3 mb-8">
                <Star size={20} className="text-brand-primary fill-current animate-pulse" />
                <h2 className="text-[12px] font-bold uppercase tracking-[0.5em] text-brand-primary font-display">Neural Peaks Detected</h2>
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                {summaryData.newPBs.map((pb: string, i: number) => (
                  <motion.div 
                    key={`gen-${i}`}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="px-6 py-3 neural-gradient text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl flex items-center gap-3 shadow-lg font-display"
                  >
                    <Trophy size={14} /> {pb}
                  </motion.div>
                ))}
                {summaryData.exercisePBs.map((pb: string, i: number) => (
                  <motion.div 
                    key={`ex-${i}`}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: (summaryData.newPBs.length + i) * 0.1 }}
                    className="px-6 py-3 bg-bg-card border border-brand-primary/30 text-brand-primary text-[10px] font-bold uppercase tracking-widest rounded-2xl flex items-center gap-3 font-display hover:border-brand-primary/60 transition-colors"
                  >
                    <Dumbbell size={14} /> PB: {pb}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        <section className="mb-14 text-left">
          <h2 className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-[0.4em] mb-8 ml-4 font-display">Module Execution Logs</h2>
          <div className="space-y-8">
            {summaryData.exercises.map((exercise: any, i: number) => {
              const isPB = summaryData.exercisePBs?.includes(exercise.name);
              return (
                <div key={i} className="bg-bg-card rounded-[2.5rem] border border-border-color overflow-hidden group hover:border-brand-primary/20 transition-all shadow-sm">
                  <div className="p-6 border-b border-border-color flex items-center justify-between bg-bg-secondary/50">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isPB ? "bg-brand-primary/10 text-brand-primary" : "bg-bg-primary text-text-secondary/40"}`}>
                        <Dumbbell size={18} className={isPB ? "animate-pulse" : ""} />
                      </div>
                      <h4 className="font-bold italic uppercase tracking-tight text-lg text-text-primary font-display">
                        {exercise.name}
                        {isPB && <span className="ml-3 text-[9px] bg-brand-primary text-white px-3 py-1 rounded-full italic not-italic tracking-widest shadow-lg">PEAK</span>}
                      </h4>
                    </div>
                    <span className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-[.2em] font-display">{exercise.variation}</span>
                  </div>
                  <div className="p-6 space-y-3">
            {exercise.sets.map((set: any, sIdx: number) => {
              const maxWeight = Math.max(...exercise.sets.map((s: any) => s.weight));
              const isTopSet = set.weight === maxWeight && set.weight > 0;
              
              return (
                <div key={sIdx} className={`flex items-center justify-between px-5 py-4 rounded-2xl bg-bg-secondary border transition-all ${isTopSet ? 'border-brand-primary/20 bg-brand-primary/5 shadow-inner' : 'border-transparent'}`}>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-bold text-text-secondary/40 italic font-display">SEQ {sIdx + 1}</span>
                      <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-lg font-display ${
                        set.type === 'warmup' ? 'bg-orange-500/10 text-orange-500' :
                        set.type === 'dropset' ? 'bg-brand-cyan/10 text-brand-cyan' :
                        set.type === 'amrap' ? 'bg-rose-500/10 text-rose-500' :
                        'bg-brand-primary/10 text-brand-primary'
                      }`}>
                        {set.type === 'warmup' ? 'W' : set.type === 'dropset' ? 'D' : set.type === 'amrap' ? 'F' : 'S'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-xl font-bold italic font-display ${isTopSet ? 'text-brand-primary' : 'text-text-primary'}`}>{set.weight}</span>
                      <span className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-widest font-display">kg</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-xl font-bold italic font-display ${isTopSet ? 'text-brand-primary' : 'text-text-primary'}`}>{set.reps}</span>
                      <span className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-widest font-display">reps</span>
                    </div>
                    {set.rpe && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-widest font-display">RPE</span>
                        <span className="text-lg font-bold italic text-brand-cyan font-display">{set.rpe}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-4 pb-20">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full bg-text-primary text-bg-primary py-8 rounded-[2rem] font-bold italic uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all font-display group"
          >
            Terminate Session <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="w-full bg-bg-card text-text-secondary py-8 rounded-[2rem] font-bold italic uppercase tracking-[0.3em] border border-border-color hover:bg-bg-secondary transition-all font-display opacity-40 hover:opacity-100">
            Broadcast Data
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary pb-32">
      {/* Header */}
      <header className="p-8 pb-6 flex justify-between items-center bg-bg-primary/95 backdrop-blur-2xl sticky top-0 z-[60] border-b border-border-color">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center text-text-secondary hover:text-brand-primary transition-all shadow-inner border border-border-color"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-text-primary font-display uppercase italic leading-none mb-1">Live Interface</h1>
            <span className="text-[10px] text-brand-primary font-bold uppercase tracking-[0.2em] font-display opacity-80">Protocol Node Active</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          {restSeconds > 0 && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-right border-r border-border-color pr-6"
            >
              <p className="text-[10px] text-brand-cyan font-bold uppercase tracking-[0.2em] mb-1 font-display">Recalibration</p>
              <h2 className="text-xl font-bold italic text-brand-cyan tabular-nums font-display">
                {restSeconds}s
              </h2>
            </motion.div>
          )}
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              <motion.div 
                animate={{ opacity: [1, 0.3, 1] }} 
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_12px_rgba(79,70,229,0.7)]" 
              />
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.2em] font-display">Time Active</p>
            </div>
            <h2 className="text-3xl font-bold italic uppercase tracking-tighter tabular-nums font-display text-text-primary">
              {formatTime(seconds)}
            </h2>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-8 max-w-2xl mx-auto">
        {loadingPlan ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Logo className="w-12 h-12 animate-pulse mb-6" />
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Downloading Synapse Protocol...</p>
          </div>
        ) : !isActive ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-40 h-40 bg-brand-primary/10 rounded-[3.5rem] flex items-center justify-center mb-12 relative group">
              <div className="absolute inset-0 bg-brand-primary/20 rounded-[3.5rem] blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
              <Play size={64} className="text-brand-primary ml-3 relative z-10 drop-shadow-2xl" />
              <motion.div 
                animate={{ scale: [1, 1.15, 1], rotate: [0, 90, 180, 270, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-brand-primary/30 border-dashed rounded-[3.5rem]"
              />
            </div>
            <h1 className="text-6xl font-bold italic uppercase tracking-tighter mb-6 leading-none text-text-primary font-display">
              Initialize<br/><span className="neural-text-gradient">Protocol X</span>
            </h1>
            <p className="text-text-secondary text-xs max-w-[280px] mb-16 uppercase font-bold tracking-[0.3em] leading-relaxed font-display opacity-60">
              Activate neural tracking to record physiological adaptation and performance metrics.
            </p>
            <button 
              onClick={startWorkout}
              className="w-full max-w-sm neural-gradient text-white py-8 rounded-[2rem] text-sm font-bold uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-4 font-display group"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
                <Zap size={18} fill="white" className="text-white" />
              </div>
              Begin Session
            </button>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {exercises.map((exercise, exIdx) => (
                <motion.div 
                  key={exercise.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="bg-bg-card rounded-[2.5rem] border border-border-color overflow-hidden shadow-xl"
                >
                  <div className="p-8 border-b border-border-color bg-bg-secondary/50 backdrop-blur-sm relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary opacity-50 group-hover:w-2 transition-all" />
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <p className="text-[10px] text-brand-primary font-bold uppercase tracking-[0.3em] font-display">Target Objective</p>
                          {personalBests[exercise.name] && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20">
                              <Trophy size={10} className="text-brand-primary" />
                              <span className="text-[8px] font-bold text-brand-primary uppercase tracking-widest font-display">
                                Neural Peak: {personalBests[exercise.name].weight}kg × {personalBests[exercise.name].reps}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <select 
                            value={exercise.name}
                            onChange={(e) => updateExerciseName(exIdx, e.target.value)}
                            className="bg-transparent text-3xl font-bold italic uppercase tracking-tighter text-text-primary outline-none appearance-none cursor-pointer hover:text-brand-primary transition-all w-full leading-none font-display"
                          >
                            {EXERCISE_DATABASE.map(ex => (
                              <option key={ex.name} value={ex.name} className="bg-bg-primary text-text-primary font-sans text-base p-4">{ex.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-bg-primary flex items-center justify-center border border-border-color text-brand-primary shadow-inner group-hover:scale-110 transition-transform">
                          <Dumbbell size={24} />
                        </div>
                        <button 
                          onClick={() => removeExercise(exIdx)}
                          className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all flex items-center justify-center border border-rose-500/20"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative group/sel">
                        <label className="absolute left-4 -top-2 px-2 bg-bg-secondary text-[8px] font-bold uppercase tracking-widest text-text-secondary font-display z-10">Variation</label>
                        <select 
                          value={exercise.variation}
                          onChange={(e) => updateExerciseVariation(exIdx, e.target.value)}
                          className="w-full bg-bg-primary border border-border-color rounded-2xl px-6 py-4 text-xs font-bold uppercase tracking-widest text-text-primary outline-none focus:border-brand-primary transition-all appearance-none cursor-pointer font-display shadow-inner"
                        >
                          {EXERCISE_DATABASE.find(e => e.name === exercise.name)?.variations.map(v => (
                            <option key={v} value={v} className="bg-bg-primary">{v}</option>
                          ))}
                        </select>
                        <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary/40 rotate-90 pointer-events-none" />
                      </div>
                      <div className="relative">
                        <label className="absolute left-4 -top-2 px-2 bg-bg-secondary text-[8px] font-bold uppercase tracking-widest text-text-secondary font-display z-10">Neural Notes</label>
                        <input 
                          type="text"
                          placeholder="RECORD INSIGHTS..."
                          value={exercise.notes || ''}
                          onChange={(e) => updateExerciseNotes(exIdx, e.target.value)}
                          className="w-full bg-bg-primary border border-border-color rounded-2xl px-6 py-4 text-xs font-bold uppercase tracking-widest text-text-primary outline-none focus:border-brand-primary transition-all font-display placeholder:text-text-secondary/20 shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-6 bg-bg-card">
                    <div className="grid grid-cols-[0.8fr,2fr,2fr,1.5fr,1fr] gap-4 text-[10px] text-text-secondary/40 font-bold uppercase tracking-[0.3em] text-center px-4 font-display">
                      <div>Seq</div>
                      <div>Weight</div>
                      <div>Reps</div>
                      <div>RPE</div>
                      <div>Status</div>
                    </div>
                    
                    <div className="space-y-4">
                      <AnimatePresence initial={false}>
                        {exercise.sets.map((set, sIdx) => (
                          <React.Fragment key={sIdx}>
                            <motion.div 
                            key={sIdx}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`grid grid-cols-[0.8fr,2fr,2fr,1.5fr,1fr] gap-4 items-center p-4 rounded-[1.5rem] border transition-all relative overflow-hidden group/set ${
                              set.isCompleted 
                              ? 'bg-brand-primary/5 border-brand-primary/20 opacity-40' 
                              : 'bg-bg-secondary border-border-color shadow-inner hover:border-brand-primary/30'
                            } ${set.error ? 'border-rose-500/50 bg-rose-500/5' : ''}`}
                          >
                            {set.error && (
                              <div className="absolute top-0 right-0 px-2 py-0.5 bg-rose-500 text-[6px] text-white font-bold uppercase tracking-widest rounded-bl-lg animate-pulse z-10">
                                {set.error}
                              </div>
                            )}
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-xs font-bold italic text-text-secondary font-display leading-none">{sIdx + 1}</span>
                              <button 
                                onClick={() => {
                                  const types: Set['type'][] = ['warmup', 'working', 'dropset', 'amrap'];
                                  const currentIdx = types.indexOf(set.type);
                                  const nextType = types[(currentIdx + 1) % types.length];
                                  updateSet(exIdx, sIdx, 'type', nextType);
                                }}
                                className={`text-[8px] font-bold uppercase px-2 py-1 rounded-lg font-display transition-all ${
                                  set.type === 'warmup' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                  set.type === 'dropset' ? 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20' :
                                  set.type === 'amrap' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                  'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                                }`}
                              >
                                {set.type === 'warmup' ? 'W' : set.type === 'dropset' ? 'D' : set.type === 'amrap' ? 'F' : 'S'}
                              </button>
                            </div>
                            
                            <div className="relative group/input">
                              <input 
                                type="number"
                                inputMode="decimal"
                                value={set.weight || ''}
                                onChange={(e) => updateSet(exIdx, sIdx, 'weight', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-bg-primary border border-border-color rounded-2xl py-4 text-center text-lg font-bold italic outline-none focus:border-brand-primary group-hover:border-brand-primary/40 transition-all font-display text-text-primary shadow-inner"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-text-secondary/20 pointer-events-none group-focus-within/input:text-brand-primary font-display">KG</span>
                            </div>

                            <div className="relative group/input">
                              <input 
                                type="number"
                                inputMode="numeric"
                                value={set.reps || ''}
                                onChange={(e) => updateSet(exIdx, sIdx, 'reps', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-bg-primary border border-border-color rounded-2xl py-4 text-center text-lg font-bold italic outline-none focus:border-brand-primary group-hover:border-brand-primary/40 transition-all font-display text-text-primary shadow-inner"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-text-secondary/20 pointer-events-none group-focus-within/input:text-brand-primary font-display uppercase tracking-widest">Reps</span>
                            </div>
                             <div className="relative group/input">
                              <select 
                                value={set.rpe || ''}
                                onChange={(e) => updateSet(exIdx, sIdx, 'rpe', e.target.value)}
                                className={`w-full bg-bg-primary border rounded-2xl py-4 text-center text-xs font-bold italic outline-none transition-all font-display text-brand-cyan shadow-inner appearance-none cursor-pointer ${
                                  set.rpe ? 'border-brand-cyan/20' : 'border-border-color focus:border-brand-cyan'
                                }`}
                              >
                                <option value="">RPE</option>
                                {[10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5].map(v => (
                                  <option key={v} value={v} className="bg-bg-primary text-text-primary">{v}</option>
                                ))}
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary/20">
                                <ChevronRight size={10} className="rotate-90" />
                              </div>
                            </div>

                            <div className="flex justify-center">
                              <button 
                                onClick={() => updateSet(exIdx, sIdx, 'isCompleted', !set.isCompleted)}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                                  set.isCompleted 
                                  ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20 scale-110 active:scale-95' 
                                  : 'bg-bg-primary text-text-secondary hover:text-text-primary border border-border-color hover:border-brand-primary/40 shadow-sm transition-all'
                                }`}
                              >
                                {set.isCompleted ? <Check size={20} strokeWidth={3} /> : <Minus size={20} />}
                              </button>
                            </div>
                          </motion.div>
                          
                          {/* Per-Set Notes Input (Expands on hover or if content exists) */}
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="px-6 mb-4 -mt-2 overflow-hidden"
                          >
                            <div className="relative group/set-note flex items-center gap-2">
                              <Sparkles size={8} className={`transition-all ${set.notes ? 'text-brand-primary' : 'text-text-secondary/20'}`} />
                              <input 
                                type="text"
                                placeholder="PERFORMANCE INSIGHTS..."
                                value={set.notes || ''}
                                onChange={(e) => updateSet(exIdx, sIdx, 'notes', e.target.value)}
                                className="w-full bg-transparent border-b border-border-color/10 py-2 text-[8px] font-bold uppercase tracking-widest text-text-secondary outline-none focus:border-brand-primary/30 transition-all font-display placeholder:text-text-secondary/10"
                              />
                            </div>
                          </motion.div>
                        </React.Fragment>
                        ))}
                      </AnimatePresence>
                    </div>
                    
                    <div className="flex items-center gap-4 pt-4 px-2">
                      <button 
                        onClick={() => addSet(exIdx)}
                        className="flex-1 py-5 bg-bg-primary border-2 border-dashed border-border-color rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.3em] text-text-secondary hover:border-brand-primary hover:text-brand-primary transition-all flex items-center justify-center gap-3 font-display group/add"
                      >
                        <Plus size={16} className="group-hover/add:rotate-90 transition-transform" /> Sync New Sequence
                      </button>
                      <button 
                        onClick={() => removeSet(exIdx, exercise.sets.length - 1)}
                        className="w-16 h-16 bg-bg-primary border border-border-color rounded-[1.5rem] text-text-secondary hover:text-rose-500 hover:border-rose-500/20 transition-all flex items-center justify-center shadow-inner"
                      >
                        <Minus size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <button 
              onClick={addExercise}
              className="w-full py-10 border-2 border-dashed rounded-[3.5rem] bg-bg-card border-border-color text-[11px] font-bold uppercase tracking-[0.4em] text-text-secondary hover:border-brand-primary hover:text-brand-primary transition-all flex items-center justify-center gap-4 group font-display mb-20 shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-bg-secondary flex items-center justify-center group-hover:bg-brand-primary/10 transition-colors">
                <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" /> 
              </div>
              Initialize Next Phase
            </button>
          </>
        )}
      </main>

      {/* Floating Action Bar */}
      {isActive && (
        <div className="fixed bottom-10 left-8 right-8 z-[100] flex flex-col gap-5">
          <AnimatePresence>
            {restSeconds > 0 && (
              <motion.div 
                initial={{ y: 100, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 100, opacity: 0, scale: 0.95 }}
                className="bg-bg-primary/95 backdrop-blur-3xl p-8 rounded-[3.5rem] border border-brand-cyan/20 shadow-2xl shadow-brand-cyan/10"
              >
                <div className="flex flex-col gap-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-brand-cyan/10 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                        <HistoryIcon size={32} className={`text-brand-cyan ${!isRestPaused ? 'animate-spin-slow' : ''}`} />
                      </div>
                      <div>
                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[.3em] mb-1 font-display">Optimization Cooldown</p>
                        <h3 className="text-4xl font-bold italic text-text-primary tabular-nums leading-none tracking-tighter font-display">
                          {restSeconds}<span className="text-sm ml-2 text-brand-cyan uppercase font-bold tracking-widest">sec</span>
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={toggleRestPause}
                        className="w-14 h-14 bg-bg-secondary rounded-[1.25rem] flex items-center justify-center text-text-primary hover:text-brand-primary transition-all border border-border-color shadow-sm active:scale-90"
                      >
                        {isRestPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                      </button>
                      <button 
                        onClick={skipRest}
                        className="bg-text-primary text-bg-primary px-8 py-5 rounded-[1.25rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:scale-[1.05] transition-all active:scale-95 shadow-lg font-display"
                      >
                        Overclock
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-6 border-t border-border-color/30">
                    <button 
                      onClick={() => adjustRestDuration(-15)}
                      className="flex-1 bg-bg-secondary py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-brand-cyan transition-all border border-border-color shadow-inner font-display"
                    >
                      -15 SEC
                    </button>
                    <button 
                      onClick={() => adjustRestDuration(15)}
                      className="flex-1 bg-bg-secondary py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-brand-cyan transition-all border border-border-color shadow-inner font-display"
                    >
                      +15 SEC
                    </button>
                    <div className="px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary/40 font-display">
                      Target: {restDuration}s
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={finishWorkout}
            disabled={isFinishing || exercises.length === 0 || restSeconds > 0}
            className="w-full neural-gradient text-white py-8 rounded-[2.5rem] font-bold italic uppercase tracking-[0.4em] flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all text-sm font-display group disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isFinishing ? (
              <RefreshCw className="animate-spin" size={24} />
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <Check size={20} className="text-white" strokeWidth={3} />
                </div>
                Finalize Mission
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
