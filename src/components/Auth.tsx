import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'motion/react';
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
import { Mail, Lock, Loader2, ChevronRight, CheckCircle2, ArrowLeft, Globe, ShieldCheck, Database, Cpu, Zap } from 'lucide-react';
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
  const [rememberMe, setRememberMe] = useState(true);
  
  // Logic States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const getAuthErrorMessage = (err: any): string => {
    const errorCode = err?.code || (err?.message?.includes('(') ? err.message.split('(')[1].split(')')[0] : '');
    
    console.warn(`Synapse Auth Exception: [${errorCode}]`, err);

    const errorMap: Record<string, string> = {
      'auth/email-already-in-use': 'Identity already exists in synapse records. Please log in instead.',
      'auth/invalid-email': 'The synapse address provided is improperly formatted.',
      'auth/user-disabled': 'This access node has been deactivated.',
      'auth/user-not-found': 'No profile detected. Please initialize a new link.',
      'auth/wrong-password': 'Key mismatch. Access denied.',
      'auth/weak-password': 'Key strength insufficient (min 6 chars).',
      'auth/invalid-credential': 'Invalid synchronization credentials.',
      'auth/too-many-requests': 'Core flooded. Temporary lockout initiated.',
      'auth/operation-not-allowed': 'Neural registration is currently restricted.'
    };

    return errorMap[errorCode] || err.message || 'Operation failed within the synapse core.';
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
      setError('Invalid email format.');
      return;
    }

    if (password.length < 6) {
      setError('Key strength insufficient (min 6 chars).');
      return;
    }

    setLoading(true);
    setIsAuthFlow(true);

    try {
      console.log(`Synapse: Initiating ${isLogin ? 'sync' : 'join'} for ${trimmedEmail}...`);
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
          activity_level: "RECRUIT"
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
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,242,255,0.05),transparent_70%)]" />
        <motion.div 
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" 
        />
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Card */}
        <div className="flex justify-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-black/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-[0_0_30px_rgba(0,242,255,0.1)] relative group"
          >
            <div className="absolute inset-0 bg-accent/5 blur-xl group-hover:bg-accent/10 transition-colors rounded-3xl" />
            <Logo className="w-16 h-16 relative z-10" />
          </motion.div>
        </div>

        {/* Toggle Switch */}
        <div className="flex justify-center mb-12">
          <div className="bg-black/60 border border-white/5 p-1 rounded-2xl flex relative w-64 h-12">
            <motion.div 
              animate={{ x: isLogin ? 128 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-1 bottom-1 w-[124px] bg-accent/10 border border-accent/30 rounded-xl"
            />
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 relative z-10 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${!isLogin ? 'text-accent' : 'text-gray-500 hover:text-gray-400'}`}
            >
              Join
            </button>
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 relative z-10 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isLogin ? 'text-accent' : 'text-gray-500 hover:text-gray-400'}`}
            >
              Sync
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'auth' ? (
            <motion.div
              key="auth-form"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="text-center"
            >
              {/* Headings */}
              <div className="mb-10">
                <motion.h2 
                  key={isLogin ? 'sync' : 'join'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-5xl font-black italic uppercase tracking-tighter text-white mb-3"
                >
                  {isLogin ? 'Sync Synapse' : 'Join Synapse'}
                </motion.h2>
                <p className="text-[10px] text-accent/60 font-black uppercase tracking-[0.3em]">
                  Begin your evolution today
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleAuth} className="space-y-4 mb-8">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-accent transition-colors">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email"
                    placeholder="EMAIL ADDRESS"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 pl-14 pr-6 text-sm font-bold tracking-widest text-white focus:outline-none focus:border-accent/40 focus:bg-white/10 transition-all placeholder:text-gray-600"
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-accent transition-colors">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password"
                    placeholder="PASSWORD"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 pl-14 pr-6 text-sm font-bold tracking-widest text-white focus:outline-none focus:border-accent/40 focus:bg-white/10 transition-all placeholder:text-gray-600"
                  />
                </div>

                <div className="flex items-center justify-between px-2 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="appearance-none w-5 h-5 rounded-lg border border-white/10 bg-white/5 checked:bg-accent/20 checked:border-accent transition-all cursor-pointer"
                      />
                      <AnimatePresence>
                        {rememberMe && (
                          <motion.div 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }} 
                            exit={{ scale: 0 }}
                            className="absolute pointer-events-none text-accent"
                          >
                            <Zap size={10} fill="currentColor" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-[0.15em] group-hover:text-gray-400 transition-colors">Keep me synced</span>
                  </label>
                  
                  <button type="button" className="text-[9px] text-gray-600 font-bold uppercase tracking-widest hover:text-accent transition-colors">
                    Lost Key?
                  </button>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-left"
                  >
                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider leading-relaxed">{error}</p>
                    {error.includes('already exists') && (
                      <button 
                        type="button" 
                        onClick={() => setIsLogin(true)}
                        className="mt-2 text-[9px] text-accent font-black uppercase tracking-widest hover:underline"
                      >
                        Switch to Sync Protocol
                      </button>
                    )}
                  </motion.div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-16 bg-accent border border-accent/50 rounded-2xl flex items-center justify-center gap-3 text-black font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(0,242,255,0.2)] hover:shadow-[0_0_40px_rgba(0,242,255,0.4)] hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                      {isLogin ? 'Sign In' : 'Sign Up'}
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-8">
                <div className="h-[1px] flex-1 bg-white/5" />
                <span className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <Cpu size={12} /> Neural Proxy
                </span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              {/* Social Login */}
              <button 
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase tracking-[0.1em] hover:bg-white/10 transition-all disabled:opacity-50"
              >
                <Globe size={18} className="text-accent" />
                <span>{isLogin ? 'Sync via Google' : 'Join via Google'}</span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="auth-success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <div className="w-24 h-24 bg-accent rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(0,242,255,0.3)] rotate-12">
                <CheckCircle2 className="text-black" size={48} />
              </div>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-4">
                Neural Link<br/><span className="text-accent">Established</span>
              </h2>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.2em] leading-loose">
                Synchronization complete.<br/>Initializing core interface...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.4em]">
            Protocol V.2.0.4 // Synchronized with global network
          </p>
        </div>
      </motion.div>

      {/* Side Decorative elements (floating bars) */}
      <div className="hidden lg:block absolute left-10 top-1/2 -translate-y-1/2 space-y-2 opacity-20">
        {[...Array(5)].map((_, i) => (
          <motion.div 
            key={i}
            animate={{ width: [20, 60, 20] }}
            transition={{ duration: 2 + i, repeat: Infinity }}
            className="h-1 bg-accent rounded-full" 
          />
        ))}
      </div>
      <div className="hidden lg:block absolute right-10 top-1/2 -translate-y-1/2 space-y-2 opacity-20 transform scale-x-[-1]">
        {[...Array(5)].map((_, i) => (
          <motion.div 
            key={i}
            animate={{ width: [20, 40, 20] }}
            transition={{ duration: 1.5 + i, repeat: Infinity }}
            className="h-1 bg-accent rounded-full" 
          />
        ))}
      </div>
    </div>
  );
}


