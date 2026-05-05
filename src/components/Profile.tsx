import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Settings, Shield, Bell, LogOut, ChevronRight, Edit2, CreditCard, Loader2, Camera, Minus, Plus, Zap, Moon, Sun, Trophy, Calendar as CalendarIcon, Weight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import ImageUploadModal from './ImageUploadModal';
import { useTheme } from '../contexts/ThemeContext';
import { getPersonalBests } from '../services/fitnessService';
import Skeleton from './ui/Skeleton';
import { Wallet } from 'lucide-react';

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
      whileTap={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      className="w-full flex items-center justify-between p-6 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">{icon}</div>
        <div className="text-left">
          <span className="font-black italic uppercase tracking-tighter text-[var(--text-primary)] block">{label}</span>
          <span className="text-[7px] text-gray-600 font-bold uppercase tracking-widest">
            {settingKey ? (active ? 'Status: Active' : 'Status: Restricted') : 'Sync Protocol Active'}
          </span>
        </div>
      </div>
      {settingKey ? (
        <div className={`w-10 h-5 rounded-full p-1 transition-colors ${active ? 'bg-accent' : 'bg-gray-800'}`}>
          <motion.div 
            animate={{ x: active ? 20 : 0 }}
            className="w-3 h-3 bg-white rounded-full"
          />
        </div>
      ) : (
        <ChevronRight size={18} className="text-gray-700 group-hover:translate-x-1 transition-transform" />
      )}
    </motion.button>
  );
};

