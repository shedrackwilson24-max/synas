import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Smartphone, Database, Zap, Star, RefreshCw } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

export default function FeedbackModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rating: 5,
    devices: '',
    mostValuableData: '',
    desiredFeatures: '',
    comments: '',
    telegram: '',
    x_username: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        ...formData,
        userId: user.uid,
        userEmail: user.email,
        timestamp: serverTimestamp()
      });
      addNotification('success', 'Transmission Received', 'Strategic feedback integrated into our development roadmap.');
      onClose();
    } catch (err) {
      addNotification('reminder', 'Transmission Failed', 'Unable to synchronize feedback with HQ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-lg bg-bg-primary rounded-[3rem] shadow-2xl overflow-hidden relative border border-border-color"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 border-b border-border-color flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center text-brand-primary">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-text-primary font-display uppercase">Synapse Intelligence</h3>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5 font-display">Help us evolve the protocol</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-bg-secondary rounded-xl flex items-center justify-center text-text-secondary hover:text-rose-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-10 pt-8 pb-0">
                <button 
                  onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfsVYblctRCn8DB9brbl5aaSVgNMi1TmNTlqmkbRtkjD0vAIw/viewform', '_blank')}
                  className="w-full bg-brand-primary/10 border border-brand-primary/30 p-4 rounded-2xl flex items-center justify-between group hover:bg-brand-primary/20 transition-all"
                >
                    <div className="text-left">
                        <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Development Hive</span>
                        <span className="text-xs font-medium text-text-primary">Evolve Synapse via Google Forms</span>
                    </div>
                    <Zap size={16} className="text-brand-primary group-hover:scale-110 transition-transform" />
                </button>
                <div className="flex items-center gap-4 my-6">
                    <div className="h-px bg-border-color flex-1" />
                    <span className="text-[8px] font-bold text-text-secondary uppercase tracking-[0.3em]">OR USE LOCAL SYSTEM</span>
                    <div className="h-px bg-border-color flex-1" />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-10 pt-0 space-y-8 max-h-[50vh] overflow-y-auto no-scrollbar">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-4 block px-1 font-display">Initial Experience Rating</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({...formData, rating: star})}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${formData.rating >= star ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm' : 'bg-bg-secondary text-text-secondary border border-border-color'}`}
                      >
                        <Star size={20} fill={formData.rating >= star ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput 
                  label="Platforms Used" 
                  icon={<Smartphone size={14} />} 
                  placeholder="Garmin, Apple Health, Oura..." 
                  value={formData.devices}
                  onChange={v => setFormData({...formData, devices: v})}
                />
                <FormInput 
                  label="Critical Data" 
                  icon={<Database size={14} />} 
                  placeholder="HRV, Sleep, V02 Max..." 
                  value={formData.mostValuableData}
                  onChange={v => setFormData({...formData, mostValuableData: v})}
                />
              </div>

              <FormTextarea 
                label="Desired Architecture" 
                icon={<Zap size={14} />} 
                placeholder="What parameters or features would elevate your performance?" 
                value={formData.desiredFeatures}
                onChange={v => setFormData({...formData, desiredFeatures: v})}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput 
                  label="Telegram Handle" 
                  placeholder="@username" 
                  value={formData.telegram}
                  onChange={v => setFormData({...formData, telegram: v})}
                />
                <FormInput 
                  label="X / Twitter" 
                  placeholder="@handle" 
                  value={formData.x_username}
                  onChange={v => setFormData({...formData, x_username: v})}
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-text-primary hover:bg-text-secondary py-6 rounded-2xl flex items-center justify-center gap-3 text-bg-primary font-bold tracking-tight transition-all active:scale-95 disabled:opacity-50 shadow-xl font-display uppercase"
              >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <Send size={18} />}
                Transmit Intelligence
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FormInput({ label, icon, placeholder, value, onChange }: { label: string, icon?: React.ReactNode, placeholder: string, value: string, onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-3 ml-2 flex items-center gap-2 font-display">
        {icon} {label}
      </span>
      <input 
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-secondary border border-border-color rounded-2xl px-5 py-4 text-sm font-bold text-text-primary focus:bg-bg-card focus:border-brand-primary outline-none transition-all font-display"
      />
    </label>
  );
}

function FormTextarea({ label, icon, placeholder, value, onChange }: { label: string, icon?: React.ReactNode, placeholder: string, value: string, onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-3 ml-2 flex items-center gap-2 font-display">
        {icon} {label}
      </span>
      <textarea 
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-secondary border border-border-color rounded-2xl px-5 py-4 text-sm font-bold text-text-primary focus:bg-bg-card focus:border-brand-primary outline-none transition-all resize-none font-display"
      />
    </label>
  );
}
