import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  User as UserIcon, 
  Activity as ActivityIcon, 
  Target, 
  ChevronRight, 
  Loader2, 
  LogOut, 
  CheckCircle2, 
  Scale, 
  Ruler, 
  Calendar,
  Dumbbell,
  ArrowLeft
} from 'lucide-react';
import Logo from './Logo';
import TermsModal from './TermsModal';

type SetupStep = 'identity' | 'biometrics' | 'ambition' | 'protocol';

export default function ProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<SetupStep>('identity');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    goal: 'stay fit',
    activityLevel: 'intermediate',
    frequency: '3',
    focusAreas: [] as string[]
  });

  const steps: SetupStep[] = ['identity', 'biometrics', 'ambition', 'protocol'];
  const currentIdx = steps.indexOf(currentStep);

  const handleNext = () => {
    if (currentStep === 'identity' && (!formData.name || !formData.age)) {
      setError('Please provide your identity details.');
      return;
    }
    if (currentStep === 'biometrics' && (!formData.weight || !formData.height)) {
      setError('Please provide your biometric data.');
      return;
    }
    setError('');
    const nextIdx = currentIdx + 1;
    if (nextIdx < steps.length) {
      setCurrentStep(steps[nextIdx]);
    }
  };

  const handleBack = () => {
    setError('');
    const prevIdx = currentIdx - 1;
    if (prevIdx >= 0) {
      setCurrentStep(steps[prevIdx]);
    }
  };

  const toggleFocus = (area: string) => {
    setFormData(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter(a => a !== area)
        : [...prev.focusAreas, area]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!agreedToTerms) {
      setError('Please agree to the privacy policy to continue.');
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
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        goal: formData.goal,
        activity_level: formData.activityLevel,
        frequency: parseInt(formData.frequency),
        focus_areas: formData.focusAreas,
        setup_complete: true,
        activity_rank: 0.1,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });
      
      navigate('/dashboard');
    } catch (err: any) {
      setError('Failed to save profile. Please check your connection.');
      handleFirestoreError(err, OperationType.WRITE, userPath);
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    initial: { opacity: 0, scale: 0.98, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 1.02, y: -10 }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-brand-primary selection:text-white relative flex flex-col items-center justify-center p-6 lg:p-12 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden ">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-brand-primary/5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-brand-cyan/5 rounded-full blur-[120px] -translate-x-1/2 translate-y-1/2" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-10 px-4">
          <div className="flex items-center gap-4">
            <Logo className="w-12 h-12" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-text-primary">Onboarding</h1>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-display">Initialization Phase</p>
            </div>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="flex items-center gap-2 text-[10px] font-bold text-text-secondary hover:text-rose-500 transition-colors uppercase tracking-widest bg-bg-card py-2.5 px-5 rounded-xl border border-border-color shadow-sm font-display"
          >
            Cancel <LogOut size={14} />
          </button>
        </div>

        {/* Progress Display */}
        <div className="flex gap-2 mb-12 px-2">
          {steps.map((s, idx) => (
            <div key={idx} className="flex-1 flex flex-col gap-2">
              <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden relative">
                <motion.div 
                  className="h-full bg-brand-primary absolute left-0"
                  initial={{ width: '0%' }}
                  animate={{ width: idx <= currentIdx ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className={`text-[8px] font-bold uppercase tracking-widest transition-colors font-display ${idx <= currentIdx ? 'text-brand-primary' : 'text-text-secondary opacity-40'}`}>
                {s}
              </span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-bg-card border border-border-color rounded-[3rem] p-8 lg:p-14 shadow-2xl shadow-black/5"
          >
            {currentStep === 'identity' && (
              <div className="space-y-10">
                <div className="text-center">
                  <h2 className="text-4xl font-bold tracking-tight mb-4 text-text-primary">Hello there.</h2>
                  <p className="text-text-secondary font-medium font-display">Let's start by identifying your profile.</p>
                </div>

                <div className="space-y-6 max-w-md mx-auto font-display">
                  <label className="block group">
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3 block ml-1 group-focus-within:text-brand-primary transition-colors">Preferred Name</span>
                    <div className="relative">
                      <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-text-secondary opacity-40 group-focus-within:text-brand-primary transition-colors" size={20} />
                      <input 
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="input-field pl-14"
                        placeholder="Alex Rivera"
                      />
                    </div>
                  </label>

                  <div className="grid grid-cols-2 gap-6">
                    <label className="block group">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3 block ml-1 group-focus-within:text-brand-primary transition-colors">Age</span>
                      <input 
                        type="number"
                        required
                        value={formData.age}
                        onChange={(e) => setFormData({...formData, age: e.target.value})}
                        className="input-field text-center no-spinner"
                        placeholder="25"
                      />
                    </label>

                    <label className="block group">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3 block ml-1 group-focus-within:text-brand-primary transition-colors">Gender</span>
                      <select 
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        className="input-field text-center appearance-none cursor-pointer"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Other</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'biometrics' && (
              <div className="space-y-10">
                <div className="text-center">
                  <h2 className="text-4xl font-bold tracking-tight mb-4 text-text-primary">Biometrics</h2>
                  <p className="text-text-secondary font-medium font-display">Calibrating your physical parameters.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-lg mx-auto font-display">
                  <label className="block group">
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3 block ml-1 group-focus-within:text-brand-primary transition-colors">Weight (kg)</span>
                    <div className="relative">
                      <Scale className="absolute left-5 top-1/2 -translate-y-1/2 text-text-secondary opacity-40 group-focus-within:text-brand-primary transition-colors" size={20} />
                      <input 
                        type="number"
                        step="0.1"
                        required
                        value={formData.weight}
                        onChange={(e) => setFormData({...formData, weight: e.target.value})}
                        className="input-field pl-14 no-spinner"
                        placeholder="70.5"
                      />
                    </div>
                  </label>

                  <label className="block group">
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3 block ml-1 group-focus-within:text-brand-primary transition-colors">Height (cm)</span>
                    <div className="relative">
                      <Ruler className="absolute left-5 top-1/2 -translate-y-1/2 text-text-secondary opacity-40 group-focus-within:text-brand-primary transition-colors" size={20} />
                      <input 
                        type="number"
                        required
                        value={formData.height}
                        onChange={(e) => setFormData({...formData, height: e.target.value})}
                        className="input-field pl-14 no-spinner"
                        placeholder="180"
                      />
                    </div>
                  </label>
                </div>
                
                <div className="p-6 bg-bg-secondary rounded-3xl border border-border-color max-w-md mx-auto">
                  <p className="text-xs text-text-secondary text-center font-medium leading-relaxed font-display uppercase tracking-widest">
                    This data helps us calculate your BMR and personalized nutritional targets with medical-grade precision.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 'ambition' && (
              <div className="space-y-10">
                <div className="text-center font-display">
                  <h2 className="text-4xl font-bold tracking-tight mb-4 text-text-primary">Main Goal</h2>
                  <p className="text-text-secondary font-medium">What is your primary focus?</p>
                </div>

                <div className="grid grid-cols-1 gap-4 max-w-md mx-auto font-display">
                  {[
                    { id: 'lose weight', label: 'Weight Management', desc: 'Sustainably lose fat while preserving muscle.' },
                    { id: 'build muscle', label: 'Strength & Gain', desc: 'Optimize for hypertrophy and performance.' },
                    { id: 'stay fit', label: 'Balanced Wellness', desc: 'Maintain health and energy for everyday life.' }
                  ].map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setFormData({...formData, goal: goal.id})}
                      className={`flex items-center gap-6 p-6 rounded-[2rem] border-2 text-left transition-all group ${
                        formData.goal === goal.id 
                          ? 'bg-brand-primary/5 border-brand-primary shadow-lg shadow-brand-primary/10' 
                          : 'bg-bg-secondary border-border-color hover:border-text-secondary'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                        formData.goal === goal.id ? 'neural-gradient text-white shadow-xl shadow-brand-primary/20' : 'bg-bg-primary text-text-secondary group-hover:bg-border-color'
                      }`}>
                        <Target size={24} />
                      </div>
                      <div>
                        <h4 className={`text-lg font-bold tracking-tight mb-1 ${formData.goal === goal.id ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {goal.label}
                        </h4>
                        <p className="text-xs text-text-secondary font-medium italic">{goal.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 'protocol' && (
              <div className="space-y-10 font-display">
                <div className="text-center">
                  <h2 className="text-4xl font-bold tracking-tight mb-4 text-text-primary">Frequency</h2>
                  <p className="text-text-secondary font-medium">How often will you commit to activity?</p>
                </div>

                <div className="space-y-10 max-w-md mx-auto">
                  <div>
                    <div className="flex items-center justify-between mb-4 px-2">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Commitment</span>
                      <span className="text-brand-primary font-bold">{formData.frequency} days / week</span>
                    </div>
                    <div className="flex gap-2">
                      {[1,2,3,4,5,6,7].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setFormData({...formData, frequency: num.toString()})}
                          className={`flex-1 h-12 rounded-xl border-2 font-bold transition-all ${
                            formData.frequency === num.toString()
                              ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20'
                              : 'bg-bg-secondary border-border-color text-text-secondary hover:border-text-secondary'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4 block px-2">Specific Focus Areas</span>
                    <div className="grid grid-cols-2 gap-3">
                      {['Core', 'Lower Body', 'Upper Body', 'Cardio', 'Mobility', 'Endurance'].map(area => {
                        const isSelected = formData.focusAreas.includes(area);
                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() => toggleFocus(area)}
                            className={`h-14 px-5 rounded-2xl border-2 font-semibold transition-all flex items-center gap-3 ${
                              isSelected
                                ? 'bg-text-primary border-text-primary text-bg-primary shadow-lg shadow-black/10'
                                : 'bg-bg-secondary border-border-color text-text-secondary hover:border-text-secondary'
                            }`}
                          >
                            <CheckCircle2 size={16} className={isSelected ? 'text-brand-cyan opacity-100' : 'opacity-0'} />
                            {area}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border-color">
                    <div className="flex items-start gap-4 p-4 bg-bg-secondary rounded-2xl border border-border-color">
                      <button 
                        type="button"
                        onClick={() => setAgreedToTerms(!agreedToTerms)}
                        className={`mt-0.5 shrink-0 w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                          agreedToTerms ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-bg-card border-border-color'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
                        I acknowledge the health tracking and data usage policy. My data is my own and is encrypted. I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-brand-primary font-bold hover:underline">Privacy Policy</button>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="mt-14 flex items-center gap-4 pt-4">
              {currentIdx > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-16 h-16 rounded-[1.5rem] border-2 border-border-color flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-text-secondary bg-bg-secondary transition-all active:scale-95 shadow-sm"
                >
                  <ArrowLeft size={24} />
                </button>
              )}
              
              <button
                type={currentIdx === steps.length - 1 ? "submit" : "button"}
                onClick={currentIdx === steps.length - 1 ? handleSubmit : handleNext}
                disabled={loading}
                className="flex-1 h-16 bg-text-primary rounded-[1.5rem] flex items-center justify-center gap-3 text-bg-primary font-bold shadow-xl shadow-black/5 hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none font-display uppercase tracking-widest text-sm"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <span>{currentIdx === steps.length - 1 ? 'Finalize Profile' : 'Continue'}</span>
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-rose-500 text-xs font-bold text-center mt-8 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 font-display uppercase tracking-widest"
              >
                {error}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
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

