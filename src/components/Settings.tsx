import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronLeft, User, Activity, Target, Save, Loader2, Weight, Ruler, Shield, Bell, Check, Mail, Database, Scale, MessageSquare, Sun, Moon, Zap, Apple, Activity as ActivityIcon, Globe } from 'lucide-react';
import DataManagement from './DataManagement';
import FeedbackModal from './FeedbackModal';

import { integrationService, IntegrationState } from '../services/integrationService';
import { garminService } from '../services/garminService';
import { appleHealthService } from '../services/appleHealthService';
import { googleFitService } from '../services/googleFitService';

export default function Settings() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [integrations, setIntegrations] = useState<IntegrationState | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return integrationService.subscribeToIntegrations(user.uid, setIntegrations);
  }, [user]);

  const handleToggleIntegration = async (provider: 'googleFit' | 'appleHealth' | 'garmin') => {
    if (!user || !integrations) return;
    
    const isCurrentlyEnabled = integrations[provider];
    
    if (!isCurrentlyEnabled) {
      setSyncingProvider(provider);
      try {
        if (provider === 'googleFit') {
          const success = await googleFitService.authorize();
          if (success) await integrationService.updateIntegration(user.uid, provider, true);
        } else if (provider === 'garmin') {
          await garminService.initiateAuth();
          // The callback will handle the state update via postMessage or we can poll
        } else if (provider === 'appleHealth') {
          const available = await appleHealthService.isAvailable();
          if (available || confirm('Apple Health is best used on iOS. Proceed with simulation?')) {
            await appleHealthService.syncData(user.uid);
            await integrationService.updateIntegration(user.uid, provider, true);
          }
        }
        addNotification(
          'success',
          'Neural Link Established',
          `${provider.charAt(0).toUpperCase() + provider.slice(1)} is now feeding data to your Synapse.`
        );
      } catch (err: any) {
        addNotification(
          'info',
          'Linkage Failed',
          err.message || 'Verification timed out.'
        );
      } finally {
        setSyncingProvider(null);
      }
    } else {
      await integrationService.updateIntegration(user.uid, provider, false);
    }
  };

  // Add listener for OAuth success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && user) {
        const provider = event.data.provider as any;
        if (provider === 'garmin') {
          integrationService.updateIntegration(user.uid, 'garmin', true);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
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
        reown_project_id: formData.reown_project_id,
        updatedAt: serverTimestamp()
      });
      
      addNotification('success', 'Changes Saved', 'Your health parameters have been recalibrated.');
      navigate(-1);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-bg-primary pb-32">
      <header className="px-6 py-12 flex items-center justify-between sticky top-0 bg-bg-primary/80 backdrop-blur-xl z-20">
        <button 
          onClick={() => navigate(-1)}
          className="w-12 h-12 bg-bg-card rounded-2xl flex items-center justify-center text-text-secondary hover:text-text-primary border border-border-color shadow-sm transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-text-primary font-display uppercase">System Parameters</h1>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-12 h-12 bg-text-primary rounded-2xl flex items-center justify-center text-bg-primary shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
        </button>
      </header>

      <main className="px-6 space-y-10 max-w-xl mx-auto">
        {/* Profile Metrics */}
        <section className="space-y-6">
          <SectionHeader icon={<User size={16} className="text-brand-vibrant" />} title="Profile Metrics" />
          
          <div className="bg-bg-card rounded-[2.5rem] border border-border-color p-8 space-y-8 shadow-sm">
            <FormInput label="Full Name" value={formData.name} onChange={(val) => setFormData({...formData, name: val})} placeholder="Elite User" />

            <div className="grid grid-cols-2 gap-6">
              <FormInput label="Age" type="number" value={formData.age} onChange={(val) => setFormData({...formData, age: val})} placeholder="25" center />
              <FormSelect 
                label="Gender" 
                value={formData.gender} 
                onChange={(val) => setFormData({...formData, gender: val})}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' }
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <FormInput 
                label={`Weight (${formData.units === 'metric' ? 'kg' : 'lb'})`} 
                type="number"
                value={formData.weight} 
                onChange={(val) => setFormData({...formData, weight: val})} 
                placeholder="70" 
                center 
              />
              <FormInput 
                label={`Height (${formData.units === 'metric' ? 'cm' : 'in'})`} 
                type="number"
                value={formData.height} 
                onChange={(val) => setFormData({...formData, height: val})} 
                placeholder="175" 
                center 
              />
            </div>
          </div>
        </section>

        {/* Synapse Parameters */}
        <section className="space-y-6">
          <SectionHeader icon={<Target size={16} className="text-brand-primary" />} title="Synapse Parameters" />

          <div className="bg-bg-card rounded-[2.5rem] border border-border-color p-8 space-y-8 shadow-sm">
            <div>
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-4 block font-display">Strategic Goal</span>
              <div className="grid grid-cols-1 gap-3">
                {['lose weight', 'build muscle', 'stay fit'].map((goal) => (
                  <button
                    key={goal}
                    onClick={() => setFormData({...formData, goal})}
                    className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                      formData.goal === goal 
                        ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-sm' 
                        : 'bg-bg-secondary border-border-color text-text-secondary opacity-60'
                    }`}
                  >
                    <span className="text-sm font-bold capitalize font-display">{goal}</span>
                    <div className={`w-5 h-5 rounded-full border-2 p-1 transition-all ${formData.goal === goal ? 'border-brand-primary' : 'border-border-color'}`}>
                      {formData.goal === goal && <div className="w-full h-full bg-brand-primary rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-4 block font-display">Training Intensity</span>
              <div className="grid grid-cols-3 gap-3">
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setFormData({...formData, activity_level: level})}
                    className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all ${
                      formData.activity_level === level 
                        ? 'bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan shadow-sm' 
                        : 'bg-bg-secondary border-border-color text-text-secondary opacity-60'
                    }`}
                  >
                    <Activity size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-tight font-display">{level}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Global Units */}
        <section className="space-y-6">
          <SectionHeader icon={<Ruler size={16} className="text-brand-vibrant" />} title="Measurement Standard" />

          <div className="bg-bg-card rounded-[2.5rem] border border-border-color p-8 shadow-sm">
            <div className="flex p-1.5 bg-bg-secondary rounded-[1.5rem] border border-border-color">
              <button 
                onClick={() => setFormData({...formData, units: 'metric'})}
                className={`flex-1 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all font-display ${
                  formData.units === 'metric' ? 'bg-bg-card text-text-primary shadow-md border border-border-color' : 'text-text-secondary'
                }`}
              >
                Metric
              </button>
              <button 
                onClick={() => setFormData({...formData, units: 'imperial'})}
                className={`flex-1 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all font-display ${
                  formData.units === 'imperial' ? 'bg-bg-card text-text-primary shadow-md border border-border-color' : 'text-text-secondary'
                }`}
              >
                Imperial
              </button>
            </div>
          </div>
        </section>

        {/* Daily Calorie Goal */}
        <section className="space-y-6">
          <SectionHeader icon={<Scale size={16} className="text-brand-cyan" />} title="Metabolic Control" />

          <div className="bg-bg-card rounded-[2.5rem] border border-border-color p-10 shadow-sm text-center">
            <div className="mb-8">
              <span className="text-5xl font-bold tracking-tighter text-text-primary font-display">{formData.goalCalories}</span>
              <span className="text-sm text-text-secondary font-bold uppercase tracking-widest ml-3 font-display">Kcal / Day</span>
            </div>
            <input 
              type="range"
              min="500"
              max="5000"
              step="50"
              value={formData.goalCalories}
              onChange={(e) => setFormData({...formData, goalCalories: parseInt(e.target.value)})}
              className="w-full h-2 bg-bg-secondary rounded-full appearance-none cursor-pointer accent-brand-primary"
            />
            <div className="flex justify-between mt-4 px-1 text-[10px] text-text-secondary font-bold uppercase tracking-widest font-display">
              <span>Low Energy</span>
              <span>High Performance</span>
            </div>
          </div>
        </section>

        {/* Neural Linkage */}
        <section className="space-y-6">
          <SectionHeader icon={<Zap size={16} className="text-brand-primary" />} title="Neural Linkage" />
          
          <div className="bg-bg-card rounded-[2.5rem] border border-border-color p-8 lg:p-10 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <IntegrationTile 
                name="Apple Health" 
                icon={<Apple size={20} className="text-rose-500" />}
                isConnected={integrations?.appleHealth || false}
                isLoading={syncingProvider === 'appleHealth'}
                onToggle={() => handleToggleIntegration('appleHealth')}
                description="Sync steps, HRV, and sleep from your Neural device."
              />
              <IntegrationTile 
                name="Garmin Connect" 
                icon={<ActivityIcon size={20} className="text-brand-primary" />}
                isConnected={integrations?.garmin || false}
                isLoading={syncingProvider === 'garmin'}
                onToggle={() => handleToggleIntegration('garmin')}
                description="Import high-fidelity endurance datasets."
              />
              <IntegrationTile 
                name="Google Fit" 
                icon={<ActivityIcon size={20} className="text-brand-cyan" />}
                isConnected={integrations?.googleFit || false}
                isLoading={syncingProvider === 'googleFit'}
                onToggle={() => handleToggleIntegration('googleFit')}
                description="Integrate Android-native health datasets."
              />
            </div>
          </div>
        </section>

        {/* Security & Notifications */}
        <section className="space-y-6">
          <SectionHeader icon={<Shield size={16} className="text-text-secondary" />} title="System Protocols" />
          
          <div className="bg-bg-card rounded-[2.5rem] border border-border-color overflow-hidden shadow-sm divide-y divide-border-color">
            <ToggleItem 
              label="Visual Interface" 
              sublabel={`Switch to ${isDark ? 'Light' : 'Dark'} mode for visual comfort`}
              icon={isDark ? <Moon size={20} /> : <Sun size={20} />}
              enabled={isDark}
              onToggle={toggleTheme}
              color={isDark ? "text-brand-primary" : "text-amber-500"}
            />
            <ToggleItem 
              label="Neural Anonymization" 
              sublabel="Enable anonymized data sharing for strategic research & monetization pooling"
              icon={<Shield size={20} />}
              enabled={formData.privacy_public}
              onToggle={() => setFormData({...formData, privacy_public: !formData.privacy_public})}
              color="text-brand-primary"
            />
            <ToggleItem 
              label="Real-time Synchronization" 
              sublabel="Sync biometric data with central Synapse infrastructure"
              icon={<Database size={20} />}
              enabled={formData.privacy_sync}
              onToggle={() => setFormData({...formData, privacy_sync: !formData.privacy_sync})}
              color="text-brand-vibrant"
            />
            <ToggleItem 
              label="Synapse Health Alerts" 
              sublabel="Critical biometric notifications and training reminders"
              icon={<Bell size={20} />}
              enabled={formData.notifications_push}
              onToggle={() => setFormData({...formData, notifications_push: !formData.notifications_push})}
              color="text-brand-cyan"
            />
          </div>
        </section>

        {/* Global Protocol Config */}
        <section className="space-y-6">
          <SectionHeader icon={<Globe size={16} className="text-brand-primary" />} title="Web3 Protocol Config" />
          <div className="bg-bg-card rounded-[2.5rem] border border-border-color p-8 shadow-sm">
            <FormInput 
              label="Reown Project ID" 
              value={formData.reown_project_id} 
              onChange={(val) => setFormData({...formData, reown_project_id: val})} 
              placeholder="Enter your cloud.reown.com Project ID" 
            />
            <p className="text-[10px] text-text-secondary font-medium mt-4 px-2 leading-relaxed italic">
              * Required for stable neural link connections on custom domains. Default will be used if provided ID is null.
            </p>
          </div>
        </section>

        {/* Data Architecture */}
        <DataManagement />

        {/* Feedback Trigger */}
        <section 
          className="neural-gradient rounded-[2.5rem] p-10 text-white shadow-xl shadow-brand-primary/10 relative overflow-hidden group cursor-pointer" 
          onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfsVYblctRCn8DB9brbl5aaSVgNMi1TmNTlqmkbRtkjD0vAIw/viewform', '_blank')}
        >
            <div className="relative z-10">
                <h3 className="text-xl font-bold tracking-tight mb-2 font-display uppercase text-white">Help Evolve Synapse</h3>
                <p className="text-xs font-medium text-white/80 leading-relaxed mb-6 font-display">Share your platform preferences and feature requests directly with the development hive.</p>
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest bg-white/20 w-fit px-4 py-2 rounded-xl backdrop-blur-md font-display">
                    <MessageSquare size={14} /> Open Hive Intelligence Form
                </div>
            </div>
            <Activity className="absolute -bottom-6 -right-6 text-white/10 rotate-12 group-hover:scale-110 transition-transform" size={120} />
        </section>

        <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />

        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-text-primary py-6 rounded-[2rem] flex items-center justify-center gap-3 text-bg-primary font-bold tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-2xl shadow-brand-primary/5 uppercase font-display"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Apply Parameters
        </button>
      </main>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="w-10 h-10 rounded-xl bg-bg-card border border-border-color flex items-center justify-center shadow-sm text-text-primary">
        {icon}
      </div>
      <h2 className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.4em] font-display">{title}</h2>
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, type = "text", center = false }: { label: string, value: any, onChange: (val: string) => void, placeholder: string, type?: string, center?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-3 ml-2 block font-display">{label}</span>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-bg-secondary border border-border-color rounded-2xl p-5 text-sm font-bold text-text-primary focus:bg-bg-card focus:border-brand-primary focus:shadow-md outline-none transition-all font-display ${center ? 'text-center' : ''}`}
        placeholder={placeholder}
      />
    </label>
  );
}

