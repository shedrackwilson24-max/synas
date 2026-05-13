import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Settings, 
  Shield, 
  Bell, 
  LogOut, 
  ChevronRight, 
  Edit2, 
  CreditCard, 
  Loader2, 
  Camera, 
  Minus, 
  Plus, 
  Zap, 
  Moon, 
  Sun, 
  Trophy, 
  Calendar as CalendarIcon, 
  Weight, 
  Droplets, 
  Brain, 
  Book, 
  Code, 
  Flame, 
  Activity, 
  X, 
  ExternalLink,
  Wallet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, addDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import ImageUploadModal from './ImageUploadModal';
import { useTheme } from '../contexts/ThemeContext';
import { getPersonalBests } from '../services/fitnessService';
import Skeleton from './ui/Skeleton';

interface ProfileItemProps {
  icon: React.ReactNode;
  label: string;
  settingKey?: string;
  onClick?: () => void;
  profile: any;
  onToggle: (key: string) => void;
}

const ProfileItem = ({ icon, label, settingKey, onClick, profile, onToggle }: ProfileItemProps) => {
  const active = settingKey ? !!profile?.[`settings_${settingKey}`] : false;
  
  return (
    <motion.button 
      onClick={settingKey ? () => onToggle(settingKey) : onClick}
      whileTap={{ backgroundColor: 'var(--color-bg-secondary)' }}
      className="w-full flex items-center justify-between p-7 transition-colors group"
    >
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-all text-text-secondary shadow-inner">
          {icon}
        </div>
        <div className="text-left">
          <span className="font-bold text-text-primary block text-sm tracking-tight font-display uppercase">{label}</span>
          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1 block font-display">
            {settingKey ? (active ? 'Active' : 'Disabled') : 'View Parameters'}
          </span>
        </div>
      </div>
      {settingKey ? (
        <div className={`w-12 h-7 rounded-full p-1 transition-all ${active ? 'neural-gradient shadow-inner' : 'bg-bg-secondary border border-border-color'}`}>
          <motion.div 
            animate={{ x: active ? 20 : 0 }}
            className="w-5 h-5 bg-white rounded-full shadow-sm"
          />
        </div>
      ) : (
        <ChevronRight size={18} className="text-text-secondary group-hover:translate-x-1 transition-transform group-hover:text-brand-primary" />
      )}
    </motion.button>
  );
};

