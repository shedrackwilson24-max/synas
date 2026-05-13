import React, { useEffect, useState, useMemo, ReactNode } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, BarChart3, Target, Calendar, ChevronRight, Loader2, Trophy, Award, Star, Heart, Moon, Footprints, Flame, Droplets, Apple, Wind, Sun, Plus, Check, Zap, Activity as ActivityIcon, BookOpen, Share2, Database, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { subscribeToPersonalBests, PersonalBests, DailyStats } from '../services/fitnessService';

import Skeleton from './ui/Skeleton';
import LogModal from './LogModal';

const DEFAULT_HABITS = [
  { name: 'Hydration', icon: 'Droplets', value: '', color: 'text-cyan-400' },
  { name: 'Synaptic Rest', icon: 'Moon', value: '', color: 'text-indigo-400' },
  { name: 'Nutrition', icon: 'Apple', value: '', color: 'text-indigo-500' },
  { name: 'Breathwork', icon: 'Wind', value: '', color: 'text-cyan-500' },
  { name: 'Synapse Focus', icon: 'Sun', value: '', color: 'text-indigo-600' },
];

const MetricTile = ({ label, value, icon, subValue, isSynced, loading }: { label: string, value: string, icon: ReactNode, subValue?: string, isSynced: boolean, loading?: boolean }) => {
  if (loading) {
    return (
      <div className="bg-bg-card p-6 rounded-[2.5rem] border border-border-color flex flex-col justify-between shadow-sm animate-pulse">
        <div className="w-12 h-12 bg-bg-secondary rounded-2xl mb-4" />
        <div>
          <div className="w-20 h-6 bg-bg-secondary rounded mb-2" />
          <div className="w-12 h-3 bg-bg-secondary rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card p-6 rounded-[2.5rem] border border-border-color flex flex-col justify-between hover:border-brand-primary/30 transition-all shadow-sm group">
      <div className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center group-hover:neural-gradient group-hover:text-white transition-all text-text-secondary shadow-inner">
        {icon}
      </div>
      <div className="mt-8">
        <div className={`text-2xl font-bold tracking-tight mb-1 leading-none font-display ${isSynced ? 'text-text-primary' : 'text-text-secondary/50'}`}>
          {isSynced ? value : '--'}
        </div>
        <div className="text-[10px] text-text-secondary font-bold uppercase tracking-widest flex items-center justify-between font-display">
          <span>{label}</span>
          {isSynced ? (
            subValue && <span className="text-brand-primary">{subValue}</span>
          ) : (
            <span className="text-rose-500 font-mono text-[8px] tracking-[0.2em]">OFFLINE</span>
          )}
        </div>
      </div>
    </div>
  );
}

import { integrationService, IntegrationState } from '../services/integrationService';

export default function Stats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<IntegrationState | null>(null);
  
  useEffect(() => {
    if (!user) return;
    return integrationService.subscribeToIntegrations(user.uid, setIntegrations);
  }, [user]);

  const activeSyncProviders = useMemo(() => {
    if (!integrations || typeof integrations !== 'object') return [];
    return Object.entries(integrations)
      .filter(([key, val]) => val === true && key !== 'lastSynced')
      .map(([key]) => key);
  }, [integrations]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBests | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [habits, setHabits] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logType, setLogType] = useState<'sleep' | 'body' | 'hr'>('sleep');
  
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'workouts'), where('userId', '==', user.uid));
    const unsubWorkouts = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a: any, b: any) => (a.timestamp?.toDate?.().getTime() || 0) - (b.timestamp?.toDate?.().getTime() || 0));
      setWorkouts(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'workouts');
    });

    const unsubPBs = subscribeToPersonalBests(user.uid, (pb) => setPersonalBests(pb));

    const today = new Date().toISOString().split('T')[0];
    const unsubDaily = onSnapshot(doc(db, 'dailyStats', `${user.uid}_${today}`), (snapshot) => {
      if (snapshot.exists()) setDailyStats(snapshot.data() as DailyStats);
      setStatsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `dailyStats/${user.uid}_${today}`);
      setStatsLoading(false);
    });

    const habitsQuery = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const unsubHabits = onSnapshot(habitsQuery, (snapshot) => {
      if (snapshot.empty) seedDefaultHabits();
      else setHabits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'habits');
      setLoading(false);
    });

    const last7DaysDate = new Date();
    last7DaysDate.setDate(last7DaysDate.getDate() - 7);
    const startOfWeek = last7DaysDate.toISOString().split('T')[0];

    const weeklyQuery = query(
      collection(db, 'dailyStats'),
      where('userId', '==', user.uid),
      where('date', '>=', startOfWeek),
      orderBy('date', 'asc')
    );

    const unsubWeekly = onSnapshot(weeklyQuery, (snapshot) => {
      setWeeklyStats(snapshot.docs.map(doc => doc.data() as DailyStats));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'dailyStats');
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
        await setDoc(doc(db, 'habits', habitId), { ...habit, userId: user.uid, updatedAt: serverTimestamp() });
      }
    } catch (err) { console.error('Habit seeding failed:', err); }
  };

  const updateHabitValue = async (habitId: string, currentValue: string) => {
    const newValue = prompt('Update habit value:', currentValue);
    if (newValue !== null && newValue !== currentValue) {
      try {
        await updateDoc(doc(db, 'habits', habitId), { value: newValue, updatedAt: serverTimestamp() });
      } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `habits/${habitId}`); }
    }
  };

  const trendData = useMemo(() => {
    return weeklyStats.map(s => {
      let dateLabel = 'N/A';
      try {
        if (s.date) {
          const dateObj = new Date(s.date + 'T00:00:00');
          if (!isNaN(dateObj.getTime())) {
            dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          }
        }
      } catch (e) {
        console.warn('Date parsing failed for trend data');
      }

      return {
        date: dateLabel,
        steps: s.steps || 0,
        calories: Math.round(s.calories || 0),
        sleep: s.sleepScore || 0,
        goalCalories: s.goalCalories || 600,
        goalSteps: 10000,
        stepProgress: Math.min(Math.round(((s.steps || 0) / 10000) * 100), 100),
        calorieProgress: Math.min(Math.round(((s.calories || 0) / (s.goalCalories || 600)) * 100), 100)
      };
    });
  }, [weeklyStats]);

  const volumeTrend = useMemo(() => {
    return workouts.map(w => {
      const volume = (w.exercises || []).reduce((acc: number, ex: any) => 
        acc + (ex.sets || []).reduce((sAcc: number, s: any) => sAcc + (parseFloat(s.weight) * parseInt(s.reps)), 0), 0
      );
      let dateLabel = 'N/A';
      try {
        if (w.timestamp?.toDate) {
          dateLabel = w.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        } else if (w.timestamp) {
          const d = new Date(w.timestamp);
          if (!isNaN(d.getTime())) {
            dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
          }
        }
      } catch (e) {
        console.warn('Volume trend date parsing failed');
      }
      return { date: dateLabel, volume };
    }).slice(-10);
  }, [workouts]);

  const exerciseBests = useMemo(() => {
    if (!personalBests?.exerciseBests || typeof personalBests.exerciseBests !== 'object') return [];
    return Object.entries(personalBests.exerciseBests)
      .map(([name, data]) => ({
        name,
        weight: (data as any).weight,
        reps: (data as any).reps,
        date: (data as any).date
      }))
      .sort((a, b) => b.weight - a.weight);
  }, [personalBests]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
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
      <header className="mb-14 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary mb-1 font-display">Neural Insights</h1>
          <div className="flex items-center gap-4">
            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.2em] font-display">Biometric Intelligence & Trends</p>
            {activeSyncProviders.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-primary/10 rounded-full border border-brand-primary/20 animate-pulse">
                <div className="w-1 h-1 bg-brand-primary rounded-full" />
                <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest">{activeSyncProviders.length} Active Feeds</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {activeSyncProviders.map(p => (
            <div key={p} className="w-10 h-10 bg-bg-card rounded-xl border border-border-color flex items-center justify-center text-text-secondary shadow-sm hover:text-brand-primary transition-colors tooltip" title={`${p} Sync Active`}>
              {p === 'appleHealth' ? <Apple size={16} /> : <ActivityIcon size={16} />}
            </div>
          ))}
          <div className="w-14 h-14 bg-bg-card rounded-[1.5rem] border border-border-color flex items-center justify-center text-brand-primary shadow-sm cursor-pointer hover:bg-bg-secondary transition-all" onClick={() => { setLogType('sleep'); setShowLogModal(true); }}>
            <Plus size={28} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-12">
          {/* Top Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricTile label="Heart Rate" value={`${dailyStats?.restingHeartRate || '--'} BPM`} icon={<Heart className="text-rose-500" />} isSynced={!!dailyStats?.restingHeartRate} loading={statsLoading} />
            <MetricTile label="Sleep Score" value={`${dailyStats?.sleepScore || '--'}/100`} icon={<Moon className="text-brand-vibrant" />} isSynced={!!dailyStats?.sleepScore} loading={statsLoading} />
            <MetricTile label="Total Steps" value={(dailyStats?.steps || 0).toLocaleString()} icon={<Footprints className="text-brand-primary" />} isSynced={true} loading={statsLoading} />
            <MetricTile label="Energy Burn" value={`${Math.round(dailyStats?.calories || 0)}`} icon={<Flame className="text-brand-cyan" />} isSynced={true} loading={statsLoading} />
          </div>

          {/* Weekly Performance Overview */}
          <section className="bg-bg-card rounded-[3rem] border border-border-color p-8 lg:p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 blur-[100px] pointer-events-none" />
            
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-text-primary font-display uppercase">Performance Velocity</h2>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.2em] font-display mt-2">Rolling 7-Day Protocol</p>
              </div>
              <div className="flex items-center gap-2">
                {activeSyncProviders.length > 0 && (
                  <button 
                    onClick={async () => {
                      if (user && integrations) {
                        try {
                          await integrationService.syncAll(user.uid, integrations);
                        } catch (err) { console.error(err); }
                      }
                    }}
                    className="text-[10px] text-brand-primary font-bold uppercase tracking-widest font-display bg-brand-primary/10 px-3 py-1.5 rounded-full border border-brand-primary/20 hover:bg-brand-primary/20 transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} /> Sync Infrastructure
                  </button>
                )}
                <div className="text-[10px] text-text-secondary font-bold uppercase tracking-widest font-display bg-bg-secondary px-3 py-1.5 rounded-full border border-border-color flex items-center gap-1.5">
                  <Calendar size={14} className="text-brand-primary" /> Weekly Trend
                </div>
              </div>
            </div>

            <div className="h-72 mb-10 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4338CA" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4338CA" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-color)', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', color: 'var(--color-text-primary)' }}
                    itemStyle={{ color: 'var(--color-brand-primary)', fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area type="monotone" dataKey="steps" stroke="#4338CA" strokeWidth={4} fillOpacity={1} fill="url(#velocityGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-4 gap-4 border-t border-border-color pt-10">
              <WeeklyStat label="Total Steps" value={trendData.reduce((acc, curr) => acc + curr.steps, 0).toLocaleString()} icon={<Footprints size={14} />} color="brand-primary" />
              <WeeklyStat label="Energy Total" value={trendData.reduce((acc, curr) => acc + curr.calories, 0).toLocaleString()} icon={<Flame size={14} />} color="brand-cyan" />
              <WeeklyStat label="Sleep Qual." value={Math.round(trendData.reduce((acc, curr) => acc + curr.sleep, 0) / (trendData.length || 1)).toString()} icon={<Moon size={14} />} color="brand-vibrant" />
              <WeeklyStat label="Act. Period" value={`${trendData.length}D`} icon={<ActivityIcon size={14} />} color="brand-primary" />
            </div>
          </section>

          {/* Correlation Analytics */}
          <ChartCard title="Metabolic Correlation" sub="Step Synergy vs Energy Expenditure" icon={<TrendingUp size={18} />}>
            <div className="h-64 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4338CA" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4338CA" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-color)', borderRadius: '16px' }}
                  />
                  <Area type="step" dataKey="steps" stroke="#4338CA" fillOpacity={1} fill="url(#colorSteps)" />
                  <Area type="step" dataKey="calories" stroke="#06B6D4" fillOpacity={1} fill="url(#colorCals)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest mt-6 text-center">Step/Calorie Linear Distribution</p>
          </ChartCard>

          {/* Weekly Goal Progress */}
          <section className="mb-14">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-bg-card border border-border-color flex items-center justify-center shadow-sm text-brand-vibrant">
                  <Target size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-text-primary font-display uppercase">Goal Trajectory</h2>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.2em] font-display mt-1">Weekly progress alignment</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ChartCard title="Calorie Compliance" sub="Protocol: 600+ kcal/day" icon={<Flame size={18} />}>
                <div className="h-56 mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <defs>
                        <linearGradient id="calBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06B6D4" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#4338CA" stopOpacity={1}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 9, fontWeight: 'bold' }} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(67, 56, 202, 0.05)' }} 
                        content={<CustomTooltip />}
                      />
                      <Bar dataKey="calories" fill="url(#calBarGrad)" radius={[8, 8, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest font-display text-text-secondary border-t border-border-color pt-4">
                  <span>Weekly Avg: {Math.round(trendData.reduce((acc, curr) => acc + curr.calories, 0) / 7)} kcal</span>
                  <span className="text-brand-cyan">Target: 600</span>
                </div>
              </ChartCard>

              <ChartCard title="Step Capacity" sub="Protocol: 10,000 steps/day" icon={<Footprints size={18} />}>
                <div className="h-56 mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <defs>
                        <linearGradient id="stepBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4338CA" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#06B6D4" stopOpacity={1}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 9, fontWeight: 'bold' }} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(67, 56, 202, 0.05)' }} 
                        content={<CustomTooltip />}
                      />
                      <Bar dataKey="steps" fill="url(#stepBarGrad)" radius={[8, 8, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest font-display text-text-secondary border-t border-border-color pt-4">
                  <span>Weekly Avg: {Math.round(trendData.reduce((acc, curr) => acc + curr.steps, 0) / 7)}</span>
                  <span className="text-brand-primary">Target: 10k</span>
                </div>
              </ChartCard>
            </div>
          </section>

          {/* Volume Profile */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ChartCard title="Workout Volume" sub="Rolling 10-Session Trend" icon={<BarChart3 size={18} />}>
              <div className="h-48 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeTrend}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4338CA" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <Bar dataKey="volume" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                    <Tooltip cursor={{ fill: 'rgba(67, 56, 202, 0.05)' }} contentStyle={{ borderRadius: '16px', border: '1px solid var(--color-border-color)', backgroundColor: 'var(--color-bg-card)', boxShadow: '0 10px 15px -1px rgb(0 0 0 / 0.1)' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Daily Intensity" sub="Average Activity Cycles" icon={<ActivityIcon size={18} />}>
              <div className="h-48 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <Area type="monotone" dataKey="calories" stroke="#06B6D4" fill="rgba(6, 182, 212, 0.1)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </section>

          {/* Metric Glossary */}
          <section className="mb-14">
            <div className="flex items-center gap-4 mb-8 px-2">
              <div className="w-10 h-10 rounded-2xl bg-bg-card border border-border-color flex items-center justify-center shadow-sm text-brand-primary">
                <Database size={18} />
              </div>
              <h2 className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.4em] font-display">Neural Infrastructure</h2>
            </div>
            
            <div className="bg-bg-card rounded-[3rem] border border-border-color p-8 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <InfrastructurePulse 
                  name="Apple Health" 
                  isActive={integrations?.appleHealth || false} 
                  lastSynced={integrations?.lastSynced}
                  icon={<Apple size={20} />}
                />
                <InfrastructurePulse 
                  name="Garmin Cloud" 
                  isActive={integrations?.garmin || false} 
                  lastSynced={integrations?.lastSynced}
                  icon={<ActivityIcon size={20} />}
                />
                <InfrastructurePulse 
                  name="Google Fit" 
                  isActive={integrations?.googleFit || false} 
                  lastSynced={integrations?.lastSynced}
                  icon={<Zap size={20} />}
                />
              </div>
              
              {!activeSyncProviders.length && (
                <div className="mt-10 p-10 bg-bg-secondary rounded-[2.5rem] border border-dashed border-border-color text-center">
                  <p className="text-sm text-text-secondary font-medium mb-6 font-display italic">No neural links established. Establish connections in System Parameters to enable high-fidelity automated data feeds.</p>
                  <button 
                    onClick={() => navigate('/settings')}
                    className="btn-primary py-4 px-8 rounded-2xl text-xs font-bold uppercase tracking-widest font-display shadow-lg shadow-brand-primary/20"
                  >
                    Establish Neural Link
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Metric Glossary */}
          <section className="mb-14">
            <div className="flex items-center gap-4 mb-8 px-2">
              <div className="w-10 h-10 rounded-2xl bg-bg-card border border-border-color flex items-center justify-center shadow-sm">
                <BookOpen size={18} className="text-brand-vibrant" />
              </div>
              <h2 className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.4em] font-display">Protocol Lexicon</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlossaryItem 
                icon={<Heart size={16} />}
                title="Resting Heart Rate (RHR)"
                desc="Basal heart rate measured during total metabolic inactivity. Lower values often correlate with high cardiovascular efficiency."
                color="text-rose-500"
              />
              <GlossaryItem 
                icon={<Zap size={16} />}
                title="Health Readiness Score"
                desc="Composite index (0-100) aggregating sleep, heart rate variability, and recent activity levels to determine training capacity."
                color="text-brand-primary"
              />
              <GlossaryItem 
                icon={<Moon size={16} />}
                title="Sleep Architecture"
                desc="Analysis of circadian phase alignment and duration. Critical for hormonal recalibration and neural repair."
                color="text-brand-vibrant"
              />
              <GlossaryItem 
                icon={<Flame size={16} />}
                title="Active Energy (Kcal)"
                desc="Estimated caloric expenditure beyond basal metabolic rate, derived from movement and intensity algorithms."
                color="text-brand-cyan"
              />
            </div>
          </section>
        </div>

        {/* Sidebar Insights */}
        <div className="lg:col-span-4 space-y-12">
          <section className="bg-text-primary rounded-[3rem] p-10 text-bg-primary relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-3xl shadow-xl shadow-black/20">
                  <Zap className="text-brand-cyan" size={24} />
                </div>
                <h3 className="font-bold tracking-tight text-xl font-display uppercase">Synapse AI</h3>
              </div>
              <p className="text-sm text-bg-primary/80 leading-relaxed font-medium mb-10 font-display italic">
                "Analyzing your biometric signatures. Your energy output is 12% higher this week. Strategic focus on hydration is recommended for optimal recovery cycles."
              </p>
              <button 
                onClick={() => navigate('/training')}
                className="w-full py-5 bg-brand-primary rounded-[1.5rem] text-xs font-bold uppercase tracking-[0.2em] hover:brightness-110 transition-all active:scale-95 shadow-xl shadow-brand-primary/30 text-white font-display"
              >
                View Protocol
              </button>
            </div>
            <div className="absolute -bottom-10 -right-10 text-white/5 rotate-12 scale-150 pointer-events-none">
              <ActivityIcon size={160} />
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between px-2 mb-4">
              <h3 className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em] font-display">Health Habits</h3>
              <span className="text-[10px] text-brand-primary font-bold font-mono px-2 py-0.5 bg-brand-primary/10 rounded-full border border-brand-primary/20">{habits.length} ACTIVE</span>
            </div>
            <div className="space-y-4">
              {habits.map((habit, i) => (
                <motion.div 
                  key={habit.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ x: 5 }}
                  onClick={() => updateHabitValue(habit.id, habit.value)}
                  className="bg-bg-card p-6 rounded-[2rem] border border-border-color flex items-center justify-between hover:border-brand-primary/30 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-all shadow-inner">
                      {getHabitIcon(habit.icon, habit.color || 'text-text-secondary')}
                    </div>
                    <span className="text-sm font-bold text-text-primary tracking-tight font-display uppercase">{habit.name}</span>
                  </div>
                  <div className="text-xl font-bold text-brand-primary tracking-tight tabular-nums group-hover:scale-110 transition-transform font-display">{habit.value || '--'}</div>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em] px-2 mb-4 font-display">Neural Records</h3>
            <div className="space-y-5">
              {exerciseBests.length > 0 ? exerciseBests.slice(0, 3).map((best, i) => (
                <div key={i} className="bg-bg-card p-6 rounded-[2rem] border border-border-color flex items-center justify-between shadow-sm group hover:border-brand-vibrant/40 transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center text-brand-vibrant shadow-inner group-hover:bg-brand-vibrant/10 transition-all">
                      <Star size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary tracking-tight font-display uppercase">{best.name}</h4>
                      <p className="text-[9px] text-text-secondary font-bold uppercase mt-1.5 font-display tracking-widest">{new Date(best.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-text-primary tracking-tight font-display">{best.weight} <span className="text-[10px] text-text-secondary font-bold uppercase ml-1 tracking-widest">KG</span></div>
                </div>
              )) : (
                <div className="p-10 border-2 border-dashed border-border-color rounded-[2.5rem] text-center flex flex-col items-center gap-4">
                  <Trophy className="text-text-secondary opacity-10" size={40} />
                  <p className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-[0.3em] font-display">No records established</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <LogModal 
        isOpen={showLogModal} 
        onClose={() => setShowLogModal(false)} 
        type={logType} 
      />
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-card border border-border-color p-4 rounded-2xl shadow-xl backdrop-blur-md">
        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-primary" />
          <p className="text-sm font-bold text-text-primary tabular-nums">
            {payload[0].value.toLocaleString()} 
            <span className="text-[10px] text-text-secondary ml-1 lowercase font-medium">
              {payload[0].dataKey}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

function InfrastructurePulse({ name, isActive, lastSynced, icon }: { name: string, isActive: boolean, lastSynced: any, icon: ReactNode }) {
  return (
    <div className={`p-6 rounded-3xl border transition-all ${isActive ? 'bg-bg-secondary border-brand-primary/20 shadow-inner' : 'bg-bg-secondary/50 border-border-color opacity-40'}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'text-brand-primary' : 'text-text-secondary'}`}>
          {icon}
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest font-display text-text-primary leading-none">{name}</h4>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-brand-primary animate-pulse' : 'bg-text-secondary'}`} />
            <span className="text-[8px] font-bold uppercase tracking-widest text-text-secondary font-display">
              {isActive ? 'Live Stream' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
      {isActive && (
        <div className="pt-4 border-t border-border-color">
          <p className="text-[8px] text-text-secondary font-bold uppercase tracking-widest font-mono">
            Last Sync: {(() => {
              if (lastSynced?.toDate) return lastSynced.toDate().toLocaleTimeString();
              if (lastSynced instanceof Date) return lastSynced.toLocaleTimeString();
              if (lastSynced) {
                const d = new Date(lastSynced);
                return isNaN(d.getTime()) ? 'Establishing...' : d.toLocaleTimeString();
              }
              return 'Establishing...';
            })()}
          </p>
        </div>
      )}
    </div>
  );
}

function GlossaryItem({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) {
  return (
    <div className="bg-bg-card p-7 rounded-[2.5rem] border border-border-color flex items-start gap-6 transition-all hover:bg-bg-secondary shadow-sm group">
      <div className={`w-12 h-12 rounded-2xl bg-bg-secondary flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform ${color}`}>
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold text-text-primary mb-2 font-display uppercase tracking-tight">{title}</h4>
        <p className="text-[11px] text-text-secondary leading-relaxed font-medium font-display">{desc}</p>
      </div>
    </div>
  );
}

function WeeklyStat({ label, value, icon, color }: { label: string, value: string, icon: ReactNode, color: string }) {
  const colorMap: Record<string, string> = {
    'brand-primary': 'text-brand-primary bg-brand-primary/10 border-brand-primary/20',
    'brand-cyan': 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20',
    'brand-vibrant': 'text-brand-vibrant bg-brand-vibrant/10 border-brand-vibrant/20'
  };
  return (
    <div className="text-center group">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 border shadow-sm transition-transform group-hover:scale-110 ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="text-xl font-bold text-text-primary tracking-tighter leading-none mb-2 font-display">{value}</p>
      <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest font-display">{label}</p>
    </div>
  );
}

function ChartCard({ title, sub, icon, children }: { title: string, sub: string, icon: ReactNode, children: ReactNode }) {
  return (
    <div className="bg-bg-card p-8 rounded-[3rem] border border-border-color shadow-sm hover:border-brand-primary/30 transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-text-primary font-display uppercase">{title}</h3>
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.2em] mt-2 font-display">{sub}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center text-text-secondary/30">
          {icon}
        </div>
      </div>
      {children}
    </div>
  );
}

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
