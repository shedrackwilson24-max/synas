import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Trophy, Zap, X, Star } from 'lucide-react';
import { useAuth } from './AuthContext';
import { doc, getDoc, onSnapshot, collection, query, where, limit, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, messaging, handleFirestoreError, OperationType } from '../lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';

type NotificationType = 'reminder' | 'milestone' | 'info' | 'success';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: NotificationType, title: string, message: string) => void;
  removeNotification: (id: string) => void;
  requestPushPermissions: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [lastCheck, setLastCheck] = useState<number>(Date.now());

  const addNotification = useCallback((type: NotificationType, title: string, message: string) => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, type, title, message, timestamp: Date.now() }]);
    
    // Auto-remove after 8 seconds for push-like persistence
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 8000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const requestPushPermissions = useCallback(async () => {
    if (!messaging || !user) return;
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.warn('VAPID Key missing in environment.');
          return;
        }

        const token = await getToken(messaging, {
          vapidKey: vapidKey
        });
        
        if (token) {
          await updateDoc(doc(db, 'users', user.uid), {
            fcmTokens: arrayUnion(token),
            pushEnabled: true
          });
          addNotification('success', 'Synapse Link Secured', 'Push notifications are now active for your synaptic node.');
        }
      }
    } catch (err) {
      console.error('FCM Error:', err);
    }
  }, [user, addNotification]);

  // Listen to profile for notification settings
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) setProfile(doc.data());
    });
    return unsub;
  }, [user]);

  // Listen for FCM messages when app is in foreground
  useEffect(() => {
    if (!messaging) return;
    
    const unsub = onMessage(messaging, (payload) => {
      console.log('Foreground message:', payload);
      if (payload.notification) {
        addNotification(
          'info',
          payload.notification.title || 'Notification',
          payload.notification.body || ''
        );
      }
    });
    
    return unsub;
  }, [messaging, addNotification]);

  // Workout Reminder Logic (Local Fallback)
  useEffect(() => {
    if (!user || !profile?.settings_notifications) return;

    const checkReminders = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      if (currentHour === 8 && Date.now() - lastCheck > 3600000) {
        addNotification(
          'reminder', 
          'Synapse Activation Required', 
          "Time to initiate today's growth protocol. Your synaptic nodes are ready."
        );
        setLastCheck(Date.now());
      }
    };

    const interval = setInterval(checkReminders, 60000 * 30);
    return () => clearInterval(interval);
  }, [user, profile, addNotification, lastCheck]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, requestPushPermissions }}>
      {children}
      <NotificationOverlay notifications={notifications} removeNotification={removeNotification} />
    </NotificationContext.Provider>
  );
}

function NotificationOverlay({ notifications, removeNotification }: { notifications: Notification[], removeNotification: (id: string) => void }) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-6 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="mb-3 pointer-events-auto"
          >
            <div className="bg-[#111] border border-accent/30 rounded-2xl p-4 shadow-2xl shadow-accent/10 flex items-center gap-4 relative overflow-hidden backdrop-blur-xl">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                n.type === 'milestone' ? 'bg-yellow-500/20 text-yellow-500' :
                n.type === 'reminder' ? 'bg-blue-500/20 text-blue-500' :
                'bg-accent/20 text-accent'
              }`}>
                {n.type === 'milestone' ? <Trophy size={20} /> :
                 n.type === 'reminder' ? <Bell size={20} /> :
                 <Zap size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent italic leading-none mb-1">{n.title}</h4>
                <p className="text-[11px] text-gray-300 font-bold leading-tight">{n.message}</p>
              </div>
              <button 
                onClick={() => removeNotification(n.id)}
                className="text-gray-600 hover:text-white p-1"
              >
                <X size={14} />
              </button>
              
              {/* Decorative scanline */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
