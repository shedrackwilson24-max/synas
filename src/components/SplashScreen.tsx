import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { useEffect, useState } from 'react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 1200; // 1.2 seconds
    const interval = 10;
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500); // Small buffer after 100%
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-bg-primary"
    >
      {/* Premium Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(67,56,202,0.15)_0%,transparent_70%)]" />
      
      {/* Neural Mesh Background */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #4338CA 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative flex flex-col items-center">
        {/* Logo with Neural Glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-12"
        >
          {/* Neural Glow Rings */}
          <motion.div 
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -inset-12 bg-brand-primary/20 blur-[100px] rounded-full"
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute -inset-16 bg-brand-cyan/20 blur-[100px] rounded-full"
          />

          <div className="relative bg-bg-card/50 p-10 rounded-[3rem] border border-border-color backdrop-blur-2xl shadow-2xl">
            <Logo className="w-24 h-24" />
          </div>
        </motion.div>

        {/* Text Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-center z-10"
        >
          <h1 className="text-5xl font-black uppercase tracking-[0.6em] text-text-primary ml-4 mb-3 leading-none logo-text">
            Synapse
          </h1>
          <p className="text-[10px] text-brand-primary font-bold uppercase tracking-[0.4em] ml-2 font-display">
            Neural Recalibration Protocol
          </p>
        </motion.div>

        {/* Cinematic Progress Bar */}
        <div className="absolute bottom-20 w-64 h-[2px] bg-border-color rounded-full overflow-hidden">
          <motion.div 
            className="h-full neural-gradient shadow-[0_0_20px_rgba(67,56,202,0.6)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Decorative Dots */}
      <div className="absolute bottom-10 flex gap-4">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ 
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
              backgroundColor: i === 1 ? '#06B6D4' : '#4338CA'
            }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
            className="w-1.5 h-1.5 rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
}