export default function Profile() {
  const { user, logout } = useAuth();
  const { requestPushPermissions, addNotification } = useNotifications();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bestsLoading, setBestsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [personalBests, setPersonalBests] = useState<any[]>([]);
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);
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
          if (result.length > 1000000) {
            reject(new Error('Synapse profile data too large (Exceeds 1MB sync limit). Try a smaller crop.'));
          } else {
            resolve(result);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read binary data.'));
        reader.readAsDataURL(croppedBlob);
      });

      const finalPhotoURL = await base64Promise;
      
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: finalPhotoURL,
        updatedAt: serverTimestamp()
      });
      
      addNotification('success', 'Profile Updated', 'Your avatar has been successfully recalibrated.');
    } catch (err: any) {
      console.error('Final Sync Error:', err);
      const errorMessage = err.message || 'Failed to upload profile data to synapse core.';
      addNotification('reminder', 'Sync Failed', errorMessage);
      if (err.code || err.message?.includes('permission')) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
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
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-32 px-6 pt-12 max-w-lg mx-auto"
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

      <header className="text-center mb-10">
        <div className="relative inline-block mb-6 group">
          <div className="w-32 h-32 bg-gradient-to-br from-accent via-blue-500 to-purple-600 rounded-[2.5rem] p-1 shadow-2xl shadow-accent/20">
            <div className="w-full h-full bg-[var(--bg-primary)] rounded-[2.3rem] flex items-center justify-center overflow-hidden relative">
              {uploading ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-sm">
                  <Loader2 className="animate-spin text-accent" size={24} />
                </div>
              ) : null}
              <img 
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Camera className="text-white" size={24} />
              </div>
            </div>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1 right-1 w-10 h-10 bg-accent rounded-full flex items-center justify-center border-4 border-[var(--bg-primary)] text-black shadow-lg hover:scale-110 transition-transform active:scale-95"
          >
            <Edit2 size={14} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        <div className="flex items-center justify-center gap-2 group cursor-pointer mb-1" onClick={() => navigate('/settings')}>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white group-hover:text-accent transition-colors">{profile?.name || 'Elite Athlete'}</h1>
          <Edit2 size={14} className="text-gray-700 opacity-0 group-hover:opacity-100 transition-all" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{profile?.activity_level || 'Synapse-Prime'} Level</p>
        </div>
      </header>

      <section className="mb-8">
        <div className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] overflow-hidden shadow-xl">
          <button 
            onClick={() => setIsMetricsExpanded(!isMetricsExpanded)}
            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                <User size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black italic uppercase tracking-tighter">Biometric Data</h2>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Protocol Metrics & Goals</p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: isMetricsExpanded ? 90 : 0 }}
              className="text-gray-700"
            >
              <ChevronRight size={20} />
            </motion.div>
          </button>

          <AnimatePresence>
            {isMetricsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="p-6 pt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => navigate('/settings')}
                      className="bg-[var(--bg-secondary)] p-4 rounded-3xl border border-white/5 text-center transition-all hover:border-accent/30 active:scale-95 cursor-pointer"
                    >
                      <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Age Profile</p>
                      <p className="text-xl font-black italic text-accent">{profile?.age || '--'}</p>
                    </div>
                    <div 
                      onClick={() => navigate('/settings')}
                      className="bg-[var(--bg-secondary)] p-4 rounded-3xl border border-white/5 text-center transition-all hover:border-accent/30 active:scale-95 cursor-pointer"
                    >
                      <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Gender Node</p>
                      <p className="text-[10px] font-black italic text-purple-400 uppercase truncate text-center">{profile?.gender || '--'}</p>
                    </div>
                    <div 
                      onClick={() => navigate('/settings')}
                      className="bg-[var(--bg-secondary)] p-4 rounded-3xl border border-white/5 text-center transition-all hover:border-accent/30 active:scale-95 cursor-pointer"
                    >
                      <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Target Goal</p>
                      <p className="text-[10px] font-black italic text-blue-400 uppercase truncate text-center">{profile?.goal || '--'}</p>
                    </div>
                    <div 
                      onClick={() => navigate('/settings')}
                      className="bg-[var(--bg-secondary)] p-4 rounded-3xl border border-white/5 text-center transition-all hover:border-accent/30 active:scale-95 cursor-pointer"
                    >
                      <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Intensity Level</p>
                      <p className="text-[10px] font-black italic text-accent uppercase truncate text-center">{profile?.activity_level || 'Synapse-Prime'}</p>
                    </div>
                  </div>
                  
                  <div className="bg-[var(--bg-secondary)] p-5 rounded-3xl border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Metabolic Target</p>
                      <div className="text-xl font-black italic text-accent">{profile?.goalCalories || 600} <span className="text-[8px] text-gray-600 not-italic">KCAL</span></div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newGoal = Math.max(100, (profile?.goalCalories || 600) - 50);
                          await updateDoc(doc(db, 'users', user!.uid), { goalCalories: newGoal });
                        }}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-accent transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newGoal = (profile?.goalCalories || 600) + 50;
                          await updateDoc(doc(db, 'users', user!.uid), { goalCalories: newGoal });
                        }}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-accent transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4 px-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Synapse Archive: Personal Bests</h2>
          <Trophy size={14} className="text-accent/40" />
        </div>
        <div className="space-y-3 px-2">
          {bestsLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-[var(--bg-card)] p-5 rounded-[2rem] border border-[var(--border-color)] flex items-center gap-4 shadow-xl">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <div className="flex-1">
                  <Skeleton className="w-24 h-4 mb-2" />
                  <Skeleton className="w-16 h-2" />
                </div>
                <div className="text-right">
                  <Skeleton className="w-10 h-3 mb-1 ml-auto" />
                  <Skeleton className="w-16 h-2 ml-auto" />
                </div>
              </div>
            ))
          ) : personalBests.length > 0 ? (
            personalBests.map((best, i) => (
              <motion.div 
                key={`${best.exerciseName}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-[var(--bg-card)] p-5 rounded-[2rem] border border-[var(--border-color)] flex items-center gap-4 group hover:border-accent/30 transition-all"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                  <Weight size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black italic uppercase tracking-tighter text-white group-hover:text-accent transition-colors">{best.exerciseName}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black text-accent">{best.weight}<span className="text-[7px] text-gray-600 ml-0.5 tracking-normal">KG</span></span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{best.reps} Reps</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-gray-600 mb-1">
                    <CalendarIcon size={10} />
                    <span className="text-[7px] font-black uppercase tracking-widest">
                      {best.date?.toDate 
                        ? new Date(best.date.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : best.date ? new Date(best.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                    </span>
                  </div>
                  <div className="text-[7px] text-accent/40 font-black uppercase tracking-widest">Confirmed Record</div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="bg-[var(--bg-card)] p-10 rounded-[2.5rem] border border-dashed border-gray-800 text-center">
              <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest leading-relaxed">
                Initiate heavy protocols to archive synaptic records.<br/>
                No records detected in database.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 px-4">Core Protocols</h2>
        <div className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] overflow-hidden divide-y divide-[var(--border-color)]">
          <ProfileItem 
            icon={isDark ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-yellow-400" />} 
            label={isDark ? "Dark Protocol" : "Light Protocol"} 
            onClick={toggleTheme}
            profile={profile}
            onToggle={toggleSetting}
          />
          <ProfileItem 
            icon={<Settings size={18} className="text-blue-400" />} 
            label="System Settings" 
            onClick={() => navigate('/settings')}
            profile={profile}
            onToggle={toggleSetting}
          />
          <ProfileItem 
            icon={<User size={18} className="text-accent" />} 
            label="Personal Metrics" 
            onClick={() => navigate('/settings')}
            profile={profile}
            onToggle={toggleSetting}
          />
          <ProfileItem 
            icon={<Shield size={18} className="text-green-400" />} 
            label="Privacy Vault" 
            onClick={() => navigate('/settings')}
            profile={profile}
            onToggle={toggleSetting}
          />
          <ProfileItem 
            icon={<Bell size={18} className="text-yellow-400" />} 
            label="Notification Alerts" 
            onClick={() => navigate('/settings')}
            profile={profile}
            onToggle={toggleSetting}
          />
          <ProfileItem 
            icon={<Zap size={18} className="text-accent" />} 
            label="Push Protocol" 
            onClick={requestPushPermissions}
            profile={profile}
            onToggle={toggleSetting}
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 px-4">Financials</h2>
        <div className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] overflow-hidden">
          <ProfileItem 
            icon={<CreditCard size={18} className="text-purple-400" />} 
            label="Synapse Pro Plan" 
            settingKey="pro" 
            profile={profile}
            onToggle={toggleSetting}
          />
        </div>
      </section>

      <button 
        onClick={handleLogout}
        className="w-full bg-red-500/10 border border-red-500/20 py-5 rounded-[2.5rem] flex items-center justify-center gap-3 text-red-500 font-black italic uppercase tracking-widest transition-all active:scale-95 group hover:bg-red-500/20"
      >
        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
        Logout Session
      </button>

      <p className="text-center text-[8px] text-gray-700 font-black uppercase tracking-[0.3em] mt-12">Synapse Protocol v2.6.0</p>
    </motion.div>
  );
}
