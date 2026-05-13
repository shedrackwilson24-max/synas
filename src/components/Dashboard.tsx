import { useEffect, useState, useMemo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useStepTracker } from '../hooks/useStepTracker';
import { 
  initializeDailyStats, 
  subscribeToDailyStats, 
  subscribeToPersonalBests,
  DailyStats, 
  PersonalBests 
} from '../services/fitnessService';
import { 
  LogOut, 
  Dumbbell, 
  Trophy, 
  Flame, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Target,
  Calendar,
  Play,
  Zap,
  Heart,
  Moon,
  Footprints,
  Activity as ActivityIcon,
  History as HistoryIcon,
  RefreshCw,
  AlertCircle,
  Scale,
  Database,
  Save,
  Plus
} from 'lucide-react';
import Logo from './Logo';
import FitnessRing from './FitnessRing';
import ConnectionStatus from './ConnectionStatus';
import { logSleep, logBodyMetrics, logHeartRate, subscribeToReadiness } from '../services/fitnessService';
import Waitlist from './Waitlist';
import LogModal from './LogModal';
import Skeleton from './ui/Skeleton';
import ProtocolDashboard from './ProtocolDashboard';

const calculateChange = (current: number, last: number) => {
  if (!last || last === 0) return 0;
  return ((current - last) / last) * 100;
};