function FormSelect({ label, value, onChange, options }: { label: string, value: string, onChange: (val: string) => void, options: { value: string, label: string }[] }) {
  return (
    <label className="block">
      <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-3 ml-2 block font-display">{label}</span>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg-secondary border border-border-color rounded-2xl p-5 text-sm font-bold text-text-primary focus:bg-bg-card focus:border-brand-primary focus:shadow-md outline-none transition-all appearance-none cursor-pointer text-center font-display"
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  );
}

function ToggleItem({ label, sublabel, icon, enabled, onToggle, color }: { label: string, sublabel: string, icon: React.ReactNode, enabled: boolean, onToggle: () => void, color: string }) {
  return (
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-7 hover:bg-bg-secondary transition-all text-left"
    >
      <div className="flex items-center gap-5">
        <div className={`w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center ${color} shadow-inner`}>
          {icon}
        </div>
        <div>
          <span className="text-sm font-bold text-text-primary block tracking-tight font-display">{label}</span>
          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1 block max-w-[200px] leading-relaxed font-display">{sublabel}</span>
        </div>
      </div>
      <div className={`w-12 h-7 rounded-full p-1 transition-all ${enabled ? 'neural-gradient shadow-inner' : 'bg-bg-secondary border border-border-color'}`}>
        <motion.div animate={{ x: enabled ? 20 : 0 }} className="w-5 h-5 bg-white rounded-full shadow-sm" />
      </div>
    </button>
  );
}

function IntegrationTile({ name, icon, isConnected, isLoading, onToggle, description }: { name: string, icon: React.ReactNode, isConnected: boolean, isLoading: boolean, onToggle: () => void, description: string }) {
  return (
    <div className="bg-bg-secondary/50 p-6 rounded-[2rem] border border-border-color hover:border-brand-primary/30 transition-all flex flex-col justify-between group shadow-inner">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-bg-card rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div 
          onClick={onToggle}
          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] cursor-pointer transition-all font-display ${
            isConnected 
              ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
              : 'bg-bg-card text-text-secondary border border-border-color hover:border-text-secondary/30'
          }`}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={12} />
          ) : isConnected ? (
            <div className="flex items-center gap-1.5"><Check size={10} strokeWidth={4} /> Linked</div>
          ) : (
            'Connect'
          )}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-bold text-text-primary mb-2 font-display uppercase">{name}</h4>
        <p className="text-[10px] text-text-secondary leading-relaxed font-medium font-display">{description}</p>
      </div>
    </div>
  );
}
