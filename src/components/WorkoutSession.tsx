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
  Zap
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
  type: 'working' | 'warmup' | 'dropset';
  rpe?: number;
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
  const [seconds, setSeconds] = useState(() => {
    const savedStart = localStorage.getItem('synapse_session_start');
    if (savedStart && localStorage.getItem('synapse_active_session') === 'true') {
      return Math.floor((Date.now() - parseInt(savedStart)) / 1000);
    }
    return 0;
  });
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
        localStorage.setItem('synapse_session_start', Date.now().toString());
      }
    } else {
      localStorage.removeItem('synapse_active_session');
      localStorage.removeItem('synapse_session_start');
      localStorage.removeItem('synapse_session_exercises');
    }
  }, [isActive, exercises]);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        const savedStart = localStorage.getItem('synapse_session_start');
        if (savedStart) {
          setSeconds(Math.floor((Date.now() - parseInt(savedStart)) / 1000));
        } else {
          setSeconds((prev) => prev + 1);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (restSeconds > 0 && !isRestPaused) {
      restIntervalRef.current = setInterval(() => {
        setRestSeconds((prev) => prev - 1);
      }, 1000);
    } else {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    }
    return () => clearInterval(restIntervalRef.current);
  }, [restSeconds, isRestPaused]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startWorkout = () => {
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
    setIsRestPaused(false);
  };

  const toggleRestPause = () => setIsRestPaused(!isRestPaused);

  const adjustRestDuration = (amount: number) => {
    setRestDuration(prev => Math.max(10, prev + amount));
    if (restSeconds > 0) {
      setRestSeconds(prev => Math.max(5, prev + amount));
    }
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof Set, value: any) => {
    const newExercises = [...exercises];
    const currentSet = newExercises[exerciseIndex].sets[setIndex];
    (currentSet as any)[field] = value;
    
    // Trigger rest timer when marking as completed
    if (field === 'isCompleted' && value === true) {
      setRestSeconds(restDuration);
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
    try {
      const completedExercises = exercises.filter(ex => ex.sets.some(s => s.isCompleted));
      const workoutData = {
        userId: user.uid,
        duration: seconds,
        timestamp: serverTimestamp(),
        exercises: completedExercises.map(ex => ({
          ...ex,
          sets: ex.sets.filter(s => s.isCompleted)
        }))
      };

      await addDoc(collection(db, 'workouts'), workoutData);

      // Update Daily Stats & Personal Bests
      const caloriesBurned = Math.round((seconds / 60) * 8); // ~8 kcal per minute avg
      const [results, exercisePBResults] = await Promise.all([
        addWorkoutToStats(user.uid, caloriesBurned),
        updateExercisePBs(user.uid, workoutData.exercises)
      ]);

      // Prepare Summary Data
      const totalVolume = workoutData.exercises.reduce((acc, ex) => 
        acc + ex.sets.reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0), 0
      );
      
      setSummaryData({
        duration: seconds,
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
        className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 pt-12 text-center"
      >
        <header className="mb-10">
          <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-accent/20">
            <Trophy size={40} className="text-accent" />
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Workout<br/>Complete!</h1>
          <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest">You just crushed your session.</p>
        </header>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)]">
            <div className="flex flex-col items-center gap-2">
              <Clock size={16} className="text-accent" />
              <div className="text-3xl font-black italic uppercase tracking-tighter">{Math.floor(summaryData.duration / 60)}</div>
              <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">Minutes</p>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)]">
            <div className="flex flex-col items-center gap-2">
              <Flame size={16} className="text-orange-500" />
              <div className="text-3xl font-black italic uppercase tracking-tighter">{summaryData.streaks.current}</div>
              <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">Day Streak</p>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)]">
            <div className="flex flex-col items-center gap-2">
              <Trophy size={16} className="text-blue-400" />
              <div className="text-3xl font-black italic uppercase tracking-tighter">{summaryData.totalVolume.toLocaleString()}</div>
              <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">Total Weight</p>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)]">
            <div className="flex flex-col items-center gap-2">
              <Check size={16} className="text-green-400" />
              <div className="text-3xl font-black italic uppercase tracking-tighter">{summaryData.exerciseCount}</div>
              <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">Exercises</p>
            </div>
          </div>
        </div>

        {(summaryData.newPBs.length > 0 || summaryData.exercisePBs.length > 0) && (
          <motion.section 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-10 bg-accent/10 border border-accent/20 p-8 rounded-[3rem] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-20 rotate-12">
              <Sparkles size={60} className="text-accent" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <Star size={16} className="text-accent fill-current" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Personal Records Smashed</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {summaryData.newPBs.map((pb: string, i: number) => (
                  <motion.div 
                    key={`gen-${i}`}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="px-4 py-2 bg-accent text-black text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 border border-accent"
                  >
                    <Trophy size={12} /> {pb}
                  </motion.div>
                ))}
                {summaryData.exercisePBs.map((pb: string, i: number) => (
                  <motion.div 
                    key={`ex-${i}`}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: (summaryData.newPBs.length + i) * 0.1 }}
                    className="px-4 py-2 bg-black border border-accent/40 text-accent text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2"
                  >
                    <Dumbbell size={12} /> PB: {pb}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        <section className="mb-10 text-left">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-6 ml-2">Training Logs</h2>
          <div className="space-y-6">
            {summaryData.exercises.map((exercise: any, i: number) => {
              const isPB = summaryData.exercisePBs?.includes(exercise.name);
              return (
                <div key={i} className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] overflow-hidden">
                  <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-3">
                      <Dumbbell size={16} className={isPB ? "text-accent animate-pulse" : "text-[var(--text-secondary)]"} />
                      <h4 className="font-black italic uppercase tracking-tighter text-sm">
                        {exercise.name}
                        {isPB && <span className="ml-2 text-[8px] bg-accent text-black px-2 py-0.5 rounded italic not-italic">NEW PB</span>}
                      </h4>
                    </div>
                    <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest">{exercise.variation}</span>
                  </div>
                  <div className="p-4 space-y-2">
            {exercise.sets.map((set: any, sIdx: number) => {
              const maxWeight = Math.max(...exercise.sets.map((s: any) => s.weight));
              const isTopSet = set.weight === maxWeight && set.weight > 0;
              
              return (
                <div key={sIdx} className={`flex items-center justify-between px-3 py-2 rounded-xl bg-black/40 border border-transparent ${isTopSet ? 'border-accent/10' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-black text-gray-700 italic">SET {sIdx + 1}</span>
                      <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${
                        set.type === 'warmup' ? 'bg-orange-500/20 text-orange-500' :
                        set.type === 'dropset' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-accent/20 text-accent'
                      }`}>
                        {set.type === 'warmup' ? 'Warmup' : set.type === 'dropset' ? 'Dropset' : 'Working'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-sm font-black italic ${isTopSet ? 'text-accent' : 'text-white'}`}>{set.weight}</span>
                      <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">kg</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-sm font-black italic ${isTopSet ? 'text-accent' : 'text-white'}`}>{set.reps}</span>
                      <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">reps</span>
                    </div>
                    {set.rpe && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">RPE</span>
                        <span className="text-xs font-black italic text-accent">{set.rpe}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
                  </div>
                  {isPB && (
                    <div className="bg-accent/5 px-5 py-3 border-t border-accent/10 flex items-center gap-2">
                      <Sparkles size={12} className="text-accent" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-accent">Personal Best Protocol Optimized</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full bg-accent text-black py-6 rounded-[2.5rem] font-black italic uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl shadow-accent/20"
          >
            Back to Dashboard <ChevronRight size={18} />
          </button>
          <button className="w-full bg-gray-900 text-gray-400 py-6 rounded-[2.5rem] font-black italic uppercase tracking-widest border border-gray-800">
            Share Progress
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-32">
      {/* Header */}
      <header className="p-6 pt-12 flex justify-between items-center bg-[var(--bg-primary)]/80 backdrop-blur-md sticky top-0 z-50 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <Logo className="w-4 h-4 mb-1" />
            <span className="text-[8px] text-[var(--text-secondary)] font-black uppercase tracking-widest leading-none">ID: {user?.uid.slice(0, 8)}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {restSeconds > 0 && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-right border-r border-[var(--border-color)] pr-4"
            >
              <p className="text-[8px] text-blue-400 font-black uppercase tracking-[0.2em] mb-1">Rest</p>
              <h2 className="text-sm font-black italic text-blue-400 tabular-nums">
                {restSeconds}s
              </h2>
            </motion.div>
          )}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 mb-1">
              <motion.div 
                animate={{ opacity: [1, 0.4, 1] }} 
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(45,212,191,0.6)]" 
              />
              <p className="text-[8px] text-accent font-black uppercase tracking-[0.2em]">Synaptic Live</p>
            </div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter tabular-nums">
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
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-accent/10 rounded-[2.5rem] flex items-center justify-center mb-8 relative">
              <Play size={40} className="text-accent ml-2" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 bg-accent rounded-full blur-2xl"
              />
            </div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-4 leading-none">Initialize<br/><span className="text-accent">Evolution</span></h1>
            <p className="text-gray-500 text-xs max-w-[240px] mb-12 uppercase font-black tracking-widest leading-relaxed">
              Activate neural tracking to record physiological adaptation.
            </p>
            <button 
              onClick={startWorkout}
              className="w-full max-w-sm bg-accent text-black py-7 rounded-[2.5rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Zap size={18} fill="black" /> Begin Session
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
                  className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] overflow-hidden shadow-xl"
                >
                  <div className="p-6 border-b border-[var(--border-color)] bg-black/40">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[8px] text-accent/50 font-black uppercase tracking-[0.3em]">Objective</p>
                          {personalBests[exercise.name] && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                              <Trophy size={8} className="text-accent" />
                              <span className="text-[7px] font-black text-accent uppercase tracking-widest">
                                Best: {personalBests[exercise.name].weight}kg × {personalBests[exercise.name].reps}
                              </span>
                            </div>
                          )}
                        </div>
                        <select 
                          value={exercise.name}
                          onChange={(e) => updateExerciseName(exIdx, e.target.value)}
                          className="bg-transparent text-xl font-black italic uppercase tracking-tighter text-accent outline-none appearance-none cursor-pointer hover:opacity-80 transition-opacity w-full leading-none"
                        >
                          {EXERCISE_DATABASE.map(ex => (
                            <option key={ex.name} value={ex.name} className="bg-[var(--bg-card)]">{ex.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center border border-accent/10">
                          <Dumbbell size={18} className="text-accent" />
                        </div>
                        <button 
                          onClick={() => removeExercise(exIdx)}
                          className="p-2 text-gray-700 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-[2] relative">
                        <select 
                          value={exercise.variation}
                          onChange={(e) => updateExerciseVariation(exIdx, e.target.value)}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                        >
                          {EXERCISE_DATABASE.find(e => e.name === exercise.name)?.variations.map(v => (
                            <option key={v} value={v} className="bg-[var(--bg-card)]">{v}</option>
                          ))}
                        </select>
                        <ChevronRight size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 rotate-90 pointer-events-none" />
                      </div>
                      <div className="flex-1">
                        <input 
                          type="text"
                          placeholder="NOTES"
                          value={exercise.notes || ''}
                          onChange={(e) => updateExerciseNotes(exIdx, e.target.value)}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] outline-none focus:border-accent transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-[0.8fr,2fr,2fr,1.5fr,1fr] gap-3 text-[9px] text-gray-600 font-black uppercase tracking-[.2em] text-center px-4">
                      <div>ID</div>
                      <div>Weight</div>
                      <div>Reps</div>
                      <div>RPE</div>
                      <div>Status</div>
                    </div>
                    
                    <div className="space-y-3">
                      <AnimatePresence initial={false}>
                        {exercise.sets.map((set, sIdx) => (
                          <motion.div 
                            key={sIdx}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`grid grid-cols-[0.8fr,2fr,2fr,1.5fr,1fr] gap-3 items-center p-3 rounded-2xl border transition-all ${
                              set.isCompleted 
                              ? 'bg-accent/5 border-accent/20 opacity-60' 
                              : 'bg-black border-[var(--border-color)]'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[11px] font-black italic text-gray-500 leading-none">{sIdx + 1}</span>
                              <button 
                                onClick={() => {
                                  const types: Set['type'][] = ['warmup', 'working', 'dropset'];
                                  const currentIdx = types.indexOf(set.type);
                                  const nextType = types[(currentIdx + 1) % types.length];
                                  updateSet(exIdx, sIdx, 'type', nextType);
                                }}
                                className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${
                                  set.type === 'warmup' ? 'bg-orange-500/20 text-orange-500' :
                                  set.type === 'dropset' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-accent/20 text-accent'
                                }`}
                              >
                                {set.type === 'warmup' ? 'W' : set.type === 'dropset' ? 'D' : 'S'}
                              </button>
                            </div>
                            
                            <div className="relative group">
                              <input 
                                type="number"
                                inputMode="decimal"
                                value={set.weight || ''}
                                onChange={(e) => updateSet(exIdx, sIdx, 'weight', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 text-center text-sm font-black italic outline-none focus:border-accent group-hover:border-accent/40 transition-colors"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-gray-700 pointer-events-none group-focus-within:text-accent">KG</span>
                            </div>

                            <div className="relative group">
                              <input 
                                type="number"
                                inputMode="numeric"
                                value={set.reps || ''}
                                onChange={(e) => updateSet(exIdx, sIdx, 'reps', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 text-center text-sm font-black italic outline-none focus:border-accent group-hover:border-accent/40 transition-colors"
                              />
                            </div>

                            <div className="relative">
                              <select 
                                value={set.rpe || ''}
                                onChange={(e) => updateSet(exIdx, sIdx, 'rpe', parseFloat(e.target.value) || undefined)}
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 text-center text-[10px] font-black italic outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                              >
                                <option value="">RPE</option>
                                {[...Array(11)].map((_, i) => (
                                  <option key={i} value={i}>{i}</option>
                                ))}
                                <option value="6.5">6.5</option>
                                <option value="7.5">7.5</option>
                                <option value="8.5">8.5</option>
                                <option value="9.5">9.5</option>
                              </select>
                            </div>

                            <div className="flex justify-center">
                              <button 
                                onClick={() => updateSet(exIdx, sIdx, 'isCompleted', !set.isCompleted)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                  set.isCompleted 
                                  ? 'bg-accent text-black shadow-lg shadow-accent/20 scale-105' 
                                  : 'bg-gray-900/50 text-gray-700 hover:text-gray-400 border border-gray-800'
                                }`}
                              >
                                {set.isCompleted ? <Check size={18} strokeWidth={3} /> : <Minus size={18} />}
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    
                    <div className="flex items-center gap-3 pt-2">
                      <button 
                        onClick={() => addSet(exIdx)}
                        className="flex-1 py-4 bg-black border border-dashed border-gray-800 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-500 hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Add Set
                      </button>
                      <button 
                        onClick={() => removeSet(exIdx, exercise.sets.length - 1)}
                        className="px-6 py-4 bg-black border border-gray-900 rounded-2xl text-gray-700 hover:text-red-500 hover:border-red-500/20 transition-all"
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <button 
              onClick={addExercise}
              className="w-full py-8 border-2 border-dashed rounded-[2.5rem] bg-black border-gray-900 text-[10px] font-black uppercase tracking-[0.3em] text-gray-700 hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-3 group"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" /> 
              Next Exercise Phase
            </button>
          </>
        )}
      </main>

      {/* Floating Action Bar */}
      {isActive && (
        <div className="fixed bottom-8 left-6 right-6 z-50 flex flex-col gap-4">
          <AnimatePresence>
            {restSeconds > 0 && (
              <motion.div 
                initial={{ y: 100, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 100, opacity: 0, scale: 0.9 }}
                className="fixed bottom-32 left-6 right-6 bg-[#111]/90 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-blue-500/20 shadow-2xl shadow-blue-500/10 z-50"
              >
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                        <HistoryIcon size={28} className={`text-blue-400 ${!isRestPaused ? 'animate-spin-slow' : ''}`} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[.2em] mb-1">Synapse Cooldown</p>
                        <h3 className="text-3xl font-black italic text-white tabular-nums leading-none tracking-tighter">
                          {restSeconds}<span className="text-sm ml-1 text-blue-400">s</span>
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={toggleRestPause}
                        className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white hover:bg-white/10 transition-colors border border-white/5"
                      >
                        {isRestPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                      </button>
                      <button 
                        onClick={skipRest}
                        className="bg-accent text-black px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent/80 transition-all active:scale-95 shadow-lg shadow-accent/20"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 pt-5 border-t border-white/5">
                    <button 
                      onClick={() => adjustRestDuration(-15)}
                      className="flex-1 bg-white/5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all border border-white/5"
                    >
                      -15s
                    </button>
                    <button 
                      onClick={() => adjustRestDuration(15)}
                      className="flex-1 bg-white/5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all border border-white/5"
                    >
                      +15s
                    </button>
                    <div className="px-2 text-[8px] font-black uppercase tracking-widest text-gray-600">
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
            className="w-full bg-accent text-black py-6 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(45,212,191,0.3)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {isFinishing ? (
              <Logo className="w-5 h-5 animate-pulse" />
            ) : (
              <>
                <Check size={20} className="stroke-[3]" />
                Complete Evolution
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