function MetricCard({ label, value, change, icon, isSynced, loading }: { label: string, value: string, change: number, icon: ReactNode, isSynced: boolean, loading?: boolean }) {
  const isPositive = change >= 0;
  
  if (loading) {
    return (
      <div className="premium-card p-6 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="w-8 h-8 rounded-xl" />
        </div>
        <div>
          <Skeleton className="w-20 h-6 mb-2" />
          <Skeleton className="w-12 h-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-card p-6 flex flex-col justify-between group hover:border-brand-primary/50 transition-all shadow-sm hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 rounded-2xl bg-bg-secondary group-hover:bg-brand-primary/10 transition-colors">
          {icon}
        </div>
        {isSynced && change !== 0 && (
          <div className={`text-[10px] font-bold flex items-center gap-1 ${isPositive ? 'text-brand-cyan' : 'text-rose-500'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <div className={`text-2xl font-bold tracking-tight mb-1 font-display ${isSynced ? 'text-text-primary' : 'text-text-secondary'}`}>
          {isSynced ? value : '--'}
        </div>
        <div className="text-[10px] text-text-secondary font-bold uppercase tracking-widest leading-tight font-display">
          {label}
          {!isSynced && <span className="block text-[8px] text-brand-primary mt-0.5 font-medium">SYNC REQUIRED</span>}
        </div>
      </div>
    </div>
  );
}

import { integrationService, IntegrationState } from '../services/integrationService';

export default function Dashboard() {
  const { user } = useAuth();
  const { addNotification, requestPushPermissions } = useNotifications();
  const [integrations, setIntegrations] = useState<IntegrationState | null>(null);

  useEffect(() => {
    if (user) {
      return integrationService.subscribeToIntegrations(user.uid, setIntegrations);
    }
  }, [user]);

  const activeIntegrationsCount = useMemo(() => {
    if (!integrations || typeof integrations !== 'object') return 0;
    return Object.entries(integrations).filter(([k, v]) => v === true && k !== 'lastSynced' && k !== 'garminRefreshToken' && k !== 'garminTokenSecret').length;
  }, [integrations]);

  const isSyncStale = useMemo(() => {
    if (!integrations?.lastSynced || activeIntegrationsCount === 0) return false;
    try {
      let lastSyncDate: Date;
      if (typeof integrations.lastSynced.toDate === 'function') {
        lastSyncDate = integrations.lastSynced.toDate();
      } else if (integrations.lastSynced instanceof Date) {
        lastSyncDate = integrations.lastSynced;
      } else {
        lastSyncDate = new Date(integrations.lastSynced);
      }

      if (isNaN(lastSyncDate.getTime())) return false;
      
      const diffInHours = (new Date().getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);
      return diffInHours >= 24;
    } catch (e) {
      console.warn('Sync stale check failed:', e);
      return false;
    }
  }, [integrations, activeIntegrationsCount]);

  useEffect(() => {
    if (isSyncStale) {
      const storageKey = `sync_reminder_${user?.uid}_${new Date().toDateString()}`;
      if (!sessionStorage.getItem(storageKey)) {
        addNotification('info', 'Neural Sync Required', 'Biometric data feed is stale (>24h). Recalibrate for optimal accuracy.');
        sessionStorage.setItem(storageKey, 'true');
      }
    }
  }, [isSyncStale, user?.uid, addNotification]);

  const navigate = useNavigate();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [readinessScore, setReadinessScore] = useState(0);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logType, setLogType] = useState<'sleep' | 'body' | 'hr'>('sleep');
  const [activeTab, setActiveTab] = useState<'physiology' | 'protocol'>('physiology');

  const { 
    isTracking, 
    currentSteps, 
    permissionGranted, 
    startTracking, 
    stopTracking, 
    distance: sessionDistance, 
    calories: sessionCalories,
    pendingSteps,
    pendingDistance,
    pendingCalories
  } = useStepTracker(user?.uid);

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user && !profile?.fcmTokens?.length) {
      // Auto-request permission on first dashboard visit if not already set
      const timer = setTimeout(() => {
        requestPushPermissions().catch(console.error);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, profile, requestPushPermissions]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [personalBests, setPersonalBests] = useState<PersonalBests | null>(null);
  const [loading, setLoading] = useState(true);
  const [workoutsLoading, setWorkoutsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch Profile
    const fetchProfile = async () => {
      const path = `users/${user.uid}`;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          navigate('/profile-setup');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      } finally {
        setLoading(false);
      }
    };

    // Listen to Workout History
    const historyPath = 'workouts';
    const q = query(
      collection(db, 'workouts'), 
      where('userId', '==', user.uid)
    );
    const unsubWorkouts = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually to avoid index requirement
      docs.sort((a: any, b: any) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : Date.now();
        const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : Date.now();
        return tB - tA;
      });
      setWorkouts(docs);
      setWorkoutsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, historyPath);
      setWorkoutsLoading(false);
    });

    fetchProfile();

    // Initialize & Subscribe to Fitness Stats
    initializeDailyStats(user.uid);
    const unsubFitness = subscribeToDailyStats(user.uid, (stats) => {
      setDailyStats(stats);
      setStatsLoading(false);
    });

    const unsubPBs = subscribeToPersonalBests(user.uid, (pb) => {
      setPersonalBests(pb);
    });

    const unsubReadiness = subscribeToReadiness(user.uid, (score) => {
      setReadinessScore(score);
    });

    return () => {
      unsubWorkouts();
      unsubFitness();
      unsubPBs();
      unsubReadiness();
    };
  }, [user, navigate]);

  // Milestone Detection
  useEffect(() => {
    if (loading || workouts.length === 0) return;

    const total = workouts.length;
    const milestoneTargets = [1, 5, 10, 25, 50, 100];
    
    if (milestoneTargets.includes(total)) {
      const storageKey = `celebrated_milestone_${total}_${user?.uid}`;
      if (!sessionStorage.getItem(storageKey)) {
        addNotification(
          'milestone',
          'Protocol Milestone Achieved',
          `System confirms completion of ${total} neural sessions. Evolutionary status upgraded.`
        );
        sessionStorage.setItem(storageKey, 'true');
      }
    }
  }, [workouts.length, loading, addNotification, user?.uid]);

  const stats = useMemo(() => {
    const totalWorkouts = workouts.length;
    const lastWorkout = workouts[0] || null;
    let heaviestWeight = 0;
    
    // Calculate volume trend for last 7 sessions
    const volumes = workouts.slice(0, 7).reverse().map(w => {
      if (!w.exercises) return 0;
      return w.exercises.reduce((acc: number, ex: any) => {
        if (!ex.sets) return acc;
        return acc + ex.sets.reduce((sAcc: number, s: any) => {
          const weight = parseFloat(s.weight) || 0;
          const reps = parseInt(s.reps) || 0;
          return sAcc + (weight * reps);
        }, 0);
      }, 0);
    }, 0);

    workouts.forEach(w => {
      if (!w.exercises) return;
      w.exercises.forEach((ex: any) => {
        if (!ex.sets) return;
        ex.sets.forEach((s: any) => {
          const weight = parseFloat(s.weight) || 0;
          if (weight > heaviestWeight) heaviestWeight = weight;
        });
      });
    });

    const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 1;
    const normalizedVolumes = volumes.map(v => (v / maxVolume) * 100);

    return { totalWorkouts, lastWorkout, heaviestWeight, normalizedVolumes };
  }, [workouts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-12 h-12 bg-brand-primary rounded-full blur-xl animate-pulse-neural"
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-24 pt-4 lg:pt-0"
    >
      <header className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary font-display">{greeting}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <p className="text-sm text-text-secondary font-medium tracking-tight">Your neural dashboard</p>
              <div className="flex bg-bg-secondary p-1 rounded-2xl border border-border-color shadow-inner ml-2">
                <button 
                  onClick={() => setActiveTab('physiology')}
                  className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'physiology' ? 'bg-bg-card text-brand-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Physiology
                </button>
                <button 
                  onClick={() => setActiveTab('protocol')}
                  className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'protocol' ? 'bg-bg-card text-brand-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Protocol
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-6">
          {activeIntegrationsCount > 0 && (
            <div className="flex items-center gap-3">
              <button 
                onClick={async () => {
                  if (user && integrations) {
                    setIsSyncing(true);
                    try {
                      await integrationService.syncAll(user.uid, integrations);
                      addNotification('success', 'Neural Sync Complete', 'Biometric data has been successfully recalibrated.');
                    } catch (err) {
                      addNotification('info', 'Sync Failed', 'Neural connection unstable. Please try again.');
                    } finally {
                      setIsSyncing(false);
                    }
                  }
                }}
                disabled={isSyncing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg transition-all disabled:opacity-50 ${
                  isSyncStale 
                  ? 'bg-rose-500 text-white shadow-rose-500/20 animate-pulse' 
                  : 'bg-brand-primary text-white shadow-brand-primary/20'
                } hover:scale-105 active:scale-95`}
              >
                <RefreshCw size={10} className={`${isSyncing ? 'animate-spin' : ''}`} />
                <span className="text-[8px] font-black font-display uppercase tracking-widest">
                  {isSyncing ? 'Syncing...' : isSyncStale ? 'Re-Sync Required' : 'Sync Now'}
                </span>
              </button>
              {isSyncStale && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20"
                >
                  <AlertCircle size={10} />
                  <span className="text-[8px] font-black font-display uppercase tracking-widest truncate max-w-[50px] sm:max-w-none">Data Stale</span>
                </motion.div>
              )}
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-sm font-bold text-text-primary block font-display">{profile?.name || user?.email}</span>
              <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest mt-0.5 block font-display">{profile?.activity_level || 'Member'} Status</span>
            </div>
            <div className="w-12 h-12 rounded-2xl border-2 border-border-color bg-bg-secondary shadow-sm overflow-hidden p-0.5" onClick={() => navigate('/profile')}>
              <img 
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'physiology' ? (
          <motion.main 
            key="physiology"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10"
          >
            {/* Left Column */}
            <div className="lg:col-span-12 xl:col-span-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Main Ring Card */}
                <motion.section 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-bg-card p-10 rounded-[3.5rem] border border-border-color shadow-[0_20px_50px_rgba(0,0,0,0.02)] relative overflow-hidden h-fit"
                >
                  <div className="flex justify-center transform lg:scale-110 mb-2">
                    <FitnessRing 
                      calories={Math.round((dailyStats?.calories || 0) + pendingCalories)} 
                      goal={dailyStats?.goalCalories || 600}
                      steps={(dailyStats?.steps || 0) + pendingSteps}
                      distance={Number(((dailyStats?.distance || 0) + pendingDistance).toFixed(2))}
                      size={260}
                    />
                  </div>

                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    <LogButton icon={<Moon size={14} />} label="Sleep" onClick={() => { setLogType('sleep'); setShowLogModal(true); }} />
                    <LogButton icon={<Scale size={14} />} label="Weight" onClick={() => { setLogType('body'); setShowLogModal(true); }} />
                    <LogButton icon={<Heart size={14} />} label="HR" onClick={() => { setLogType('hr'); setShowLogModal(true); }} />
                  </div>
                </motion.section>

                {/* Step Tracker Card */}
                <motion.section 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-bg-card rounded-[3rem] p-8 border border-border-color shadow-[0_20px_50px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-center"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-[1.5rem] ${isTracking ? 'neural-gradient text-white shadow-lg shadow-brand-primary/20' : 'bg-bg-secondary text-text-secondary'}`}>
                        <ActivityIcon size={24} className={isTracking ? 'animate-pulse' : ''} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold tracking-tight font-display">Active Tracking</h3>
                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest font-display">Real-time biometrics</p>
                      </div>
                    </div>
                  </div>

                  {isTracking ? (
                    <div className="space-y-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-7xl font-bold tracking-tight text-text-primary font-display italic">
                          {currentSteps.toLocaleString()}
                        </span>
                        <span className="text-base font-bold text-text-secondary font-display uppercase tracking-wider">steps</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-bg-secondary rounded-2xl p-5 border border-border-color">
                          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-1.5 font-display">Distance</p>
                          <p className="text-2xl font-bold text-text-primary font-display">
                            {sessionDistance.toFixed(2)}<span className="text-xs ml-1 text-text-secondary">km</span>
                          </p>
                        </div>
                        <div className="bg-bg-secondary rounded-2xl p-5 border border-border-color">
                          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-1.5 font-display">Burned</p>
                          <p className="text-2xl font-bold text-text-primary font-display">
                            {sessionCalories.toFixed(0)}<span className="text-xs ml-1 text-text-secondary">kcal</span>
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={stopTracking}
                        className="w-full bg-text-primary hover:bg-slate-800 py-5 rounded-2xl flex items-center justify-center text-white font-bold tracking-tight transition-all active:scale-95 text-sm font-display uppercase tracking-widest shadow-xl shadow-black/10"
                      >
                        Complete Session
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <p className="text-sm text-text-secondary font-medium leading-relaxed">
                        Start a tracking session to capture your movement, distance, and metabolic burn with precision.
                      </p>
                      <button 
                        onClick={startTracking}
                        className="group relative w-full btn-primary py-6 rounded-[1.5rem] flex items-center justify-center text-white font-bold tracking-tight transition-all active:scale-95 shadow-xl shadow-brand-primary/20 overflow-hidden font-display uppercase tracking-widest text-base"
                      >
                        <Play size={20} className="mr-2 fill-current" /> Begin Tracking
                      </button>
                    </div>
                  )}
                </motion.section>
              </div>

              {/* Metrics Grid */}
              <motion.section 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-6"
              >
                <MetricCard 
                  label="Resting HR"
                  value={`${dailyStats?.restingHeartRate || 0} bpm`}
                  change={dailyStats ? calculateChange(dailyStats.restingHeartRate, dailyStats.lastWeekRestingHeartRate) : 0}
                  icon={<Heart className="text-brand-primary" size={20} />}
                  isSynced={true}
                  loading={statsLoading}
                />
                <MetricCard 
                  label="Sleep Quality"
                  value={dailyStats?.sleepScore ? `${dailyStats.sleepScore}/100` : '--'}
                  change={dailyStats ? calculateChange(dailyStats.sleepScore, dailyStats.lastWeekSleepScore) : 0}
                  icon={<Moon className="text-brand-vibrant" size={20} />}
                  isSynced={!!dailyStats?.sleepScore}
                  loading={statsLoading}
                />
                <MetricCard 
                  label="Steps"
                  value={((dailyStats?.steps || 0) + pendingSteps).toLocaleString()}
                  change={dailyStats ? calculateChange((dailyStats.steps || 0) + pendingSteps, dailyStats.lastWeekSteps) : 0}
                  icon={<Footprints className="text-brand-cyan" size={20} />}
                  isSynced={true}
                  loading={statsLoading}
                />
                <MetricCard 
                  label="Calories"
                  value={`${Math.round((dailyStats?.calories || 0) + pendingCalories).toLocaleString()} kcal`}
                  change={dailyStats ? calculateChange((dailyStats.calories || 0) + pendingCalories, dailyStats.lastWeekCalories) : 0}
                  icon={<Flame className="text-brand-teal" size={20} />}
                  isSynced={true}
                  loading={statsLoading}
                />
              </motion.section>

              {/* Trend Section */}
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-bg-card rounded-[3rem] p-10 border border-border-color shadow-[0_20px_50px_rgba(0,0,0,0.02)]"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
                  <div>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-2 font-display">Performance Analytics</p>
                    <div className="text-3xl font-bold tracking-tight text-text-primary font-display">Activity Volume Trend</div>
                  </div>
                  <div className="flex items-center gap-3 bg-brand-primary/10 px-4 py-2 rounded-2xl border border-brand-primary/20">
                    <TrendingUp size={18} className="text-brand-primary" />
                    <span className="text-brand-primary text-sm font-bold tracking-tight font-display">+12.4% vs last week</span>
                  </div>
                </div>
                <div className="h-48 flex items-end gap-3 md:gap-4 px-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((_, i) => {
                    const h = stats.normalizedVolumes[i] || 0;
                    return (
                      <div key={i} className="flex-1 bg-bg-secondary rounded-2xl relative group h-full transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(10, h)}%` }}
                          transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute bottom-0 left-0 right-0 neural-gradient rounded-2xl shadow-lg shadow-brand-primary/10 group-hover:brightness-110 transition-all"
                        />
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                          <span className="text-[10px] bg-text-primary text-white dark:bg-white dark:text-black px-2.5 py-1.5 rounded-xl font-bold font-mono">{Math.round(h)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            </div>

            {/* Right Column */}
            <aside className="lg:col-span-12 xl:col-span-4 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6">
                <motion.div 
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="premium-card p-8 flex items-center justify-between"
                >
                  <div>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-3 font-display">Goal Streak</p>
                    {statsLoading ? <Skeleton className="w-16 h-10" /> : <h3 className="text-5xl font-bold tracking-tight text-text-primary font-display italic">{personalBests?.currentStreak || 0}</h3>}
                    <p className="text-[10px] text-brand-cyan font-bold mt-2 uppercase tracking-widest font-display">Days consistent</p>
                  </div>
                  <div className="w-20 h-20 rounded-[2rem] bg-brand-cyan/10 flex items-center justify-center border border-brand-cyan/20 shadow-inner">
                    <Flame size={36} className="text-brand-cyan" />
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 }}
                  className="premium-card p-8 flex items-center justify-between"
                >
                  <div>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-3 font-display">Best Session</p>
                    <h3 className="text-5xl font-bold tracking-tight text-text-primary font-display italic">
                      {stats.heaviestWeight}<span className="text-sm font-bold text-text-secondary ml-1 lowercase">kg</span>
                    </h3>
                    <p className="text-[10px] text-text-secondary font-bold mt-2 uppercase tracking-widest font-display">Personal volume record</p>
                  </div>
                  <div className="w-20 h-20 rounded-[2rem] bg-bg-secondary flex items-center justify-center border border-border-color shadow-inner">
                    <Trophy size={32} className="text-brand-teal" />
                  </div>
                </motion.div>
              </div>

              {/* Activity Logs */}
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="sticky top-8 space-y-8"
              >
                <Waitlist />
                
                <div>
                  <div className="flex items-center justify-between mb-6 px-2">
                    <h3 className="text-[10px] text-text-secondary font-bold uppercase tracking-[.2em] font-display">Recent Activities</h3>
                    <button onClick={() => navigate('/history')} className="text-[10px] text-brand-primary font-bold uppercase tracking-widest hover:text-brand-cyan transition-colors font-display">History</button>
                  </div>
                  <div className="space-y-4">
                    {workoutsLoading ? (
                      [1, 2, 3].map(i => <div key={i} className="bg-bg-card border border-border-color rounded-[2rem] p-6 h-24 shadow-sm animate-pulse" />)
                    ) : workouts.length > 0 ? (
                      workouts.slice(0, 4).map((w, i) => (
                        <motion.div 
                          key={w.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={() => navigate('/history')}
                          className="premium-card p-5 flex items-center gap-5 group cursor-pointer hover:border-brand-primary/30 hover:bg-bg-secondary/50 dark:hover:bg-zinc-800/50 transition-all"
                        >
                          <div className="w-14 h-14 bg-bg-secondary rounded-2xl flex items-center justify-center text-text-secondary group-hover:neural-gradient group-hover:text-white transition-all shadow-inner">
                            <ActivityIcon size={24} />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <h4 className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors truncate font-display">
                              {w.exercises?.[0]?.name || 'Health Activity'}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-text-secondary font-bold uppercase tracking-tight font-display">
                              <span>{Math.floor(w.duration / 60)} min</span>
                              <div className="w-1 h-1 rounded-full bg-border-color" />
                              <span>{w.timestamp?.toDate ? new Date(w.timestamp.toDate()).toLocaleDateString() : 'Today'}</span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-text-secondary group-hover:text-brand-primary transition-transform group-hover:translate-x-1" />
                        </motion.div>
                      ))
                    ) : (
                      <div className="bg-bg-card p-10 rounded-[2.5rem] border border-dashed border-border-color text-center">
                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest font-display">No activities yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.section>
            </aside>
          </motion.main>
        ) : (
          <motion.div
            key="protocol"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ProtocolDashboard />
          </motion.div>
        )}
      </AnimatePresence>

      <LogModal 
        isOpen={showLogModal} 
        onClose={() => setShowLogModal(false)} 
        type={logType} 
      />
    </motion.div>
  );
}

function LogButton({ icon, label, onClick }: { icon: ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-all bg-bg-secondary py-3 px-5 rounded-2xl border border-transparent hover:border-border-color hover:shadow-sm font-display"
    >
      {icon} {label}
    </button>
  );
}
