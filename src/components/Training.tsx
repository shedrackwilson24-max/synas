import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { 
  PlayCircle, 
  Dumbbell, 
  Zap, 
  Activity as ActivityIcon, 
  Loader2, 
  History, 
  PlusCircle, 
  RefreshCw, 
  Calendar, 
  ChevronRight, 
  ChevronDown,
  Clock,
  Star 
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { generateWorkoutPlan } from '../services/workoutService';
import { useNotifications } from '../contexts/NotificationContext';

export default function Training() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [workoutPlan, setWorkoutPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(new Date().getDay());

  const CATEGORIES = [
    { id: 'chest', name: 'Chest', icon: <Dumbbell />, count: 42 },
    { id: 'back', name: 'Back', icon: <ActivityIcon />, count: 38 },
    { id: 'legs', name: 'Legs', icon: <Zap />, count: 56 },
    { id: 'mobility', name: 'Mobility', icon: <ActivityIcon />, count: 24 },
  ];

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleSync = async () => {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      await generateWorkoutPlan(user.uid);
      addNotification('success', 'Sync Complete', 'Your training protocol has been recalibrated.');
    } catch (err: any) {
      addNotification('reminder', 'Sync Error', err.message || 'Connection failed.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const unsubPlan = onSnapshot(doc(db, 'workoutPlans', user.uid), (snapshot) => {
      if (snapshot.exists()) setWorkoutPlan(snapshot.data());
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `workoutPlans/${user.uid}`);
      setLoading(false);
    });
    return () => unsubPlan();
  }, [user]);

  if (loading) {
    return (
      <div className="pb-32 pt-10 px-6 max-w-7xl mx-auto flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-32 pt-10 px-6 max-w-7xl mx-auto lg:px-10"
    >
      <header className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary mb-1 font-display">Training Protocols</h1>
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.2em] font-display">Optimized Physical Development</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSync} disabled={syncing} className="w-12 h-12 bg-bg-card rounded-2xl border border-border-color flex items-center justify-center text-text-secondary hover:text-brand-primary transition-all shadow-sm">
            <RefreshCw size={20} className={syncing ? 'animate-spin text-brand-primary' : ''} />
          </button>
          <button onClick={() => navigate('/history')} className="w-12 h-12 bg-bg-card rounded-2xl border border-border-color flex items-center justify-center text-text-secondary hover:text-brand-vibrant transition-all shadow-sm">
            <History size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-12">
          {workoutPlan && (
            <section>
              <SectionHeader title="Weekly Schedule" sub="Personalized Routine" icon={<Calendar size={16} />} />
              <div className="space-y-4">
                {workoutPlan.week_schedule.map((day: any, i: number) => {
                  const isToday = new Date().getDay() === i;
                  const isExpanded = expandedDay === i;
                  
                  return (
                    <motion.div 
                      key={i}
                      layout
                      className={`group rounded-[2.5rem] border transition-all overflow-hidden relative ${isToday ? 'bg-bg-card border-brand-primary shadow-2xl shadow-brand-primary/10' : 'bg-bg-card border-border-color shadow-sm'}`}
                    >
                      {isToday && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-[40px] pointer-events-none rounded-full -mr-10 -mt-10" />
                      )}
                      <button 
                        onClick={() => setExpandedDay(isExpanded ? null : i)}
                        className="w-full text-left p-6 flex items-center justify-between relative z-10"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${isToday ? 'neural-gradient text-white shadow-lg shadow-brand-primary/20' : 'bg-bg-secondary text-text-secondary group-hover:bg-brand-primary/10 group-hover:text-brand-primary'}`}>
                            <ActivityIcon size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={`font-bold tracking-tight font-display ${isToday ? 'text-brand-primary' : 'text-text-primary'}`}>{day.focus}</h4>
                              {isToday && (
                                <span className="flex h-2 w-2 rounded-full bg-brand-primary animate-pulse" />
                              )}
                            </div>
                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest font-display">{DAYS[i]}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {isToday && !isExpanded && (
                            <div className="hidden sm:block px-3 py-1 bg-brand-primary text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-brand-primary/20">Today's Protocol</div>
                          )}
                          <div className={`p-2 rounded-xl bg-bg-secondary text-text-secondary transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown size={18} />
                          </div>
                        </div>
                      </button>

                      {isExpanded ? (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="px-6 pb-6 border-t border-border-color/50 relative z-10"
                        >
                          <div className="pt-6 space-y-4">
                            {day.exercises.map((ex: any, ei: number) => {
                              const isFocusExercise = isToday && ei === 0;
                              return (
                                <div 
                                  key={ei} 
                                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all group/item ${
                                    isFocusExercise 
                                    ? 'bg-brand-primary/5 border-brand-primary/30 shadow-sm' 
                                    : 'bg-bg-secondary/50 border-border-color/50 hover:border-brand-primary/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-[10px] font-bold font-mono ${
                                      isFocusExercise 
                                      ? 'bg-brand-primary text-white border-brand-primary' 
                                      : 'bg-bg-card border-border-color text-text-secondary'
                                    }`}>
                                      {ei + 1}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h5 className="text-sm font-bold text-text-primary font-display">{ex.name}</h5>
                                        {isFocusExercise && (
                                          <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-brand-primary/10 text-brand-primary rounded-md border border-brand-primary/10">Focus</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest font-display">{ex.sets} Sets</span>
                                        <span className="w-1 h-1 rounded-full bg-border-color" />
                                        <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest font-display">{ex.reps || ex.repetitions} Reps</span>
                                      </div>
                                    </div>
                                  </div>
                                  {ex.rest && (
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
                                      isFocusExercise 
                                      ? 'bg-white/50 dark:bg-zinc-800/50 border-brand-primary/20 text-brand-primary' 
                                      : 'bg-bg-card border-border-color text-text-secondary group-hover/item:text-brand-primary'
                                    }`}>
                                      <Clock size={12} />
                                      <span className="text-[10px] font-bold font-mono">{ex.rest}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      ) : (
                        <div className="px-6 pb-6 flex flex-wrap gap-2">
                          {(day.exercises || []).slice(0, 4).map((ex: any, ei: number) => (
                            <span key={ei} className="px-3 py-1.5 bg-bg-secondary text-[10px] font-bold text-text-secondary uppercase tracking-widest rounded-xl group-hover:bg-brand-primary/5 group-hover:text-brand-primary transition-colors border border-transparent font-display">
                              {ex.name}
                            </span>
                          ))}
                          {day.exercises && day.exercises.length > 4 && (
                            <span className="text-[10px] text-text-secondary font-bold self-center ml-2 lowercase font-mono">+{day.exercises.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <SectionHeader title="Featured Programs" sub="Professional Blueprints" icon={<Zap size={16} />} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: 'Hypertrophy Max', duration: '12 Weeks', intensity: 'High', color: 'brand-primary' },
                { title: 'Functional Athlete', duration: '8 Weeks', intensity: 'Medium', color: 'brand-cyan' }
              ].map((prog, i) => (
                <div key={i} className="premium-card p-8 shadow-sm group hover:border-brand-primary/30 transition-all flex flex-col justify-between aspect-[4/3] relative overflow-hidden">
                  <div className={`absolute -right-10 -top-10 w-32 h-32 blur-[60px] opacity-20 pointer-events-none ${prog.color === 'brand-primary' ? 'bg-brand-primary' : 'bg-brand-cyan'}`} />
                  <div>
                    <div className={`px-3 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest w-fit mb-6 border shadow-sm ${prog.color === 'brand-primary' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20'}`}>
                      {prog.intensity} Intensity
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-text-primary group-hover:neural-text-gradient transition-all font-display">{prog.title}</h3>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-border-color">
                    <div className="flex items-center gap-4 text-[10px] text-text-secondary font-bold uppercase tracking-widest font-display">
                      <span className="flex items-center gap-1.5"><PlayCircle size={14} /> 45-60 min</span>
                      <span>{prog.duration}</span>
                    </div>
                    <ChevronRight size={20} className="text-text-secondary group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-12">
          <section className="bg-bg-card p-8 rounded-[2.5rem] border border-border-color shadow-sm space-y-8">
            <h3 className="text-xs text-text-secondary font-bold uppercase tracking-[0.2em] font-display">Quick Actions</h3>
            <div className="space-y-4">
              <ActionButton 
                onClick={() => navigate('/workout')}
                title="Manual Entry"
                sub="Log Custom Session"
                icon={<PlusCircle size={22} />}
                color="brand-primary"
              />
              <ActionButton 
                onClick={handleSync}
                disabled={syncing}
                title="Protocol Sync"
                sub="Update Training Plan"
                icon={syncing ? <Loader2 size={22} className="animate-spin" /> : <RefreshCw size={22} />}
                color="brand-cyan"
              />
            </div>
          </section>

          <section>
            <SectionHeader title="Exercise Library" sub="Biomechanical Database" icon={<Dumbbell size={16} />} />
            <div className="grid grid-cols-2 gap-4">
              {CATEGORIES.map((cat) => (
                <motion.div 
                  key={cat.id}
                  whileTap={{ scale: 0.95 }}
                  className="bg-bg-card border border-border-color rounded-[2rem] p-6 text-center group cursor-pointer hover:border-brand-primary/30 transition-all shadow-sm"
                >
                  <div className="mb-4 flex justify-center text-text-secondary group-hover:text-brand-primary transition-colors">{cat.icon}</div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-text-primary mb-1 font-display">{cat.name}</h4>
                  <p className="text-[10px] text-text-secondary font-bold font-mono">{cat.count} Items</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeader title="Stored Routines" sub="Personal Archive" icon={<Star size={16} />} />
            <div className="premium-card p-6 shadow-sm hover:border-brand-vibrant/30 transition-all group cursor-pointer">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-text-secondary group-hover:neural-gradient group-hover:text-white transition-all shadow-inner">
                  <Zap size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-text-primary tracking-tight text-sm font-display">AMRAP Finisher</h4>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1 font-display">High Intensity Cycle</p>
                </div>
                <ChevronRight size={16} className="text-text-secondary group-hover:text-brand-primary" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

function SectionHeader({ title, sub, icon }: { title: string, sub: string, icon: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-8 px-2">
      <div className="flex items-center gap-3">
        <div className="text-brand-primary">{icon}</div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-text-primary leading-none font-display uppercase">{title}</h2>
          <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest mt-2 font-display">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ title, sub, icon, color, onClick, disabled }: { title: string, sub: string, icon: ReactNode, color: string, onClick?: () => void, disabled?: boolean }) {
  const colorMap: Record<string, string> = {
    'brand-primary': 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 group-hover:neural-gradient group-hover:text-white',
    'brand-cyan': 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20 group-hover:bg-brand-cyan group-hover:text-white',
    'brand-vibrant': 'bg-brand-vibrant/10 text-brand-vibrant border-brand-vibrant/20 group-hover:bg-brand-vibrant group-hover:text-white'
  };
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-5 p-5 rounded-[2rem] border border-border-color transition-all hover:bg-bg-secondary group disabled:opacity-50"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-inner ${colorMap[color] || colorMap['brand-primary']}`}>
        {icon}
      </div>
      <div className="text-left">
        <h4 className="text-sm font-bold text-text-primary tracking-tight font-display">{title}</h4>
        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1 font-display">{sub}</p>
      </div>
    </button>
  );
}