export default function Profile() {
  const { user, logout } = useAuth();
  const { address, isConnected, connect, disconnect, isConnecting } = useWallet();
  const { requestPushPermissions, addNotification } = useNotifications();
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bestsLoading, setBestsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [personalBests, setPersonalBests] = useState<any[]>([]);
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);
  const [habits, setHabits] = useState<any[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(true);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', icon: 'Droplets', value: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data());
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchBests = async () => {
      setBestsLoading(true);
      try {
        const bests = await getPersonalBests(user.uid);
        const sorted = [...bests].sort((a, b) => (b.weight || 0) - (a.weight || 0));
        setPersonalBests(sorted);
      } finally {
        setBestsLoading(false);
      }
    };
    fetchBests();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const habitsQuery = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const unsub = onSnapshot(habitsQuery, (snapshot) => {
      const h = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHabits(h);
      setHabitsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'habits');
    });
    return unsub;
  }, [user]);

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newHabit.name || !newHabit.value) return;

    try {
      await addDoc(collection(db, 'habits'), {
        userId: user.uid,
        name: newHabit.name,
        icon: newHabit.icon,
        value: newHabit.value,
        date: new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp()
      });
      setShowAddHabit(false);
      setNewHabit({ name: '', icon: 'Droplets', value: '' });
      addNotification('success', 'Habit Initiated', `${newHabit.name} has been added to your protocol.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'habits');
    }
  };

  const updateHabitValue = async (habitId: string, newValue: string) => {
    try {
      await updateDoc(doc(db, 'habits', habitId), {
        value: newValue,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `habits/${habitId}`);
    }
  };

  const deleteHabit = async (habitId: string) => {
    try {
      await deleteDoc(doc(db, 'habits', habitId));
      addNotification('info', 'Habit Removed', 'Lifestyle protocol adjusted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `habits/${habitId}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;

    setUploading(true);
    setImageToCrop(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          if (result.length > 1048576) {
            reject(new Error('Profile image too large. Please use a smaller file or crop tighter.'));
          } else {
            resolve(result);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read image data.'));
        reader.readAsDataURL(croppedBlob);
      });

      const finalPhotoURL = await base64Promise;
      
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: finalPhotoURL,
        updatedAt: serverTimestamp()
      });
      
      addNotification('success', 'Profile Updated', 'Your profile picture has been recalibrated.');
    } catch (err: any) {
      console.error('Upload Error:', err);
      addNotification('reminder', 'Sync Failed', err.message || 'Failed to update profile picture.');
    } finally {
      setUploading(false);
    }
  };

  const toggleSetting = async (key: string) => {
    if (!user || !profile) return;
    const currentVal = profile?.[`settings_${key}`] || false;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [`settings_${key}`]: !currentVal
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

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
      className="pb-32 pt-10 px-6 max-w-xl mx-auto"
    >
      <AnimatePresence>
        {imageToCrop && (
          <ImageUploadModal 
            image={imageToCrop}
            onClose={() => setImageToCrop(null)}
            onCropComplete={onCropComplete}
          />
        )}
      </AnimatePresence>

      <header className="text-center mb-16 px-4">
        <div className="relative inline-block mb-10 group">
          <div className="w-40 h-40 bg-bg-card rounded-[3.5rem] p-2 shadow-2xl shadow-brand-primary/10 border border-border-color">
            <div className="w-full h-full bg-bg-secondary rounded-[3rem] flex items-center justify-center overflow-hidden relative shadow-inner">
              {uploading && (
                <div className="absolute inset-0 bg-bg-card/80 flex items-center justify-center z-10 backdrop-blur-sm">
                  <Loader2 className="animate-spin text-brand-primary" size={24} />
                </div>
              )}
              <img 
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                alt="Profile" 
                className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
              />
              <div 
                className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer backdrop-blur-none group-hover:backdrop-blur-[2px]" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="text-white drop-shadow-xl" size={32} />
              </div>
            </div>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 w-12 h-12 bg-text-primary rounded-2xl flex items-center justify-center border-4 border-bg-primary text-bg-primary shadow-2xl hover:scale-110 active:scale-95 transition-all"
          >
            <Edit2 size={18} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary mb-2 font-display">{profile?.name || 'Authorized User'}</h1>
        <div className="flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
          <p className="text-[10px] text-brand-primary font-bold uppercase tracking-[0.2em] font-display">{profile?.activity_level || 'Member'} Status Protocol</p>
        </div>
      </header>

      <section className="mb-10">
        <div className="bg-bg-card rounded-[3rem] border border-border-color overflow-hidden shadow-sm">
          <button 
            onClick={() => setIsMetricsExpanded(!isMetricsExpanded)}
            className="w-full flex items-center justify-between p-8 hover:bg-bg-secondary transition-all text-left"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-bg-secondary rounded-2xl flex items-center justify-center text-brand-primary shadow-inner">
                <User size={28} />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-text-primary font-display uppercase">Neural Biometrics</h2>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1 font-display">Metadata & Core Goals</p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: isMetricsExpanded ? 90 : 0 }}
              className="text-text-secondary"
            >
              <ChevronRight size={24} />
            </motion.div>
          </button>

          <AnimatePresence>
            {isMetricsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="px-8 pb-10"
              >
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <BiometricTile label="Age" value={profile?.age} icon={<CalendarIcon size={14} />} onClick={() => navigate('/settings')} />
                  <BiometricTile label="Goal" value={profile?.goal} icon={<Trophy size={14} />} onClick={() => navigate('/settings')} color="text-brand-vibrant" />
                  <BiometricTile label="Weight" value={`${profile?.weight} kg`} icon={<Weight size={14} />} onClick={() => navigate('/settings')} />
                  <BiometricTile label="Rank" value={profile?.activity_rank?.toFixed(1)} icon={<Zap size={14} />} onClick={() => navigate('/settings')} color="text-brand-primary" />
                </div>
                
                <div className="bg-bg-secondary p-8 rounded-[2.5rem] border border-border-color flex items-center justify-between shadow-inner">
                  <div>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-2 font-display">Daily Energy Threshold</p>
                    <div className="text-3xl font-bold tracking-tight text-text-primary font-display">{profile?.goalCalories || 600} <span className="text-xs text-text-secondary font-bold opacity-50 uppercase tracking-widest ml-1">Kcal</span></div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={async () => {
                        const newGoal = Math.max(100, (profile?.goalCalories || 600) - 50);
                        try {
                          await updateDoc(doc(db, 'users', user!.uid), { 
                            goalCalories: newGoal,
                            updatedAt: serverTimestamp() 
                          });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.UPDATE, `users/${user!.uid}`);
                        }
                      }}
                      className="w-12 h-12 rounded-2xl bg-bg-card border border-border-color flex items-center justify-center text-text-secondary hover:text-brand-primary hover:shadow-md transition-all active:scale-95 shadow-sm"
                    >
                      <Minus size={20} />
                    </button>
                    <button 
                      onClick={async () => {
                        const newGoal = (profile?.goalCalories || 600) + 50;
                        try {
                          await updateDoc(doc(db, 'users', user!.uid), { 
                            goalCalories: newGoal,
                            updatedAt: serverTimestamp() 
                          });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.UPDATE, `users/${user!.uid}`);
                        }
                      }}
                      className="w-12 h-12 rounded-2xl bg-bg-card border border-border-color flex items-center justify-center text-text-secondary hover:text-brand-primary hover:shadow-md transition-all active:scale-95 shadow-sm"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-8 px-4">
          <h2 className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em] font-display">Lifestyle Habits</h2>
          <button 
            onClick={() => setShowAddHabit(true)}
            className="w-10 h-10 bg-bg-card border border-border-color rounded-2xl flex items-center justify-center text-brand-primary hover:scale-110 active:scale-95 transition-all shadow-sm"
          >
            <Plus size={18} />
          </button>
        </div>

        <AnimatePresence>
          {showAddHabit && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-1 mb-8 overflow-hidden"
            >
              <div className="bg-bg-secondary p-8 rounded-[3rem] border border-brand-primary/20 shadow-inner">
                <form onSubmit={handleAddHabit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-text-secondary font-bold uppercase tracking-widest ml-4">Habit Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Daily Water"
                        value={newHabit.name}
                        onChange={e => setNewHabit({...newHabit, name: e.target.value})}
                        className="w-full bg-bg-card border border-border-color rounded-2xl p-4 text-sm font-bold outline-none focus:border-brand-primary transition-all text-text-primary shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-text-secondary font-bold uppercase tracking-widest ml-4">Daily Value</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 3 Liters"
                        value={newHabit.value}
                        onChange={e => setNewHabit({...newHabit, value: e.target.value})}
                        className="w-full bg-bg-card border border-border-color rounded-2xl p-4 text-sm font-bold outline-none focus:border-brand-primary transition-all text-text-primary shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] text-text-secondary font-bold uppercase tracking-widest ml-4">Visual Identifier</label>
                    <div className="flex flex-wrap gap-3 justify-center bg-bg-card/50 p-4 rounded-3xl border border-border-color/50">
                      {['Droplets', 'Brain', 'Book', 'Code', 'Flame', 'Zap', 'Sun', 'Moon'].map(iconName => {
                        const IconComponent = { Droplets, Brain, Book, Code, Flame, Zap, Sun, Moon }[iconName as any] as any;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setNewHabit({...newHabit, icon: iconName})}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${newHabit.icon === iconName ? 'neural-gradient text-white shadow-lg' : 'bg-bg-card text-text-secondary border border-border-color hover:border-brand-primary/30'}`}
                          >
                            <IconComponent size={20} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => setShowAddHabit(false)}
                      className="flex-1 bg-bg-card border border-border-color py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-text-secondary transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-2 neural-gradient text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-brand-primary/20 transition-all active:scale-95"
                    >
                      Establish Habit
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4 px-1">
          {habitsLoading ? (
            <div className="h-28 bg-bg-card rounded-[2.5rem] border border-border-color animate-pulse" />
          ) : habits.length > 0 ? (
            habits.map((habit) => {
              const HabitIcon = ({ Droplets, Brain, Book, Code, Flame, Zap, Sun, Moon } as any)[habit.icon] || Droplets;
              return (
                <motion.div 
                  key={habit.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-bg-card p-6 rounded-[2.5rem] border border-border-color flex items-center gap-6 group hover:border-brand-primary/30 transition-all shadow-sm"
                >
                  <div className="w-14 h-14 bg-bg-secondary rounded-[1.5rem] flex items-center justify-center text-text-secondary group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-all shadow-inner">
                    <HabitIcon size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold tracking-tight text-text-primary font-display uppercase">{habit.name}</h4>
                    <div className="flex items-center gap-3 mt-1.5">
                      <input 
                        type="text"
                        value={habit.value}
                        onChange={(e) => updateHabitValue(habit.id, e.target.value)}
                        className="bg-transparent border-b border-border-color/30 text-[11px] font-bold tracking-widest text-brand-primary uppercase outline-none focus:border-brand-primary transition-all w-24"
                      />
                      <span className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-widest font-mono">Daily Target</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteHabit(habit.id)}
                    className="p-3 text-text-secondary/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              );
            })
          ) : !showAddHabit && (
            <div className="bg-bg-card p-10 rounded-[3.5rem] border-2 border-dashed border-border-color text-center flex flex-col items-center gap-4">
              <Activity className="text-text-secondary opacity-10" size={40} />
              <p className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-[0.4em] font-display max-w-[200px]">
                No active lifestyle protocols established
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-8 px-4">
          <h2 className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em] font-display">Personal records</h2>
          <Trophy size={18} className="text-brand-primary" />
        </div>
        <div className="space-y-5 px-1">
          {bestsLoading ? (
            [1, 2].map(i => <div key={i} className="h-28 bg-bg-card rounded-[2.5rem] border border-border-color animate-pulse shadow-sm" />)
          ) : personalBests.length > 0 ? (
            personalBests.map((best, i) => (
              <motion.div 
                key={`${best.exerciseName}-${i}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-bg-card p-7 rounded-[2.5rem] border border-border-color flex items-center gap-6 group hover:border-brand-primary/30 transition-all shadow-sm active:scale-98"
              >
                <div className="w-16 h-16 bg-bg-secondary rounded-[1.5rem] flex items-center justify-center text-text-secondary group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-all shadow-inner">
                  <Weight size={28} />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold tracking-tight text-text-primary group-hover:text-brand-primary transition-colors font-display uppercase">{best.exerciseName}</h4>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-text-secondary font-bold uppercase tracking-[0.2em] font-display">
                    <span className="text-brand-primary">{best.weight} kg</span>
                    <div className="w-1 h-1 rounded-full bg-border-color" />
                    <span>{best.reps} Reps</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 text-text-secondary/40 mb-1">
                    <CalendarIcon size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-widest font-display">
                      {best.date?.toDate 
                        ? new Date(best.date.toDate()).toLocaleDateString()
                        : best.date ? new Date(best.date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="bg-bg-card p-12 rounded-[3.5rem] border-2 border-dashed border-border-color text-center flex flex-col items-center gap-4">
              <Trophy className="text-text-secondary opacity-10" size={40} />
              <p className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-[0.4em] font-display max-w-[200px]">
                Connect workout protocols to establish personal records
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em] mb-8 px-4 font-display">Web3 Protocol</h2>
        <div className="px-1">
          <motion.div 
            whileHover={{ y: -5 }}
            className={`bg-bg-card p-8 rounded-[3rem] border ${isConnected ? 'border-brand-primary/40 shadow-brand-primary/5' : 'border-border-color'} group transition-all shadow-sm relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
              <Wallet size={120} />
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all ${isConnected ? 'bg-brand-primary/10 text-brand-primary shadow-lg shadow-brand-primary/10' : 'bg-bg-secondary text-text-secondary shadow-inner'}`}>
                  {isConnected ? <Shield size={32} /> : <Wallet size={32} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-text-primary font-display uppercase">Reown AppKit</h3>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1 font-display">
                    {isConnected ? `${address?.slice(0, 8)}...${address?.slice(-6)}` : 'Secure Neural Connection'}
                  </p>
                </div>
              </div>

            <div className="flex flex-col gap-4">
                {isConnected ? (
                  <div className="space-y-4">
                    <div className="bg-bg-secondary/50 rounded-2xl p-4 border border-border-color/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em]">Protocol Active</span>
                      </div>
                      <span className="text-[10px] font-mono text-brand-primary font-bold">LOCKED</span>
                    </div>
                    <button 
                      onClick={disconnect}
                      className="w-full py-4 bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-[1.5rem] border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"
                    >
                      Terminate Connection
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={connect}
                    disabled={isConnecting}
                    className="w-full py-5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 relative overflow-hidden group/btn"
                  >
                    <span className="relative z-10">{isConnecting ? 'Linking Neural Net...' : 'Connect Wallet'}</span>
                    <motion.div 
                      className="absolute inset-0 bg-white/10 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out" 
                    />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mb-14">
        <h2 className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em] mb-8 px-4 font-display">Account protocols</h2>
        <div className="bg-bg-card rounded-[3.5rem] border border-border-color overflow-hidden shadow-sm divide-y divide-border-color">
          <ProfileItem icon={<Shield size={20} />} label="Security & Privacy" onClick={() => navigate('/settings')} profile={profile} onToggle={toggleSetting} />
          <ProfileItem icon={<Bell size={20} />} label="Notifications" onClick={requestPushPermissions} profile={profile} onToggle={toggleSetting} />
          <ProfileItem icon={<CreditCard size={20} />} label="Synapse Pro Plan" settingKey="pro" profile={profile} onToggle={toggleSetting} />
        </div>
      </section>

      <div className="px-6 space-y-10">
        <button 
          onClick={handleLogout}
          className="w-full bg-bg-card border border-rose-500/10 py-6 px-10 rounded-[2.5rem] flex items-center justify-center gap-4 text-rose-500 font-bold tracking-widest transition-all active:scale-95 hover:bg-rose-500/5 shadow-sm uppercase font-display text-xs"
        >
          <LogOut size={20} />
          Disconnect Session
        </button>

        <div className="flex flex-col items-center gap-2 pb-10">
          <p className="text-[10px] text-text-secondary/30 font-bold uppercase tracking-[0.6em] font-display">Synapse Intelligence Protocol</p>
          <p className="text-[10px] text-brand-primary/40 font-mono font-bold tracking-widest">BUILD_REF_V1.0.4_BETA</p>
        </div>
      </div>
    </motion.div>
  );
}

function BiometricTile({ label, value, icon, onClick, color = "text-text-secondary" }: { label: string, value: any, icon: React.ReactNode, onClick: () => void, color?: string }) {
  return (
    <div 
      onClick={onClick}
      className="bg-bg-secondary p-6 rounded-[2rem] border border-border-color transition-all hover:bg-bg-card hover:border-brand-primary/30 hover:shadow-md cursor-pointer group shadow-inner"
    >
      <div className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${color} group-hover:text-brand-primary transition-colors font-display`}>
        {icon} {label}
      </div>
      <p className="text-xl font-bold text-text-primary truncate tracking-tight font-display uppercase">{value || '--'}</p>
    </div>
  );
}
