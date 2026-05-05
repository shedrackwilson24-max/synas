import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Activity as ActivityIcon, Target, ChevronRight, Loader2, LogOut, CheckCircle2 } from 'lucide-react';
import Logo from './Logo';
import TermsModal from './TermsModal';

export default function ProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male',
    goal: 'stay fit',
    activityLevel: 'beginner'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!agreedToTerms) {
      setError('You must accept the terms to continue.');
      return;
    }
    
    setLoading(true);
    const userPath = `users/${user.uid}`;
    
    try {
      await setDoc(doc(db, userPath), {
        name: formData.name,
        email: user.email,
        age: parseInt(formData.age),
        gender: formData.gender,
        goal: formData.goal,
        activity_level: formData.activityLevel,
        createdAt: serverTimestamp()
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError('Failed to save profile. Check your connection.');
      handleFirestoreError(err, OperationType.WRITE, userPath);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-[var(--bg-primary)] overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto py-12"
      >
        <div className="mb-10 text-center relative">
          <button 
            onClick={() => auth.signOut()}
            className="absolute top-0 right-0 p-2 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20"
          >
            <LogOut size={16} />
          </button>
          <Logo className="mx-auto mb-8 w-16 h-16" />
          <h2 className="text-4xl font-black mb-4 uppercase italic tracking-tighter leading-none">
            Personalize<br/><span className="text-accent">Your Plan.</span>
          </h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Tell us a bit about yourself to personalize your experience.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <label className="block">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Full Name</span>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field pl-12 uppercase text-[11px] font-bold"
                  placeholder="EX: ALEX RIVERA"
                />
              </div>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Age</span>
                <input 
                  type="number"
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  className="input-field text-center font-bold"
                  placeholder="28"
                />
              </label>

              <label className="block">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Gender</span>
                <select 
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="input-field text-center font-bold appearance-none cursor-pointer uppercase"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
          </section>

          <section className="space-y-6">
            <div>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-4 block">What is your goal?</span>
              <div className="grid grid-cols-1 gap-3">
                {['lose weight', 'build muscle', 'stay fit'].map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setFormData({...formData, goal})}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      formData.goal === goal 
                        ? 'bg-[var(--bg-secondary)] border-accent text-accent' 
                        : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      formData.goal === goal ? 'bg-accent text-black' : 'bg-[var(--bg-primary)] text-gray-700'
                    }`}>
                      <Target size={18} />
                    </div>
                    <span className="text-xs font-black uppercase italic tracking-tighter">{goal}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-4 block">Activity Level</span>
              <div className="grid grid-cols-3 gap-3">
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData({...formData, activityLevel: level})}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                      formData.activityLevel === level 
                        ? 'bg-[var(--bg-secondary)] border-accent text-accent' 
                        : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <ActivityIcon size={18} />
                    <span className="text-[8px] font-black uppercase tracking-widest">{level}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="pt-4 pb-2">
            <div className="flex items-start gap-3">
              <button 
                type="button"
                onClick={() => setAgreedToTerms(!agreedToTerms)}
                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                  agreedToTerms ? 'bg-accent border-accent text-black' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-transparent'
                }`}
              >
                <CheckCircle2 size={12} className={agreedToTerms ? 'opacity-100' : 'opacity-0'} />
              </button>
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-relaxed">
                  I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-accent hover:underline">Terms of Service</button> and data usage protocol.
                </p>
              </div>
            </div>
          </section>

          {error && (
            <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider pl-1 mb-4">{error}</p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="btn-primary mt-8 mb-12 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Complete Setup
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </form>
      </motion.div>

      <TermsModal 
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={() => {
          setAgreedToTerms(true);
          setShowTerms(false);
        }}
      />
    </div>
  );
}
