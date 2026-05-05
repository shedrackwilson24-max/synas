import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, PlayCircle, Dumbbell, Zap, Activity, Loader2, History, PlusCircle, RefreshCw } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { generateWorkoutPlan } from '../services/workoutService';
import { useNotifications } from '../contexts/NotificationContext';
import Logo from './Logo';

import Skeleton from './ui/Skeleton';

const CATEGORIES = [
  { id: 'chest', name: 'Chest', icon: <Dumbbell className="text-accent" />, count: 42 },
  { id: 'back', name: 'Back', icon: <Activity className="text-green-400" />, count: 38 },
  { id: 'legs', name: 'Legs', icon: <Zap className="text-yellow-400" />, count: 56 },
  { id: 'mobility', name: 'Mobility', icon: <Activity className="text-blue-400" />, count: 24 },
];

export default function Training() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [workoutPlan, setWorkoutPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      await generateWorkoutPlan(user.uid);
      addNotification('success', 'Synapse Sync Complete', 'Your training protocol has been recalibrated.');
    } catch (err: any) {
      console.error('Sync failed:', err);
      addNotification('reminder', 'Sync Error', err.message || 'Failed to connect to neural core.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // Listen for workout plan
    const unsubPlan = onSnapshot(doc(db, 'workoutPlans', user.uid), (doc) => {
      if (doc.exists()) {
        setWorkoutPlan(doc.data());
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `workoutPlans/${user.uid}`);
      setLoading(false);
    });

    return () => {
      unsubPlan();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="pb-32 px-6 pt-8">
        <header className="mb-8 flex items-center justify-between">
          <Skeleton className="w-40 h-10" />
          <Skeleton className="w-10 h-10 rounded-full" />
        </header>

        <section className="mb-10">
          <Skeleton className="w-32 h-3 mb-4 ml-2" />
          <div className="space-y-4">
            {[1, 2].map(i => (
              <Skeleton key={i} className="w-full h-32 rounded-[2rem]" />
            ))}
          </div>
        </section>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="w-32 h-6" />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {[1, 2].map(i => (
              <Skeleton key={i} className="min-w-[280px] aspect-[4/3] rounded-[2.5rem]" />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-32 px-6 pt-8"
    >
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">Training<br/><span className="text-accent">Protocols</span></h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="w-10 h-10 bg-[var(--bg-card)] rounded-xl flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-accent transition-colors disabled:opacity-50"
            title="Synapse Sync"
          >
            <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => navigate('/history')}
            className="w-10 h-10 bg-[var(--bg-card)] rounded-xl flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-accent transition-colors"
          >
            <History size={20} />
          </button>
          <div className="w-10 h-10 bg-[var(--bg-card)] rounded-xl flex items-center justify-center border border-[var(--border-color)]">
            <Search size={20} className="text-[var(--text-secondary)]" />
          </div>
        </div>
      </header>

      {workoutPlan && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-2">Your Synapse Schedule</h2>
            <div className="px-2 py-0.5 bg-accent/20 rounded text-accent text-[8px] font-black uppercase tracking-widest">Active</div>
          </div>
          <div className="space-y-4">
            {workoutPlan.week_schedule.map((day: any, i: number) => (
              <div key={i} className={`bg-[var(--bg-card)] p-6 rounded-[2rem] border transition-all ${new Date().getDay() === i ? 'border-accent shadow-lg shadow-accent/10' : 'border-[var(--border-color)]'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center p-1.5 border border-white/5 shadow-inner">
                      <Logo className="w-full h-full" />
                    </div>
                    <h4 className="font-black italic uppercase tracking-tighter text-lg">{day.focus}</h4>
                  </div>
                  {new Date().getDay() === i && <span className="text-[8px] font-black text-accent uppercase tracking-widest animate-pulse">Current Focus</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {day.exercises.slice(0, 3).map((ex: any, ei: number) => (
                    <span key={ei} className="px-3 py-1 bg-[var(--bg-secondary)] text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-widest rounded-full border border-white/5">{ex.name}</span>
                  ))}
                  {day.exercises.length > 3 && <span className="text-[8px] text-[var(--text-secondary)] font-bold self-center">+{day.exercises.length - 3} MORE</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
          <input 
            type="text" 
            placeholder="Find exercises or programs..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-accent outline-none transition-colors"
          />
          <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-accent" size={18} />
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black uppercase tracking-widest text-gray-400">Featured Programs</h2>
          <button className="text-[10px] font-black uppercase tracking-widest text-accent">View All</button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {[1, 2].map(i => (
            <motion.div 
              key={i}
              whileTap={{ scale: 0.98 }}
              className="min-w-[280px] aspect-[4/3] bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] p-6 flex flex-col justify-end relative overflow-hidden group"
            >
              <div className="absolute top-6 left-6 flex gap-2">
                <span className="bg-blue-600/20 text-blue-400 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded">High Intensity</span>
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2">12-Week Hypertrophy</h3>
              <div className="flex items-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1"><PlayCircle size={12} /> 45-60 min</span>
                <span>5 Days/Wk</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mb-10 px-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/workout')}
            className="w-full bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border-color)] rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-3 group hover:border-accent/50 transition-all"
          >
            <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-black transition-all">
              <PlusCircle size={28} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black italic uppercase tracking-tighter text-white group-hover:text-accent transition-colors">Synapse Manual</h3>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Single Session Protocol</p>
            </div>
          </motion.button>

          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSync()}
            disabled={syncing}
            className="w-full bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-3 group hover:border-accent/30 transition-all relative overflow-hidden"
          >
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-accent group-hover:text-black transition-all">
              {syncing ? <Loader2 size={24} className="animate-spin text-accent" /> : <RefreshCw size={24} />}
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black italic uppercase tracking-tighter text-white group-hover:text-accent transition-colors">Schedule Sync</h3>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Recalibrate Synapse Plan</p>
            </div>
            {syncing && <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm" />}
          </motion.button>
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black uppercase tracking-widest text-gray-400">Exercise Library</h2>
          <button className="text-[10px] font-black uppercase tracking-widest text-accent">Browse All</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {CATEGORIES.map(cat => (
            <motion.div 
              key={cat.id}
              whileTap={{ scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] p-6 text-center group cursor-pointer hover:border-accent transition-colors"
            >
              <div className="mb-3 flex justify-center">{cat.icon}</div>
              <h4 className="text-sm font-black uppercase tracking-widest mb-1">{cat.name}</h4>
              <p className="text-[10px] text-gray-500 font-bold">{cat.count} Exercises</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black uppercase tracking-widest text-gray-400">Saved Routines</h2>
          <button className="text-accent text-lg">+</button>
        </div>
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-[var(--border-color)] flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <Zap size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-black italic uppercase tracking-tighter">AMRAP Finisher</h4>
              <p className="text-[10px] text-gray-500 font-bold">Last performed 2 days ago</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black">15 MIN</p>
              <p className="text-[8px] text-blue-400 font-black uppercase tracking-widest">High</p>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
