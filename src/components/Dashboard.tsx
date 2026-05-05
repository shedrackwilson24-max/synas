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

import Skeleton from './ui/Skeleton';

const calculateChange = (current: number, last: number) => {
  if (!last || last === 0) return 0;
  return ((current - last) / last) * 100;
};

function MetricCard({ label, value, change, icon, isSynced, loading }: { label: string, value: string, change: number, icon: ReactNode, isSynced: boolean, loading?: boolean }) {
  const isPositive = change >= 0;
  
  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] p-5 rounded-[2rem] border border-[var(--border-color)] flex flex-col justify-between shadow-xl">
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
    <div className="bg-[var(--bg-card)] p-5 rounded-[2rem] border border-[var(--border-color)] flex flex-col justify-between group hover:border-accent/30 transition-all shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-accent/10 transition-colors">
          {icon}
        </div>
        {isSynced && change !== 0 && (
          <div className={`text-[10px] font-black italic flex items-center gap-0.5 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingUp size={10} className="rotate-180" />}
            {Math.abs(change).toFixed(0)}%
          </div>
        )}
      </div>
      <div>
        <div className={`text-2xl font-black italic uppercase tracking-tighter mb-1 ${isSynced ? 'text-[var(--text-primary)]' : 'text-gray-700'}`}>
          {isSynced ? value : '--'}
        </div>
        <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest leading-tight">
          {label}
          {!isSynced && <span className="block text-[6px] text-accent mt-0.5 italic">NOT SYNCED</span>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { addNotification, requestPushPermissions } = useNotifications();
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
  const [inputValue, setInputValue] = useState('');
  const [inputSecondary, setInputSecondary] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleManualLog = async () => {
    if (!user || !inputValue) return;
    setIsSaving(true);
    try {
      if (logType === 'sleep') {
        await logSleep(user.uid, parseFloat(inputValue));
        addNotification('info', 'Synapse Sync Complete', `Session recorded: ${inputValue} hours of recovery data.`);
      } else if (logType === 'body') {
        await logBodyMetrics(user.uid, parseFloat(inputValue), parseFloat(inputSecondary || '0'));
        addNotification('info', 'Synapse Archive Updated', 'Body composition metrics successfully synchronized.');
      } else if (logType === 'hr') {
        await logHeartRate(user.uid, parseInt(inputValue));
        addNotification('info', 'Synapse Pulse Captured', 'Resting heart rate integrated into biometrics.');
      }
      setShowLogModal(false);
      setInputValue('');
      setInputSecondary('');
    } catch (err) {
      addNotification('info', 'Sync Error', 'An error occurred while logging biometric data.');
    } finally {
      setIsSaving(false);
    }
  };

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
    });

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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-24 px-6 pt-8"
    >
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="w-12 h-12" />
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{greeting}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Synapse Dashboard</p>
            </div>
            <ConnectionStatus hasData={!!(dailyStats?.steps || dailyStats?.calories || dailyStats?.restingHeartRate || dailyStats?.sleepScore || workouts.length > 0)} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div 
                className="w-12 h-12 rounded-full border-2 border-[var(--border-color)] bg-[var(--bg-card)] p-1 overflow-hidden cursor-pointer hover:border-accent transition-colors" 
                onClick={() => navigate('/profile')}
              >
                <img 
                  src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-accent font-black uppercase tracking-tighter italic block">{profile?.name || user?.email}</span>
            <span className="text-[7px] text-gray-600 font-bold uppercase tracking-[0.2em] mt-0.5 block">Evolutionary Rank: {profile?.activity_level || 'Recruit'}</span>
          </div>
        </div>
      </header>

      <motion.main className="space-y-8">
        <div className="mb-4">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
            STATUS: <span className="text-accent underline decoration-accent/30 underline-offset-4">{profile?.activity_level || 'RECRUIT'}</span>
          </h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Personal Growth Protocol Active | {profile?.name || user?.email}</p>
        </div>

        {/* Synapse Sync Ring */}
        <section className="flex flex-col gap-6 bg-[var(--bg-card)] p-10 rounded-[3rem] border border-[var(--border-color)] shadow-2xl relative overflow-hidden group">
          <div className="flex justify-center">
            <div className="relative">
              <FitnessRing 
                calories={Math.round((dailyStats?.calories || 0) + pendingCalories)} 
                goal={dailyStats?.goalCalories || 600}
                steps={(dailyStats?.steps || 0) + pendingSteps}
                distance={Number(((dailyStats?.distance || 0) + pendingDistance).toFixed(2))}
                size={240}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-[10px] text-gray-500 font-black uppercase tracking-[.3em] mb-1">Readiness</div>
                <div className="text-5xl font-black italic text-accent tracking-tighter leading-none">
                  {readinessScore > 0 ? readinessScore : '--'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="absolute top-4 right-8 flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full bg-accent animate-pulse`} />
            <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">
              Synapse System: Connected
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => {
                setLogType('sleep');
                setShowLogModal(true);
              }}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-accent transition-colors bg-white/5 py-2 px-4 rounded-xl border border-white/5 hover:border-accent/20"
            >
              <Moon size={12} /> Log Sleep
            </button>
            <button 
              onClick={() => {
                setLogType('body');
                setShowLogModal(true);
              }}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-accent transition-colors bg-white/5 py-2 px-4 rounded-xl border border-white/5 hover:border-accent/20"
            >
              <Scale size={12} /> Log Weight
            </button>
            <button 
              onClick={() => {
                setLogType('hr');
                setShowLogModal(true);
              }}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-accent transition-colors bg-white/5 py-2 px-4 rounded-xl border border-white/5 hover:border-accent/20"
            >
              <Heart size={12} /> Log HR
            </button>
          </div>
        </section>

        {/* Step Tracker Card */}
        <section className="bg-[var(--bg-card)] rounded-[2.5rem] p-8 border border-[var(--border-color)] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${isTracking ? 'bg-accent/20 text-accent' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
                <ActivityIcon size={24} className={isTracking ? 'animate-pulse' : ''} />
              </div>
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Step Tracker Protocol</h3>
                <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Real-time Biometric Analysis</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className={`text-xs font-black uppercase tracking-widest ${isTracking ? 'text-accent' : 'text-gray-600'}`}>
                {isTracking ? 'ONLINE' : 'OFFLINE'}
              </div>
              {permissionGranted === false && (
                <span className="text-[6px] text-red-500 font-black uppercase mt-1">Sensor Access Denied</span>
              )}
            </div>
          </div>

          {isTracking ? (
            <div className="space-y-6">
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black italic uppercase tracking-tighter text-[var(--text-primary)]">
                  {currentSteps.toLocaleString()}
                </span>
                <span className="text-sm font-black italic uppercase tracking-tighter text-gray-500">STEPS</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Distance</p>
                  <p className="text-xl font-black italic uppercase tracking-tighter text-blue-400">
                    {sessionDistance.toFixed(2)}<span className="text-[10px] ml-1">KM</span>
                  </p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Burned</p>
                  <p className="text-xl font-black italic uppercase tracking-tighter text-orange-500">
                    {sessionCalories.toFixed(1)}<span className="text-[10px] ml-1">KCAL</span>
                  </p>
                </div>
              </div>

              <button 
                onClick={stopTracking}
                className="w-full bg-gray-800 hover:bg-gray-700 py-4 rounded-xl flex items-center justify-center text-white font-black italic uppercase tracking-widest transition-all active:scale-95 text-xs"
              >
                Terminate Protocol
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                Engage motion sensors to track your movement. System accurately calculates distance and metabolic burn in real-time.
              </p>
              <button 
                onClick={startTracking}
                className="group relative w-full bg-accent hover:bg-accent/90 py-5 rounded-2xl flex items-center justify-center text-black font-black italic uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-accent/20 overflow-hidden"
              >
                <motion.div 
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 bg-white/20 skew-x-12"
                />
                <Play size={18} className="mr-2 fill-current" /> Initialize Tracker
              </button>
            </div>
          )}
          
          <div className="absolute -bottom-8 -right-8 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
            <ActivityIcon size={120} />
          </div>
        </section>

        {/* Health Metrics Dashboard */}
        <section className="grid grid-cols-2 gap-4">
          <MetricCard 
            label="Resting HR"
            value={`${dailyStats?.restingHeartRate || 0} bpm`}
            change={dailyStats ? calculateChange(dailyStats.restingHeartRate, dailyStats.lastWeekRestingHeartRate) : 0}
            icon={<Heart className="text-red-500" size={18} />}
            isSynced={true}
            loading={statsLoading}
          />
          <MetricCard 
            label="Sleep Score"
            value={dailyStats?.sleepScore ? `${dailyStats.sleepScore}/100` : '--'}
            change={dailyStats ? calculateChange(dailyStats.sleepScore, dailyStats.lastWeekSleepScore) : 0}
            icon={<Moon className="text-yellow-400" size={18} />}
            isSynced={!!dailyStats?.sleepScore}
            loading={statsLoading}
          />
          <MetricCard 
            label="Steps"
            value={((dailyStats?.steps || 0) + pendingSteps).toLocaleString()}
            change={dailyStats ? calculateChange((dailyStats.steps || 0) + pendingSteps, dailyStats.lastWeekSteps) : 0}
            icon={<Footprints className="text-accent" size={18} />}
            isSynced={true}
            loading={statsLoading}
          />
          <MetricCard 
            label="Calories"
            value={`${Math.round((dailyStats?.calories || 0) + pendingCalories).toLocaleString()} kcal`}
            change={dailyStats ? calculateChange((dailyStats.calories || 0) + pendingCalories, dailyStats.lastWeekCalories) : 0}
            icon={<Flame className="text-orange-500" size={18} />}
            isSynced={true}
            loading={statsLoading}
          />
        </section>

        {/* Recent Workouts Summary */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-[.2em]">Protocol History</h3>
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-accent" />
              <div className="w-1 h-1 rounded-full bg-gray-800" />
            </div>
          </div>
          <div className="space-y-3">
            {workoutsLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-[#111]/80 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex items-center gap-5 shadow-xl">
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <div className="flex-1">
                    <Skeleton className="w-32 h-4 mb-2" />
                    <Skeleton className="w-20 h-2" />
                  </div>
                </div>
              ))
            ) : workouts.length > 0 ? (
              workouts.slice(0, 3).map((w, i) => (
                <motion.div 
                  key={w.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => navigate('/history')}
                  className="bg-[#111]/80 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex items-center gap-5 group cursor-pointer hover:border-accent/30 transition-all shadow-xl"
                >
                  <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-blue-400 group-hover:text-accent transition-colors">
                    <HistoryIcon size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-black italic uppercase tracking-tight text-white/90 group-hover:text-accent transition-colors">
                      {w.exercises?.[0]?.name || 'Synapse Session'}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
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
                  <ChevronRight size={14} className="text-gray-700 group-hover:text-accent transition-colors" />
                </motion.div>
              ))
            ) : (
              <div className="bg-[var(--bg-card)] p-8 rounded-[2.5rem] border border-dashed border-gray-800 text-center">
                <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">No sessions recorded in synapse archive</p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Stats Grid */}
        <section className="space-y-4">
          <div className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-[8px] text-gray-500 font-black uppercase tracking-[.2em] mb-4">
                <Flame size={12} className="text-accent" /> Active Streak
              </div>
              {statsLoading ? <Skeleton className="w-16 h-10" /> : <h3 className="text-5xl font-black italic uppercase tracking-tighter leading-none">{personalBests?.currentStreak || 0}</h3>}
            </div>
            {personalBests?.currentStreak && personalBests.currentStreak > 0 && (
              <div className="w-16 h-16 rounded-full border border-accent/20 flex items-center justify-center relative">
                <Flame size={32} className="text-accent absolute animate-pulse opacity-50 blur-sm" />
                <Flame size={32} className="text-accent relative z-10" />
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)]">
            <div className="flex items-center gap-2 text-[8px] text-gray-500 font-black uppercase tracking-[.2em] mb-4">
              <TrendingUp size={12} /> Total Workouts
            </div>
            {workoutsLoading ? <Skeleton className="w-16 h-10" /> : <h3 className="text-5xl font-black italic uppercase tracking-tighter leading-none">{stats.totalWorkouts}</h3>}
          </div>
          
          <div className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)]">
            <div className="flex items-center gap-2 text-[8px] text-gray-500 font-black uppercase tracking-[.2em] mb-4">
              <Calendar size={12} /> Last Workout
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none mb-1">
              {stats.lastWorkout ? (
                stats.lastWorkout.timestamp?.toDate 
                  ? new Date(stats.lastWorkout.timestamp.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Syncing...'
              ) : 'No Session'}
            </h3>
            <p className="text-[8px] text-accent uppercase font-black tracking-widest">
              {stats.lastWorkout?.exercises[0]?.name || 'Initiate Session'}
            </p>
          </div>

          <div className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)] relative overflow-hidden">
            <div className="flex items-center gap-2 text-[8px] text-gray-500 font-black uppercase tracking-[.2em] mb-4">
              <Dumbbell size={12} /> Heaviest Lift
            </div>
            <h3 className="text-5xl font-black italic uppercase tracking-tighter leading-none text-blue-400">
              {stats.heaviestWeight}<span className="text-sm ml-2 text-gray-500 font-bold">LBS</span>
            </h3>
            <div className="absolute bottom-[-10px] right-[-10px] opacity-5">
              <Dumbbell size={100} />
            </div>
          </div>
        </section>

        {/* Goal Progress (Refined) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-[.2em]">Synapse Growth</h3>
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-accent" />
              <div className="w-1 h-1 rounded-full bg-gray-800" />
            </div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-[2.5rem] p-6 border border-[var(--border-color)]">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Volume Trend (KG)</p>
                <div className="text-xl font-black italic uppercase tracking-tighter">Accelerating</div>
              </div>
              <div className="text-accent text-[8px] font-black uppercase tracking-widest">+12%</div>
            </div>
            <div className="h-24 flex items-end gap-2 px-2">
              {[0, 0, 0, 0, 0, 0, 0].map((_, i) => {
                const h = stats.normalizedVolumes[i] || 0;
                return (
                  <div key={i} className="flex-1 bg-[var(--bg-secondary)] rounded-lg relative group h-full">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(5, h)}%` }}
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600/50 to-accent/50 rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[6px] text-white font-bold">{Math.round(h)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </motion.main>

      <AnimatePresence>
        {showLogModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-6"
            onClick={() => setShowLogModal(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] p-8 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-accent/10 rounded-2xl text-accent">
                  {logType === 'sleep' ? <Moon size={24} /> : logType === 'body' ? <Scale size={24} /> : <Heart size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter">
                    {logType === 'sleep' ? 'Record Sleep Protocol' : logType === 'body' ? 'Sync Body Metrics' : 'Capture Pulse Biometric'}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic">Manual Archive Update</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1.5 block px-1">
                    {logType === 'sleep' ? 'DURATION (HOURS)' : logType === 'body' ? 'TOTAL MASS (KG)' : 'RESTING HR (BPM)'}
                  </label>
                  <input 
                    type="number"
                    step={logType === 'hr' ? "1" : "0.1"}
                    placeholder={logType === 'sleep' ? "8.0" : logType === 'body' ? "85.5" : "65"}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    className="w-full bg-[#111] border border-white/5 rounded-2xl p-5 text-2xl font-black italic uppercase tracking-tighter text-white focus:border-accent outline-none transition-colors"
                  />
                </div>

                {logType === 'body' && (
                  <div>
                    <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1.5 block px-1">
                      BODY FAT (%)
                    </label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="12.5"
                      value={inputSecondary}
                      onChange={e => setInputSecondary(e.target.value)}
                      className="w-full bg-[#111] border border-white/5 rounded-2xl p-5 text-2xl font-black italic uppercase tracking-tighter text-white focus:border-accent outline-none transition-colors"
                    />
                  </div>
                )}

                <button 
                  onClick={handleManualLog}
                  disabled={isSaving || !inputValue}
                  className="w-full bg-accent hover:bg-accent/90 py-5 rounded-2xl flex items-center justify-center text-black font-black italic uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 mt-4 h-16"
                >
                  {isSaving ? (
                    <RefreshCw className="animate-spin" size={20} />
                  ) : (
                    <>
                      <Save size={18} className="mr-2" /> Commit to Archive
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
