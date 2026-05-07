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
    goal: 'build muscle',
    activityLevel: 'intermediate',
    frequency: '3',
    focusAreas: [] as string[]
  });

  const steps: SetupStep[] = ['identity', 'biometrics', 'ambition', 'protocol'];
  const currentIdx = steps.indexOf(currentStep);

  const handleNext = () => {
    if (currentStep === 'identity' && (!formData.name || !formData.age)) {
      setError('Please provide identity credentials.');
      return;
    }
    if (currentStep === 'biometrics' && (!formData.weight || !formData.height)) {
      setError('Please provide biometric specs.');
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
      setError('Neural data protocol requires agreement to terms.');
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
        createdAt: serverTimestamp() // We use merge in case doc exists
      }, { merge: true });
      
      navigate('/dashboard');
    } catch (err: any) {
      setError('Synchronization failed. Check connection.');
      handleFirestoreError(err, OperationType.WRITE, userPath);
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-accent selection:text-black relative flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,242,255,0.03),transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl relative z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8" />
            <div className="h-4 w-[1px] bg-white/10" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Protocol Authorization</span>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="flex items-center gap-2 text-[9px] font-bold text-gray-500 hover:text-red-500 transition-colors uppercase tracking-widest"
          >
            Disconnect <LogOut size={12} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1 mb-12 px-2">
          {steps.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-accent"
                initial={{ width: '0%' }}
                animate={{ width: idx <= currentIdx ? '100%' : '0%' }}
                transition={{ duration: 0.5 }}
              />
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
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-black/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 lg:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.5)]"
          >
            {currentStep === 'identity' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-4">
                    Neural<br/><span className="text-accent underline decoration-accent/20 underline-offset-8">Identity</span>
                  </h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Define your unique signature within the core.</p>
                </div>

                <div className="space-y-6">
                  <label className="block group">
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3 block group-focus-within:text-accent transition-colors">Designation Name</span>
                    <div className="relative">
                      <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-accent transition-colors" size={18} />
                      <input 
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 pl-14 pr-6 text-sm font-bold tracking-widest text-white focus:outline-none focus:border-accent/40 focus:bg-white/10 transition-all placeholder:text-gray-700"
                        placeholder="ALEX RIVERA"
                      />
                    </div>
                  </label>

                  <div className="grid grid-cols-2 gap-6">
                    <label className="block group">
                      <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3 block group-focus-within:text-accent transition-colors">Age Range</span>
                      <input 
                        type="number"
                        required
                        value={formData.age}
                        onChange={(e) => setFormData({...formData, age: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 text-center text-sm font-bold tracking-widest text-white focus:outline-none focus:border-accent/40 focus:bg-white/10 transition-all placeholder:text-gray-700"
                        placeholder="25"
                      />
                    </label>

                    <label className="block group">
                      <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3 block group-focus-within:text-id transition-colors group-focus-within:text-accent">Phenotype</span>
                      <select 
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 text-center text-sm font-bold tracking-widest text-white focus:outline-none focus:border-accent/40 focus:bg-white/10 transition-all appearance-none uppercase"
                      >
                        <option value="male" className="bg-[#111]">Male</option>
                        <option value="female" className="bg-[#111]">Female</option>
                        <option value="non-binary" className="bg-[#111]">Other</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'biometrics' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-4">
                    Physical<br/><span className="text-accent underline decoration-accent/20 underline-offset-8">Metrics</span>
                  </h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Calibrate your biological constants.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label className="block group">
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3 block group-focus-within:text-accent transition-colors">Mass (KG)</span>
                    <div className="relative">
                      <Scale className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-accent transition-colors" size={18} />
                      <input 
                        type="number"
                        step="0.1"
                        required
                        value={formData.weight}
                        onChange={(e) => setFormData({...formData, weight: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 pl-14 pr-6 text-sm font-bold tracking-widest text-white focus:outline-none focus:border-accent/40 focus:bg-white/10 transition-all"
                        placeholder="75.0"
                      />
                    </div>
                  </label>

                  <label className="block group">
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3 block group-focus-within:text-accent transition-colors">Stature (CM)</span>
                    <div className="relative">
                      <Ruler className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-accent transition-colors" size={18} />
                      <input 
                        type="number"
                        required
                        value={formData.height}
                        onChange={(e) => setFormData({...formData, height: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 pl-14 pr-6 text-sm font-bold tracking-widest text-white focus:outline-none focus:border-accent/40 focus:bg-white/10 transition-all"
                        placeholder="180"
                      />
                    </div>
                  </label>
                </div>

                <div className="p-6 bg-accent/5 border border-accent/10 rounded-2xl">
                  <p className="text-[10px] text-accent/60 font-bold uppercase tracking-wider leading-relaxed text-center">
                    Biological data used for neural training calorie calibration.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 'ambition' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-4">
                    Primary<br/><span className="text-accent underline decoration-accent/20 underline-offset-8">Directive</span>
                  </h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">What is your evolutionary focus?</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {[
                    { id: 'lose weight', label: 'Fat Oxidization', desc: 'Focus on calorie deficit and cardio.' },
                    { id: 'build muscle', label: 'Hypertrophy', desc: 'Maximize muscle volume and strength.' },
                    { id: 'stay fit', label: 'Homeostasis', desc: 'Maintain peak performance and health.' }
                  ].map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setFormData({...formData, goal: goal.id})}
                      className={`flex items-center gap-6 p-6 rounded-3xl border text-left transition-all group ${
                        formData.goal === goal.id 
                          ? 'bg-accent/10 border-accent/40 ring-1 ring-accent/20 shadow-[0_0_30px_rgba(0,242,255,0.05)]' 
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                        formData.goal === goal.id ? 'bg-accent text-black shadow-[0_0_20px_rgba(0,242,255,0.3)]' : 'bg-black/40 text-gray-600'
                      }`}>
                        <Target size={20} />
                      </div>
                      <div>
                        <h4 className={`text-sm font-black uppercase italic tracking-widest mb-1 ${formData.goal === goal.id ? 'text-accent' : 'text-white'}`}>
                          {goal.label}
                        </h4>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{goal.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 'protocol' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-4">
                    Training<br/><span className="text-accent underline decoration-accent/20 underline-offset-8">Protocol</span>
                  </h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Define your temporal commitment.</p>
                </div>

                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Temporal Frequency</span>
                      <span className="text-accent text-xs font-black italic">{formData.frequency} DAYS / WEEK</span>
                    </div>
                    <div className="flex gap-2">
                      {[1,2,3,4,5,6,7].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setFormData({...formData, frequency: num.toString()})}
                          className={`flex-1 h-12 rounded-xl border font-black transition-all ${
                            formData.frequency === num.toString()
                              ? 'bg-accent border-accent text-black shadow-[0_0_20px_rgba(0,242,255,0.2)]'
                              : 'bg-white/5 border-white/5 text-gray-600 hover:border-white/10 hover:text-gray-400'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-4 block">Neural Nodes (Focus Areas)</span>
                    <div className="grid grid-cols-2 gap-3">
                      {['CORE', 'LOWER BODY', 'UPPER BODY', 'POSTERIOR CHAIN', 'CARDIO', 'ENDURANCE'].map(area => {
                        const isSelected = formData.focusAreas.includes(area);
                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() => toggleFocus(area)}
                            className={`h-12 px-4 rounded-xl border text-[9px] font-black tracking-[0.2em] transition-all flex items-center gap-3 ${
                              isSelected
                                ? 'bg-accent/10 border-accent/40 text-accent'
                                : 'bg-white/5 border-white/5 text-gray-500'
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-accent animate-pulse shadow-[0_0_10px_rgba(0,242,255,0.5)]' : 'bg-gray-800'}`} />
                            {area}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center gap-4">
                      <button 
                        type="button"
                        onClick={() => setAgreedToTerms(!agreedToTerms)}
                        className={`w-6 h-6 rounded-lg border transition-all flex items-center justify-center ${
                          agreedToTerms ? 'bg-accent border-accent text-black ring-4 ring-accent/10' : 'bg-white/5 border-white/10 text-transparent'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest flex-1">
                        I acknowledge the Neural Data Protocol and agree to <button type="button" onClick={() => setShowTerms(true)} className="text-accent underline decoration-accent/20">Terms of Core Access</button>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="mt-12 flex gap-4 pt-4">
              {currentIdx > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-16 h-16 rounded-3xl border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all active:scale-95"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              
              <button
                type={currentIdx === steps.length - 1 ? "submit" : "button"}
                onClick={currentIdx === steps.length - 1 ? handleSubmit : handleNext}
                disabled={loading}
                className="flex-1 h-16 bg-accent rounded-3xl flex items-center justify-center gap-3 text-black font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(0,242,255,0.2)] hover:shadow-[0_25px_60px_rgba(0,242,255,0.3)] hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    {currentIdx === steps.length - 1 ? 'Finalize initialization' : 'Proceed to Phase ' + (currentIdx + 2)}
                    <ChevronRight size={20} strokeWidth={3} />
                  </>
                )}
              </button>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center mt-6 p-3 bg-red-500/5 border border-red-500/10 rounded-2xl"
              >
                {error}
              </motion.p>
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

