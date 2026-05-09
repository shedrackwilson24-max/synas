import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Scale, Heart, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { logSleep, logBodyMetrics, logHeartRate } from '../services/fitnessService';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'sleep' | 'body' | 'hr';
}

export default function LogModal({ isOpen, onClose, type }: LogModalProps) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [inputValue, setInputValue] = useState('');
  const [inputSecondary, setInputSecondary] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !inputValue) return;
    setIsSaving(true);
    try {
      if (type === 'sleep') {
        await logSleep(user.uid, parseFloat(inputValue));
        addNotification('info', 'Sync Complete', `Recorded ${inputValue} hours of sleep.`);
      } else if (type === 'body') {
        await logBodyMetrics(user.uid, parseFloat(inputValue), parseFloat(inputSecondary || '0'));
        addNotification('info', 'Metrics Updated', 'Body composition successfully synchronized.');
      } else if (type === 'hr') {
        await logHeartRate(user.uid, parseInt(inputValue));
        addNotification('info', 'Reading Captured', 'Resting heart rate integrated.');
      }
      onClose();
      setInputValue('');
      setInputSecondary('');
    } catch (err) {
      addNotification('reminder', 'Sync Error', 'Failed to synchronize data.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="w-full max-w-md bg-bg-primary rounded-[3.5rem] p-10 shadow-2xl border border-border-color relative"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 w-12 h-12 bg-bg-secondary rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary transition-all border border-border-color"
            >
              <X size={24} />
            </button>

            <div className="flex items-center gap-5 mb-10">
              <div className="w-16 h-16 bg-bg-secondary rounded-2xl flex items-center justify-center text-brand-primary shadow-inner">
                {type === 'sleep' ? <Moon size={32} /> : type === 'body' ? <Scale size={32} /> : <Heart size={32} />}
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-text-primary font-display uppercase">
                  {type === 'sleep' ? 'Sleep Sync' : type === 'body' ? 'Metric Calibration' : 'Vital Capture'}
                </h3>
                <p className="text-[10px] text-brand-primary font-bold uppercase tracking-[0.2em] mt-1 font-display">Neural Input</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em] mb-4 block px-1 font-display">
                  {type === 'sleep' ? 'Temporal Duration (Hours)' : type === 'body' ? 'Mass Density (kg)' : 'Resting Frequency (BPM)'}
                </label>
                <input 
                  type="number"
                  step={type === 'hr' ? "1" : "0.1"}
                  placeholder="0.0"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  className="w-full bg-bg-secondary border border-border-color rounded-3xl px-8 py-6 text-4xl font-bold text-text-primary placeholder:text-text-secondary/20 focus:border-brand-primary outline-none transition-all font-display shadow-inner"
                  autoFocus
                />
              </div>

              {type === 'body' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em] mb-4 block px-1 font-display">
                    Adipose Ratio (%)
                  </label>
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={inputSecondary}
                    onChange={e => setInputSecondary(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-color rounded-3xl px-8 py-6 text-4xl font-bold text-text-primary placeholder:text-text-secondary/20 focus:border-brand-primary outline-none transition-all font-display shadow-inner"
                  />
                </motion.div>
              )}

              <button 
                onClick={handleSave}
                disabled={isSaving || !inputValue}
                className="w-full bg-text-primary hover:scale-[1.02] py-6 rounded-3xl flex items-center justify-center text-bg-primary font-bold tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 mt-6 shadow-xl font-display uppercase text-xs"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={20} /> : 'Finalize Session'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
