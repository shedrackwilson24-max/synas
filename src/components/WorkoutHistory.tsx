import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  ChevronLeft, 
  History, 
  Clock, 
  Calendar, 
  ChevronRight, 
  X, 
  Dumbbell,
  TrendingUp,
  Loader2,
  Activity
} from 'lucide-react';

interface Workout {
  id: string;
  userId: string;
  timestamp: any;
  duration: number;
  exercises: any[];
}

export default function WorkoutHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch user profile for units
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data());
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    });

    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', user.uid)
    );

    const unsubWorkouts = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Workout));
      
      // Sort manually by timestamp descending
      docs.sort((a, b) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return tB - tA;
      });

      setWorkouts(docs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'workouts');
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubWorkouts();
    };
  }, [user]);

  const units = profile?.units === 'imperial' ? 'LB' : 'KG';

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-32">
      <header className="px-6 py-12 flex items-center justify-between sticky top-0 bg-bg-primary/80 backdrop-blur-xl z-20">
        <button 
          onClick={() => navigate(-1)}
          className="w-12 h-12 bg-bg-card rounded-2xl flex items-center justify-center text-text-secondary hover:text-text-primary border border-border-color shadow-sm transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight text-text-primary font-display uppercase">Protocol Archive</h1>
          <p className="text-[10px] text-brand-primary font-bold uppercase tracking-[0.2em] font-display mt-1">Neural Logs</p>
        </div>
        <div className="w-12 h-12 bg-bg-card rounded-2xl flex items-center justify-center text-brand-primary border border-border-color shadow-sm">
          <History size={24} />
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-lg mx-auto">
        {workouts.length > 0 ? (
          workouts.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedWorkout(w)}
              className="bg-bg-card border border-border-color rounded-[2.5rem] p-6 flex items-center gap-6 group cursor-pointer hover:border-brand-primary/30 transition-all shadow-sm active:scale-98"
            >
              <div className="w-16 h-16 bg-bg-secondary rounded-[1.5rem] flex items-center justify-center text-brand-primary group-hover:neural-gradient group-hover:text-white transition-all relative shadow-inner">
                <Dumbbell size={28} />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-vibrant rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg border-2 border-bg-card">
                  {w.exercises?.length || 0}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold tracking-tight text-text-primary truncate font-display uppercase">
                  {w.exercises?.[0]?.name || 'Synapse Session'}
                </h3>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-text-secondary" />
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest font-display">
                      {Math.floor(w.duration / 60)}m
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-text-secondary" />
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest font-display">
                      {w.timestamp?.toDate 
                        ? new Date(w.timestamp.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'Today'}
                    </span>
                  </div>
                </div>
              </div>

              <ChevronRight size={20} className="text-text-secondary group-hover:text-brand-primary transition-colors" />
            </motion.div>
          ))
        ) : (
          <div className="bg-bg-card p-12 rounded-[3.5rem] border-2 border-dashed border-border-color text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-bg-secondary rounded-[2rem] flex items-center justify-center text-text-secondary/20">
              <Activity size={40} />
            </div>
            <div>
              <p className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-[0.3em] font-display">Archive currently depleted</p>
              <button 
                onClick={() => navigate('/training')}
                className="mt-8 px-10 py-5 bg-text-primary rounded-[1.5rem] text-bg-primary text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all font-display"
              >
                Initialize Protocol
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Workout Detail Modal */}
      <AnimatePresence>
        {selectedWorkout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/95 backdrop-blur-2xl pt-12"
            onClick={() => setSelectedWorkout(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-2xl bg-bg-primary rounded-t-[4rem] border-t border-x border-border-color flex flex-col h-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-10 flex items-start justify-between shrink-0">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                    <span className="text-[10px] text-brand-primary font-bold uppercase tracking-[.3em] font-display">Session Specification</span>
                  </div>
                  <h2 className="text-4xl font-bold tracking-tighter text-text-primary leading-tight mb-6 font-display uppercase">
                    {selectedWorkout.exercises?.[0]?.name || 'Synapse Session'}
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="bg-bg-card px-5 py-2.5 rounded-2xl flex items-center gap-3 border border-border-color shadow-sm">
                      <Clock size={14} className="text-brand-cyan" />
                      <span className="text-xs font-bold uppercase tracking-widest text-text-primary font-display">
                        {Math.floor(selectedWorkout.duration / 60)} Min
                      </span>
                    </div>
                    <div className="bg-bg-card px-5 py-2.5 rounded-2xl flex items-center gap-3 border border-border-color shadow-sm">
                      <TrendingUp size={14} className="text-brand-vibrant" />
                      <span className="text-xs font-bold uppercase tracking-widest text-text-primary font-display">
                        {selectedWorkout.exercises.length} Exercises
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedWorkout(null)}
                  className="w-14 h-14 bg-bg-card border border-border-color rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary transition-all shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-10 pb-40 space-y-10 scrollbar-hide">
                {selectedWorkout.exercises.map((ex, exIdx) => (
                  <div key={exIdx} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="text-[11px] font-black font-mono text-brand-primary/40 bg-brand-primary/5 w-8 h-8 rounded-lg flex items-center justify-center">
                        {exIdx + 1 < 10 ? `0${exIdx + 1}` : exIdx + 1}
                      </div>
                      <h4 className="text-2xl font-bold tracking-tight text-text-primary font-display uppercase">
                        {ex.name}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {ex.sets.map((set: any, setIdx: number) => (
                        <div 
                          key={setIdx}
                          className="bg-bg-card border border-border-color rounded-3xl p-5 flex items-center justify-between shadow-sm group hover:border-brand-primary/20 transition-all"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-10 h-10 bg-bg-secondary rounded-xl flex items-center justify-center text-[11px] font-bold text-text-secondary font-mono shadow-inner group-hover:text-brand-primary">
                              S{setIdx + 1}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-text-primary font-display">{set.weight}</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60 font-display">{units}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-brand-primary font-display">{set.reps}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60 font-display">Reps</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="neural-gradient rounded-[3rem] p-10 text-center relative overflow-hidden group">
                  <Activity className="absolute -bottom-6 -left-6 text-white/10 rotate-12 scale-150" size={100} />
                  <div className="relative z-10">
                    <p className="text-[10px] text-white/60 font-bold uppercase tracking-[0.3em] mb-3 font-display">Performance Verification</p>
                    <p className="text-sm font-medium text-white leading-relaxed font-display italic">
                      "System confirms metabolic stress levels were within optimal growth parameters. Strategic recovery window is active."
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
