import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ChevronLeft, User, Activity, Target, Save, Loader2, Weight, Ruler, Shield, Bell, Check, Mail, Database } from 'lucide-react';
import Logo from './Logo';

export default function Settings() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male',
    goal: 'stay fit',
    activity_level: 'beginner',
    units: 'metric',
    goalCalories: 600,
    weight: '',
    height: '',
    privacy_public: true,
    privacy_sync: true,
    notifications_push: true,
    notifications_email: false,
    reown_project_id: ''
  });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setProfile(data);
        setFormData({
          name: data.name || '',
          age: data.age?.toString() || '',
          gender: data.gender || 'male',
          goal: data.goal || 'stay fit',
          activity_level: data.activity_level || 'beginner',
          units: data.units || 'metric',
          goalCalories: data.goalCalories || 600,
          weight: data.weight?.toString() || '',
          height: data.height?.toString() || '',
          privacy_public: data.privacy_public !== false,
          privacy_sync: data.privacy_sync !== false,
          notifications_push: data.notifications_push !== false,
          notifications_email: !!data.notifications_email,
          reown_project_id: data.reown_project_id || ''
        });
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    });
    return unsub;
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        age: parseInt(formData.age) || 0,
        gender: formData.gender,
        goal: formData.goal,
        activity_level: formData.activity_level,
        units: formData.units,
        goalCalories: formData.goalCalories,
        weight: parseFloat(formData.weight) || 0,
        height: parseFloat(formData.height) || 0,
        privacy_public: formData.privacy_public,
        privacy_sync: formData.privacy_sync,
        notifications_push: formData.notifications_push,
        notifications_email: formData.notifications_email,
        reown_project_id: formData.reown_project_id
      });
      
      // If project ID changed, notify user they may need to refresh
      if (formData.reown_project_id !== profile?.reown_project_id) {
        addNotification('info', 'Infrastructure Updated', 'Web3 parameters updated. System restart may be required.');
      } else {
        addNotification('success', 'System Updated', 'Synapse parameters have been successfully recalibrated.');
      }
      navigate(-1);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-[var(--bg-primary)] pb-32">
      <header className="p-6 pt-12 flex items-center justify-between sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md z-10">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-black italic uppercase tracking-tighter">System Settings</h1>
        <div className="w-10" />
      </header>

      <main className="p-6 space-y-8 max-w-lg mx-auto">
        {/* Personal Metrics */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <User size={14} className="text-accent" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Personal Metrics</h2>
          </div>
          
          <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)] p-6 space-y-6">
            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-600 ml-1 mb-2 block">Display Name</span>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-black italic uppercase tracking-tighter text-white focus:border-accent outline-none transition-colors"
                placeholder="Elite Athlete"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-600 ml-1 mb-2 block">Age</span>
                <input 
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-black italic uppercase tracking-tighter text-white focus:border-accent outline-none text-center transition-colors"
                  placeholder="25"
                />
              </label>

              <label className="block">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-600 ml-1 mb-2 block">Gender</span>
                <select 
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-black italic uppercase tracking-tighter text-white focus:border-accent outline-none text-center appearance-none cursor-pointer transition-colors"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-600 ml-1 mb-2 block">Weight ({formData.units === 'metric' ? 'KG' : 'LB'})</span>
                <input 
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: e.target.value})}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-black italic uppercase tracking-tighter text-white focus:border-accent outline-none text-center transition-colors"
                  placeholder="70"
                />
              </label>

              <label className="block">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-600 ml-1 mb-2 block">Height ({formData.units === 'metric' ? 'CM' : 'IN'})</span>
                <input 
                  type="number"
                  step="0.1"
                  value={formData.height}
                  onChange={(e) => setFormData({...formData, height: e.target.value})}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-black italic uppercase tracking-tighter text-white focus:border-accent outline-none text-center transition-colors"
                  placeholder="175"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Synapse Parameters */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Target size={14} className="text-blue-400" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Synapse Parameters</h2>
          </div>

          <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)] p-6 space-y-6">
            <div>
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-600 ml-1 mb-3 block">Primary Goal</span>
              <div className="grid grid-cols-1 gap-2">
                {['lose weight', 'build muscle', 'stay fit'].map((goal) => (
                  <button
                    key={goal}
                    onClick={() => setFormData({...formData, goal})}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      formData.goal === goal 
                        ? 'bg-accent/10 border-accent text-accent' 
                        : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-gray-500'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase italic tracking-widest">{goal}</span>
                    {formData.goal === goal && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-600 ml-1 mb-3 block">Activity Intensity</span>
              <div className="grid grid-cols-3 gap-2">
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setFormData({...formData, activity_level: level})}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                      formData.activity_level === level 
                        ? 'bg-blue-400/10 border-blue-400 text-blue-400' 
                        : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-gray-500'
                    }`}
                  >
                    <Activity size={16} />
                    <span className="text-[7px] font-black uppercase tracking-tighter">{level}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Global Units */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Ruler size={14} className="text-purple-400" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Global Units</h2>
          </div>

          <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)] p-6">
            <div className="flex p-1 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)]">
              <button 
                onClick={() => setFormData({...formData, units: 'metric'})}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  formData.units === 'metric' ? 'bg-accent text-black shadow-lg' : 'text-gray-500'
                }`}
              >
                Metric (KG/CM)
              </button>
              <button 
                onClick={() => setFormData({...formData, units: 'imperial'})}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  formData.units === 'imperial' ? 'bg-accent text-black shadow-lg' : 'text-gray-500'
                }`}
              >
                Imperial (LB/IN)
              </button>
            </div>
          </div>
        </section>

        {/* Daily Energy Goal */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Weight size={14} className="text-orange-500" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Daily Energy Goal</h2>
          </div>

          <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)] p-6">
            <div className="text-center mb-4">
              <span className="text-4xl font-black italic text-accent">{formData.goalCalories}</span>
              <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest ml-2">KCAL / Day</span>
            </div>
            <input 
              type="range"
              min="500"
              max="5000"
              step="50"
              value={formData.goalCalories}
              onChange={(e) => setFormData({...formData, goalCalories: parseInt(e.target.value)})}
              className="w-full h-1 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <div className="flex justify-between mt-2 px-1">
              <span className="text-[7px] text-gray-700 font-bold">500 KCAL</span>
              <span className="text-[7px] text-gray-700 font-bold">5000 KCAL</span>
            </div>
          </div>
        </section>

        {/* Security & Privacy */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Shield size={14} className="text-green-400" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Privacy Protocol</h2>
          </div>

          <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)] overflow-hidden divide-y divide-[var(--border-color)]">
            <button 
              onClick={() => setFormData({...formData, privacy_public: !formData.privacy_public})}
              className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
            >
              <div className="text-left">
                <span className="text-[10px] font-black uppercase italic tracking-widest text-white block">Public Profile</span>
                <span className="text-[7px] text-gray-600 font-bold uppercase tracking-widest">Allow others to see your synapse progress</span>
              </div>
              <div className={`w-10 h-5 rounded-full p-1 transition-colors ${formData.privacy_public ? 'bg-accent' : 'bg-gray-800'}`}>
                <motion.div animate={{ x: formData.privacy_public ? 20 : 0 }} className="w-3 h-3 bg-white rounded-full" />
              </div>
            </button>

            <button 
              type="button"
              onClick={() => setFormData({...formData, privacy_sync: !formData.privacy_sync})}
              className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
            >
              <div className="text-left">
                <span className="text-[10px] font-black uppercase italic tracking-widest text-white block">System Sync</span>
                <span className="text-[7px] text-gray-600 font-bold uppercase tracking-widest">Share data with centralized fitness core</span>
              </div>
              <div className={`w-10 h-5 rounded-full p-1 transition-colors ${formData.privacy_sync ? 'bg-accent' : 'bg-gray-800'}`}>
                <motion.div animate={{ x: formData.privacy_sync ? 20 : 0 }} className="w-3 h-3 bg-white rounded-full" />
              </div>
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Bell size={14} className="text-yellow-400" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Notification Protocol</h2>
          </div>

          <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)] overflow-hidden divide-y divide-[var(--border-color)]">
            <button 
              type="button"
              onClick={() => setFormData({...formData, notifications_push: !formData.notifications_push})}
              className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
            >
              <div className="text-left flex items-center gap-3">
                <div className="w-8 h-8 bg-black/20 rounded-lg flex items-center justify-center text-accent">
                  <Check size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase italic tracking-widest text-white block">Push Alerts</span>
                  <span className="text-[7px] text-gray-600 font-bold uppercase tracking-widest">Real-time system updates</span>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full p-1 transition-colors ${formData.notifications_push ? 'bg-accent' : 'bg-gray-800'}`}>
                <motion.div animate={{ x: formData.notifications_push ? 20 : 0 }} className="w-3 h-3 bg-white rounded-full" />
              </div>
            </button>

            <button 
              type="button"
              onClick={() => setFormData({...formData, notifications_email: !formData.notifications_email})}
              className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
            >
              <div className="text-left flex items-center gap-3">
                <div className="w-8 h-8 bg-black/20 rounded-lg flex items-center justify-center text-blue-400">
                  <Mail size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase italic tracking-widest text-white block">Email Reports</span>
                  <span className="text-[7px] text-gray-600 font-bold uppercase tracking-widest">Weekly performance summary</span>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full p-1 transition-colors ${formData.notifications_email ? 'bg-accent' : 'bg-gray-800'}`}>
                <motion.div animate={{ x: formData.notifications_email ? 20 : 0 }} className="w-3 h-3 bg-white rounded-full" />
              </div>
            </button>
          </div>
        </section>

        {/* Web3 Infrastructure */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Database size={14} className="text-purple-400" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Web3 Infrastructure</h2>
          </div>

          <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)] p-6 space-y-4">
            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-600 ml-1 mb-2 block">Reown/WalletConnect Project ID</span>
              <input 
                type="text"
                value={formData.reown_project_id}
                onChange={(e) => setFormData({...formData, reown_project_id: e.target.value})}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-xs font-mono text-white focus:border-accent outline-none transition-colors"
                placeholder="Enter Project ID from cloud.reown.com"
              />
              <p className="text-[7px] text-gray-500 mt-2 font-bold uppercase tracking-widest leading-relaxed">
                If you see "Unauthorized: invalid key", provide your own Project ID and ensure your domain is allowlisted in the Reown Cloud dashboard.
              </p>
            </label>
          </div>
        </section>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-accent py-5 rounded-[2.5rem] flex items-center justify-center gap-3 text-black font-black italic uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-accent/20"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Synchronize Settings
        </button>
      </main>
    </div>
  );
}
