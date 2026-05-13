import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db, auth } from '../lib/firebase';

const getVapidKey = () => {
  const value = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  // VAPID keys are Base64-URL encoded public keys, typically ~87 characters.
  // We'll be conservative but block obviously invalid placeholders.
  if (!value || typeof value !== 'string' || value.trim() === '' || value.includes('your_') || value.length < 50) {
    return null;
  }
  return value;
};

const VAPID_KEY = getVapidKey();

export const requestNotificationPermission = async () => {
  if (!messaging) return null;

  if (!VAPID_KEY) {
    console.warn('FCM: VITE_FIREBASE_VAPID_KEY is not set or invalid. Push notifications will not be available. Please set a valid VAPID key in Settings.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY
        });

        if (token && auth.currentUser) {
          // Save token to user profile
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token),
            notificationsEnabled: true,
            updatedAt: new Date()
          });
          return token;
        }
      } catch (tokenErr: any) {
        if (tokenErr.message?.includes('applicationServerKey') || tokenErr.message?.includes('vapidKey') || tokenErr.message?.includes('bad-format')) {
          console.warn('FCM Graceful Exit: The VAPID key provided (VITE_FIREBASE_VAPID_KEY) is not recognized by the current Firebase project. Ensure it matches the "Web Push certificates" in Firebase Console Settings.');
        } else {
          console.error('FCM: Unexpected error fetching token:', tokenErr);
        }
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Notification permission error:', error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      resolve(payload);
    });
  });
