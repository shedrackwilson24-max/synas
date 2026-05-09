import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  signOut,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth';
import { auth, db, googleProvider } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Mail, Lock, Loader2, ChevronRight, CheckCircle2, Globe, Shield, Heart } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../contexts/AuthContext';

type AuthStep = 'auth' | 'success';

export default function Auth() {
  const { user: currentUser, isAuthFlow, setIsAuthFlow } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<AuthStep>('auth');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Logic States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const getAuthErrorMessage = (err: any): string => {
    const errorCode = err?.code || (err?.message?.includes('(') ? err.message.split('(')[1].split(')')[0] : '');
    
    const errorMap: Record<string, string> = {
      'auth/email-already-in-use': 'This email is already registered. Please log in.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-disabled': 'This account has been deactivated.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/invalid-credential': 'Invalid login credentials.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.',
    };

    return errorMap[errorCode] || err.message || 'An error occurred during authentication.';
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase().trim());
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim();

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setIsAuthFlow(true);

    try {
      await setPersistence(auth, browserLocalPersistence);

      if (isLogin) {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: trimmedEmail,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          name: trimmedEmail.split("@")[0],
          activity_level: "Wellness Beginner",
          setup_complete: false
        });
      }

      setIsAuthFlow(false);
      setStep('success');
      setTimeout(() => navigate('/profile-setup'), 1500);
    } catch (err: any) {
      console.error('Auth Error:', err);
      setIsAuthFlow(false);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    setIsAuthFlow(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        name: user.displayName || user.email?.split('@')[0],
        lastLoginAt: serverTimestamp(),
      }, { merge: true });
      
      setIsAuthFlow(false);
      setStep('success');
      setTimeout(() => navigate('/profile-setup'), 1500);
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setIsAuthFlow(false);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 'auth' && currentUser && !isAuthFlow) {
      navigate('/dashboard');
    }
  }, [currentUser, step, isAuthFlow, navigate]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background blobs for premium feel */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] aspect-square bg-brand-primary/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[10%] -right-[5%] w-[40%] aspect-square bg-brand-cyan/10 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="bg-bg-card rounded-[2.5rem] shadow-2xl shadow-brand-primary/5 p-10 lg:p-14 border border-border-color">
          {/* Logo Section */}
          <div className="flex justify-center mb-10">
            <Logo className="w-16 h-16 animate-pulse-neural" />
          </div>

          <AnimatePresence mode="wait">
            {step === 'auth' ? (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <div className="mb-10 text-center">
                  <h2 className="text-3xl font-bold text-text-primary mb-3 tracking-tight font-display">
                    {isLogin ? 'Welcome Back' : 'Get Started'}
                  </h2>
                  <p className="text-text-secondary font-medium">
                    {isLogin ? 'Log in to your wellness dashboard' : 'Your journey to better health begins here'}
                  </p>
                </div>

                {/* Toggle */}
                <div className="flex bg-bg-secondary p-1.5 rounded-2xl mb-8 relative">
                  <motion.div 
                    animate={{ x: isLogin ? '100%' : '0%' }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] bg-bg-card rounded-xl shadow-sm border border-border-color"
                  />
                  <button 
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 relative z-10 py-2.5 text-xs uppercase tracking-widest font-bold transition-colors font-display ${!isLogin ? 'text-text-primary' : 'text-text-secondary'}`}
                  >
                    Join
                  </button>
                  <button 
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 relative z-10 py-2.5 text-xs uppercase tracking-widest font-bold transition-colors font-display ${isLogin ? 'text-text-primary' : 'text-text-secondary'}`}
                  >
                    Login
                  </button>
                </div>

                <form onSubmit={handleAuth} className="space-y-5 mb-8">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text-secondary group-focus-within:text-brand-primary transition-colors">
                      <Mail size={18} />
                    </div>
                    <input 
                      type="email"
                      placeholder="Email address"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      className="input-field pl-14"
                    />
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text-secondary group-focus-within:text-brand-primary transition-colors">
                      <Lock size={18} />
                    </div>
                    <input 
                      type="password"
                      placeholder="Password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-14"
                    />
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-semibold border border-red-100 dark:border-red-900/50"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-5 rounded-2xl flex items-center justify-center text-white font-bold tracking-widest transition-all active:scale-95 shadow-xl shadow-brand-primary/20 font-display uppercase"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        {isLogin ? 'Sign In' : 'Sign Up'}
                        <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center gap-4 mb-8">
                  <div className="h-[1px] flex-1 bg-border-color" />
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest font-display">or continue with</span>
                  <div className="h-[1px] flex-1 bg-border-color" />
                </div>

                <button 
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full h-14 bg-bg-card border border-border-color rounded-2xl flex items-center justify-center gap-3 text-text-primary font-bold hover:bg-bg-secondary transition-all disabled:opacity-50 font-display text-xs uppercase tracking-widest"
                >
                  <Globe size={18} className="text-brand-vibrant" />
                  <span>Google Account</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="auth-success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-20 h-20 neural-gradient rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-brand-primary/30">
                  <CheckCircle2 className="text-white" size={40} />
                </div>
                <h2 className="text-3xl font-bold text-text-primary mb-4 tracking-tight font-display">Verified</h2>
                <p className="text-text-secondary font-medium">
                  Welcome to your wellness journey.<br/>Initializing neural protocol...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Support info */}
        <div className="mt-10 text-center flex flex-col gap-4">
          <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest font-display">
            <span className="flex items-center gap-1.5"><Shield size={12} className="text-brand-cyan" /> Encrypted</span>
            <span className="flex items-center gap-1.5"><Heart size={12} className="text-brand-teal" /> HIPAA Ready</span>
          </div>
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.2em] font-display">
            &copy; 2026 Synapse Protocol v1.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}


