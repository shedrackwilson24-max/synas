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
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-12 h-12 bg-accent rounded-full blur-xl"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-32">
      <header className="p-6 pt-12 flex items-center justify-between sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md z-10">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-black italic uppercase tracking-tighter">Protocol History</h1>
          <p className="text-[8px] text-accent font-black uppercase tracking-widest mt-0.5">Synapse Archive</p>
        </div>
        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
          <History size={18} />
        </div>
      </header>

      <main className="p-6 space-y-4 max-w-lg mx-auto">
        {workouts.length > 0 ? (
          workouts.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedWorkout(w)}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] p-6 flex items-center gap-5 group cursor-pointer hover:border-accent/30 transition-all shadow-xl"
            >
              <div className="w-14 h-14 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center text-blue-400 group-hover:text-accent transition-colors relative">
                <Dumbbell size={24} />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center text-[8px] font-black text-black">
                  {w.exercises?.length || 0}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black italic uppercase tracking-tighter text-white truncate group-hover:text-accent transition-colors">
                  {w.exercises?.[0]?.name || 'Synapse Session'}
                </h3>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-gray-600" />
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                      {Math.floor(w.duration / 60)} min
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={10} className="text-gray-600" />
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                      {w.timestamp?.toDate 
                        ? new Date(w.timestamp.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Today'}
                    </span>
                  </div>
                </div>
              </div>

              <ChevronRight size={18} className="text-gray-700 group-hover:text-accent transition-colors" />
            </motion.div>
          ))
        ) : (
          <div className="bg-[var(--bg-card)] p-12 rounded-[3rem] border border-dashed border-gray-800 text-center">
            <Activity size={48} className="mx-auto text-gray-800 mb-4 opacity-20" />
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Synapse archive is currently empty</p>
            <button 
              onClick={() => navigate('/training')}
              className="mt-6 px-6 py-3 bg-accent/10 border border-accent/20 rounded-xl text-accent text-[9px] font-black uppercase tracking-widest hover:bg-accent/20 transition-all"
            >
              Initialize First Session
            </button>
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
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/90 backdrop-blur-lg pt-12"
            onClick={() => setSelectedWorkout(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl bg-[var(--bg-card)] rounded-t-[3rem] border-t border-x border-[var(--border-color)] flex flex-col h-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 flex items-start justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[10px] text-accent font-black uppercase tracking-[.2em]">Session Report</span>
                  </div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-4">
                    {selectedWorkout.exercises?.[0]?.name || 'Synapse Session'}
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="bg-[var(--bg-secondary)] px-4 py-2 rounded-xl flex items-center gap-2">
                      <Clock size={12} className="text-gray-400" />
                      <span className="text-[10px] font-black italic uppercase tracking-widest text-white">
                        {Math.floor(selectedWorkout.duration / 60)} min
                      </span>
                    </div>
                    <div className="bg-[var(--bg-secondary)] px-4 py-2 rounded-xl flex items-center gap-2">
                      <TrendingUp size={12} className="text-gray-400" />
                      <span className="text-[10px] font-black italic uppercase tracking-widest text-white">
                        {selectedWorkout.exercises.length} Exercises
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedWorkout(null)}
                  className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-32 space-y-8">
                {selectedWorkout.exercises.map((ex, exIdx) => (
                  <div key={exIdx} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="text-[10px] font-black italic uppercase tracking-widest text-gray-700 w-6 text-center">
                        {exIdx + 1 < 10 ? `0${exIdx + 1}` : exIdx + 1}
                      </div>
                      <h4 className="text-xl font-black italic uppercase tracking-tighter text-white">
                        {ex.name}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {ex.sets.map((set: any, setIdx: number) => (
                        <div 
                          key={setIdx}
                          className="bg-[var(--bg-secondary)]/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-black/30 rounded-lg flex items-center justify-center text-[10px] font-black text-gray-500 italic">
                              {setIdx + 1}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-black italic text-white">{set.weight}</span>
                              <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">{units}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-black italic text-accent">{set.reps}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">REPS</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="bg-gradient-to-br from-accent/5 to-blue-500/5 rounded-[2.5rem] border border-accent/10 p-8 text-center">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 italic">Synapse performance analyzed</p>
                  <p className="text-xs font-black italic uppercase tracking-tight text-white/80">
                    System confirms metabolic stress levels were within optimal growth parameters.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
