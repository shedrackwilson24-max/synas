import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

interface UserProfile {
  name?: string;
  email?: string;
  setup_complete?: boolean;
  activity_level?: string;
  goal?: string;
  weight?: number;
  height?: number;
  age?: number;
  activity_rank?: number;
  frequency?: number;
  focus_areas?: string[];
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthFlow: boolean;
  setIsAuthFlow: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null,
  loading: true,
  logout: async () => {},
  isAuthFlow: false,
  setIsAuthFlow: () => {}
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthFlow, setIsAuthFlow] = useState(false);

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      if (user) {
        // Subscribe to user profile document
        profileUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });
      } else {
        if (profileUnsubscribe) profileUnsubscribe();
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, isAuthFlow, setIsAuthFlow }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
