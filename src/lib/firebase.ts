import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentSingleTabManager 
} from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const getEnvVar = (viteKey: string, fallback: string) => {
  const value = import.meta.env[viteKey];
  
  // Strictly check for valid string values
  // Ignore 'undefined', empty strings, or placeholder values from .env.example
  const isInvalid = !value || 
    value === 'undefined' || 
    value === '' || 
    (typeof value === 'string' && (
      value.startsWith('your_') || 
      value.includes('project_id') ||
      value.includes('messaging_id') ||
      value.includes('app_id') ||
      value === '(default)'
    ));

  if (typeof value === 'string' && !isInvalid) {
    // Additionally check if it looks like a real Firebase API Key if it's the API_KEY
    if (viteKey === 'VITE_FIREBASE_API_KEY' && !value.startsWith('AIza')) {
       console.warn(`Synapse: Environment variable ${viteKey} found but does not start with AIza. Falling back.`);
       return fallback;
    }
    console.log(`Synapse: Using environment variable for ${viteKey}`);
    return value;
  }
  return fallback;
};

// Determine the final configuration object
const finalApiKey = getEnvVar('VITE_FIREBASE_API_KEY', firebaseConfig.apiKey);

const config = {
  apiKey: finalApiKey,
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', firebaseConfig.messagingSenderId),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', firebaseConfig.appId),
};

// --- VALIDATION AND LOGGING ---
const diagnosticReport = {
  envKeyFound: !!import.meta.env.VITE_FIREBASE_API_KEY,
  envKeyValid: !!import.meta.env.VITE_FIREBASE_API_KEY && String(import.meta.env.VITE_FIREBASE_API_KEY).startsWith('AIza'),
  fallbackKeyValid: !!firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIza'),
  finalKeyValid: !!finalApiKey && finalApiKey.startsWith('AIza'),
  fallbackUsed: finalApiKey === firebaseConfig.apiKey,
  apiKeyLength: finalApiKey?.length || 0,
  projectId: config.projectId
};

console.log('Synapse: Firebase Diagnostic Report:', JSON.stringify(diagnosticReport, null, 2));

if (finalApiKey === firebaseConfig.apiKey) {
  console.log("Synapse: Falling back to internal project configuration from firebase-applet-config.json.");
}

// Check for absolute minimum requirements
if (!config.apiKey || config.apiKey.length < 5 || !config.apiKey.startsWith('AIza')) {
  const msg = "Critical: Invalid or missing Firebase API Key. Initialization will likely fail. Ensure VITE_FIREBASE_API_KEY is set correctly.";
  console.error(`Synapse: ${msg}`);
  // Throwing here might break the app entirely, but it's better than silent failure with cryptic errors later
  // We'll just log loudly for now as initializeApp might still take it and fail later
} else {
  console.log(`Synapse: Initializing with key prefix: ${config.apiKey.substring(0, 8)}...`);
}

// Initialize the app
let app;
try {
  app = initializeApp(config);
  console.log("Synapse: Firebase App initialized successfully.");
} catch (error) {
  console.error("Synapse: Error during initializeApp:", error);
  // Fallback to minimal initialization if possible or just rethrow
  throw error;
}

// Enable persistence for offline support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({})
  })
}, getEnvVar('VITE_FIREBASE_DATABASE_ID', firebaseConfig.firestoreDatabaseId));

export const auth = getAuth(app);
export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Connection Test
// Removed immediate testConnection to prevent confusing "unavailable" errors on first load
// while service is provisioning.

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
