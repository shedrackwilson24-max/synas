import React, { useEffect, useState, useMemo, ReactNode } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, BarChart3, Target, Calendar, ChevronRight, Loader2, Trophy, Award, Star, Heart, Moon, Footprints, Flame, Droplets, Apple, Wind, Sun, Plus, Check, Zap, Activity as ActivityIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { subscribeToPersonalBests, PersonalBests, DailyStats } from '../services/fitnessService';

import Skeleton from './ui/Skeleton';

const DEFAULT_HABITS = [
  { name: 'Hydration', icon: 'Droplets', value: '', color: 'text-blue-400' },
  { name: 'Synaptic Rest', icon: 'Moon', value: '', color: 'text-yellow-400' },
  { name: 'Nutrition', icon: 'Apple', value: '', color: 'text-green-400' },
  { name: 'Breathwork', icon: 'Wind', value: '', color: 'text-accent' },
  { name: 'Synapse Focus', icon: 'Sun', value: '', color: 'text-orange-400' },
];

function MetricCard({ label, value, icon, subValue, isSynced, loading }: { label: string, value: string, icon: ReactNode, subValue?: string, isSynced: boolean, loading?: boolean }) {
  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)] flex flex-col justify-between shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="w-8 h-8 rounded-xl" />
        </div>
        <div>
          <Skeleton className="w-24 h-8 mb-2" />
          <Skeleton className="w-16 h-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)] flex flex-col justify-between hover:border-accent/30 transition-all shadow-xl group">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-accent/10 transition-colors">
          {icon}
        </div>
      </div>
      <div>
        <div className={`text-3xl font-black italic uppercase tracking-tighter mb-1 leading-none ${isSynced ? 'text-[var(--text-primary)]' : 'text-gray-700'}`}>
          {isSynced ? value : '--'}
        </div>
        <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest flex items-center justify-between">
          <span>{label}</span>
          {isSynced ? (
            subValue && <span className="text-accent">{subValue}</span>
          ) : (
            <span className="text-red-500/50">OFFLINE</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Stats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBests | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [habits, setHabits] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [workoutsLoading, setWorkoutsLoading] = useState(true);
  const [habitsLoading, setHabitsLoading] = useState(true);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const hasSource = true; // Use internal system by default now

  useEffect(() => {
    if (!user) return;

    // Workouts for charts
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', user.uid)
    );

    const unsubWorkouts = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a: any, b: any) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return tA - tB; // Chronological
      });
      setWorkouts(docs);
      setWorkoutsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'workouts');
      setWorkoutsLoading(false);
    });

    // All-time personal bests
    const unsubPBs = subscribeToPersonalBests(user.uid, (pb) => {
      setPersonalBests(pb);
    });

    // Daily stats for 2x2 grid
    const today = new Date().toISOString().split('T')[0];
    const unsubDaily = onSnapshot(doc(db, 'dailyStats', `${user.uid}_${today}`), (snapshot) => {
      if (snapshot.exists()) {
        setDailyStats(snapshot.data() as DailyStats);
      }
      setStatsLoading(false);
    }, (err) => {
      setStatsLoading(false);
    });

    // Habits
    const habitsQuery = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const unsubHabits = onSnapshot(habitsQuery, (snapshot) => {
      if (snapshot.empty) {
        seedDefaultHabits();
      } else {
        setHabits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
      setHabitsLoading(false);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'habits');
      setHabitsLoading(false);
    });

    // Weekly stats
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }

    const weeklyQuery = query(
      collection(db, 'dailyStats'),
      where('userId', '==', user.uid),
      where('date', '>=', last7Days[6]),
      where('date', '<=', last7Days[0]),
      orderBy('date', 'asc')
    );

    const unsubWeekly = onSnapshot(weeklyQuery, (snapshot) => {
      const stats = snapshot.docs.map(doc => doc.data() as DailyStats);
      setWeeklyStats(stats);
      setWeeklyLoading(false);
    }, (err) => {
      console.error("Error fetching weekly stats:", err);
      setWeeklyLoading(false);
    });

    return () => {
      unsubWorkouts();
      unsubPBs();
      unsubDaily();
      unsubHabits();
      unsubWeekly();
    };
  }, [user]);

  const seedDefaultHabits = async () => {
    if (!user) return;
    try {
      for (const habit of DEFAULT_HABITS) {
        const habitId = `${user.uid}_${habit.name.toLowerCase()}`;
        await setDoc(doc(db, 'habits', habitId), {
          ...habit,
          userId: user.uid,
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Failed to seed habits:', err);
    }
  };

  const updateHabitValue = async (habitId: string, currentValue: string) => {
    const newValue = prompt('Enter new value for habit:', currentValue);
    if (newValue !== null && newValue !== currentValue) {
      try {
        await updateDoc(doc(db, 'habits', habitId), {
          value: newValue,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `habits/${habitId}`);
      }
    }
  };

  const getHabitIcon = (iconName: string, colorClass: string) => {
    const props = { size: 18, className: colorClass };
    switch (iconName) {
      case 'Droplets': return <Droplets {...props} />;
      case 'Moon': return <Moon {...props} />;
      case 'Apple': return <Apple {...props} />;
      case 'Wind': return <Wind {...props} />;
      case 'Sun': return <Sun {...props} />;
      default: return <Target {...props} />;
    }
  };

  const stats = useMemo(() => {
    if (workouts.length === 0) return {
      totalWorkouts: 0,
      heaviestLift: 0,
      volumeData: [],
      frequencyData: [],
      topExercises: []
    };

    // Calculate Volume Trend
    const volumeByDay = workouts.map(w => {
      const volume = (w.exercises || []).reduce((acc: number, ex: any) => 
        acc + (ex.sets || []).reduce((sAcc: number, s: any) => sAcc + (parseFloat(s.weight) * parseInt(s.reps)), 0), 0
      );
      const date = w.timestamp?.toDate ? w.timestamp.toDate() : new Date();
      return {
        day: date.toLocaleDateString('en-US', { day: '2-digit' }),
        volume
      };
    }).slice(-14); // Last 14 sessions

    // Calculate Frequency
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const frequency = days.map(day => ({
      day,
      count: workouts.filter(w => days[new Date(w.timestamp?.toDate?.() || Date.now()).getDay()] === day).length
    }));

    return {
      totalWorkouts: workouts.length,
      volumeData: volumeByDay,
      frequencyData: frequency
    };
  }, [workouts]);

  const exerciseBests = useMemo(() => {
    if (!personalBests?.exerciseBests) return [];
    return Object.entries(personalBests.exerciseBests).map(([name, data]) => ({
      name,
      weight: (data as any).weight,
      reps: (data as any).reps,
      date: (data as any).date
    })).sort((a: any, b: any) => b.weight - a.weight);
  }, [personalBests]);

  const weeklyMetrics = useMemo(() => {
    if (weeklyStats.length === 0) return { totalSteps: 0, totalCalories: 0, avgSleep: 0 };
    const totalSteps = weeklyStats.reduce((sum, s) => sum + (s.steps || 0), 0);
    const totalCalories = weeklyStats.reduce((sum, s) => sum + (s.calories || 0), 0);
    const avgSleep = Math.round(weeklyStats.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / weeklyStats.length);
    return { totalSteps, totalCalories, avgSleep };
  }, [weeklyStats]);

  const trendData = useMemo(() => {
    return weeklyStats.map(s => ({
      date: new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
      steps: s.steps || 0,
      calories: Math.round(s.calories || 0),
      sleep: s.sleepScore || 0
    }));
  }, [weeklyStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-32 px-6 pt-8 max-w-lg mx-auto"
    >
      <header className="mb-10 text-center">
        <div className="inline-block p-4 bg-accent/20 rounded-full mb-4">
          <TrendingUp className="text-accent" size={32} />
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Synapse Insights</h1>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest leading-relaxed">Analyzing your synaptic growth patterns.</p>
      </header>

      {/* 2x2 Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <MetricCard 
          label="Heart Rate"
          value={dailyStats?.restingHeartRate ? `${dailyStats.restingHeartRate}BPM` : '--'}
          icon={<Heart className="text-red-500" />}
          subValue={dailyStats?.restingHeartRate ? "STABLE" : undefined}
          isSynced={true}
          loading={statsLoading}
        />
        <MetricCard 
          label="Sleep Score"
          value={dailyStats?.sleepScore ? `${dailyStats.sleepScore}/100` : '--'}
          icon={<Moon className="text-yellow-400" />}
          subValue={dailyStats?.sleepScore ? "DEEP" : undefined}
          isSynced={true}
          loading={statsLoading}
        />
        <MetricCard 
          label="Daily Steps"
          value={((dailyStats?.steps || 0) + (user?.uid === dailyStats?.userId ? 0 : 0)).toLocaleString()} // Simplified
          icon={<Footprints className="text-accent" />}
          subValue="ACTIVE"
          isSynced={true}
          loading={statsLoading}
        />
        <MetricCard 
          label="Calories"
          value={`${Math.round(dailyStats?.calories || 0).toLocaleString()}`}
          icon={<Flame className="text-orange-500" />}
          subValue="BURN"
          isSynced={true}
          loading={statsLoading}
        />
      </div>

      {/* Weekly Overview Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6 px-2">
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter">Weekly Protocol</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Past 7 Days Analytics</p>
          </div>
          <Calendar size={18} className="text-accent" />
        </div>

        <div className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] overflow-hidden shadow-2xl">
          <div className="grid grid-cols-3 border-b border-[var(--border-color)]">
            <div className="p-4 text-center border-r border-[var(--border-color)]">
              <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Total Steps</p>
              <p className="text-sm font-black italic text-accent">{weeklyMetrics.totalSteps.toLocaleString()}</p>
            </div>
            <div className="p-4 text-center border-r border-[var(--border-color)]">
              <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Total KCAL</p>
              <p className="text-sm font-black italic text-orange-500">{weeklyMetrics.totalCalories.toLocaleString()}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Avg Sleep</p>
              <p className="text-sm font-black italic text-yellow-400">{weeklyMetrics.avgSleep}%</p>
            </div>
          </div>

          <div className="p-6">
            <div className="h-40 mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Step Trend</span>
                <Footprints size={12} className="text-accent" />
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="steps" stroke="#00ff88" strokeWidth={3} fillOpacity={1} fill="url(#colorSteps)" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: '#00ff88', fontSize: '10px', fontWeight: 'bold' }}
                    labelStyle={{ fontSize: '10px', color: '#666' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="h-40">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Caloric Burn Velocity</span>
                <Flame size={12} className="text-orange-500" />
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <Bar dataKey="calories" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: '#f97316', fontSize: '10px', fontWeight: 'bold' }}
                    labelStyle={{ fontSize: '10px', color: '#666' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Synapse Analysis Section */}
      <section className="mb-12">
        <div className="bg-gradient-to-br from-accent/20 to-blue-600/20 p-8 rounded-[3rem] border border-accent/20 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="text-accent" size={20} />
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Synapse Analysis</h2>
            </div>
            <p className="text-[11px] text-gray-300 font-medium leading-relaxed mb-6 italic">
              {stats.totalWorkouts > 0 
                ? "Your synaptic patterns indicate a trend toward increased volume. Recovery sync is critical for synaptic consolidation. Maintain your current protocol for 3 more cycles to lock in gains."
                : "Awaiting initial data stream. Complete your first synaptic session to activate predictive insights and performance mapping."}
            </p>
            <button 
              onClick={() => navigate('/training')}
              className="px-6 py-3 bg-accent text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-accent/90 transition-all active:scale-95"
            >
              Optimize Protocol
            </button>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
            <ActivityIcon size={120} className="text-accent" />
          </div>
        </div>
      </section>

      {/* lifestyle habits... */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6 px-2">
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter">Lifestyle Habits</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">This Week · Protocol Integrity</p>
          </div>
          <span className="text-[8px] text-accent font-black uppercase tracking-widest">{habits.length} tracked</span>
        </div>
        
        <div className="space-y-3">
          {habitsLoading ? (
            [1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-color)] flex items-center gap-4 shadow-xl">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <div className="flex-1">
                  <Skeleton className="w-24 h-4 mb-1" />
                  <Skeleton className="w-16 h-2" />
                </div>
                <div className="text-right">
                  <Skeleton className="w-12 h-6 mb-1 ml-auto" />
                  <Skeleton className="w-8 h-2 ml-auto" />
                </div>
              </div>
            ))
          ) : habits.map((habit, i) => (
            <motion.div 
              key={habit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => updateHabitValue(habit.id, habit.value)}
              className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-color)] flex items-center gap-4 hover:border-accent/40 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center border border-white/5 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                {getHabitIcon(habit.icon, habit.color)}
              </div>
              <div className="flex-1">
                <h4 className="font-black italic uppercase tracking-tighter text-sm leading-none mb-1">{habit.name}</h4>
                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest leading-none">Standard Threshold Meta</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-black italic uppercase tracking-tighter text-accent group-hover:scale-110 transition-transform origin-right">{habit.value}</div>
                <div className="text-[6px] text-gray-700 font-bold uppercase tracking-widest">Optimized</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <div className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)] h-72 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black italic uppercase tracking-tighter">Volume Protocol</h2>
            <span className="text-[10px] font-black text-accent uppercase tracking-widest">Last 14 Sessions</span>
          </div>
          <div className="h-48">
            {stats.volumeData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.volumeData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00F2FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00F2FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#00F2FF" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorVolume)" 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                    itemStyle={{ color: '#00F2FF', fontWeight: 'bold' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-700 text-[10px] font-black uppercase tracking-[0.3em]">Insufficient Data Points</div>
            )}
          </div>
        </div>
      </section>

      {/* Hall of Fame section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Award className="text-accent" size={20} />
            <h2 className="text-xl font-black italic uppercase tracking-tighter">Synapse Records</h2>
          </div>
          <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest">All-Time Bests</span>
        </div>
        
        <div className="space-y-4">
          {exerciseBests.length > 0 ? exerciseBests.map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)] flex items-center justify-between group cursor-pointer hover:border-accent/40 transition-colors relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Star size={60} fill="currentColor" />
              </div>
              <div className="relative z-10">
                <h4 className="font-black italic uppercase tracking-tighter text-lg">{item.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={10} className="text-gray-600" />
                  <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{new Date(item.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right relative z-10">
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-2xl font-black text-accent italic">{item.weight}</span>
                  <span className="text-[10px] font-black text-gray-500 italic uppercase">kg</span>
                </div>
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">For {item.reps} Reps</p>
              </div>
            </motion.div>
          )) : (
            <div className="bg-[#111] p-12 rounded-[2.5rem] border border-dashed border-gray-800 text-center">
              <Trophy size={32} className="mx-auto mb-4 text-gray-800" />
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">No personal records achieved yet.</p>
              <p className="text-[8px] text-gray-800 mt-2 font-bold uppercase">Push your limits in the next session.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-black italic uppercase tracking-tighter mb-6">Frequency Distribution</h2>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] p-6 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.frequencyData}>
              <Bar 
                dataKey="count" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
              />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#666', fontSize: 10, fontWeight: 'bold' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </motion.div>
  );
}
