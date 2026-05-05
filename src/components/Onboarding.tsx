import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Logo from './Logo';

const slides = [
  {
    title: 'Smart Tracking',
    description: 'Track your activities effortlessly in real-time with our neural processing engine.',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop',
  },
  {
    title: 'Progress Insights',
    description: 'Visualize your growth with simple, deep-learning analytics tailored to your body.',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop',
  },
  {
    title: 'Goal Setting',
    description: 'Set neural targets and stay consistent daily with adaptive feedback loops.',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop',
  },
  {
    title: 'Seamless Experience',
    description: 'Clean, fast, and easy to use interface designed for your peak performance.',
    image: 'https://images.unsplash.com/photo-1550345332-09e3ac987658?q=80&w=2070&auto=format&fit=crop',
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      navigate('/auth');
    }
  };

  const handleSkip = () => {
    navigate('/auth');
  };

  return (
    <div className="relative h-screen bg-black overflow-hidden select-none">
      {/* Brand Logo Overlay */}
      <div className="absolute top-12 left-8 z-50">
        <Logo className="w-10 h-10" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          {/* Background Image with Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${slides[currentSlide].image})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end p-8 pb-16">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          key={`step-${currentSlide}`}
          className="mb-6"
        >
          <span className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase">Phase 0{currentSlide + 1}</span>
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${currentSlide}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
            className="max-w-md"
          >
            <h1 className="text-5xl font-black leading-none mb-4 italic uppercase tracking-tighter">
              {slides[currentSlide].title.split(' ').slice(0, -1).join(' ')} <br/>
              <span className="text-accent">{slides[currentSlide].title.split(' ').slice(-1)}</span>
            </h1>
            <p className="text-gray-400 text-xs mb-10 leading-relaxed font-medium max-w-[240px]">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <button 
            onClick={handleSkip}
            className="text-[10px] text-gray-500 hover:text-white transition-colors font-bold uppercase tracking-[0.2em]"
          >
            Skip
          </button>

          <div className="flex gap-2">
            {slides.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1 rounded-full transition-all duration-300 ${
                  currentSlide === idx ? 'w-8 bg-accent' : 'w-2 bg-gray-800'
                }`}
              />
            ))}
          </div>

          <button 
            onClick={handleNext}
            className="w-14 h-14 bg-accent rounded-full flex items-center justify-center hover:bg-opacity-90 transition-colors shadow-2xl shadow-accent/10"
          >
            <ChevronRight size={24} className="text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}
