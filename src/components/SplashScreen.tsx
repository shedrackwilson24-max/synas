import { motion, AnimatePresence } from 'motion/react';
import { Activity } from 'lucide-react';
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
      transition={{ duration: 0.8, ease: "circOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#050505]"
    >
      {/* Premium Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,163,0.08)_0%,transparent_70%)]" />
      
      {/* Animated Mesh Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative flex flex-col items-center">
        {/* Logo with Pulse/Glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative mb-12"
        >
          {/* Subtle Glow Ring */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -inset-8 bg-accent/20 blur-3xl rounded-full"
          />

          <div className="relative bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl shadow-2xl">
            <Activity className="text-accent w-20 h-20" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Text Reveal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-center z-10"
        >
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-2">
            Synapse
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] ml-1">
            Synapse Fitness OS
          </p>
        </motion.div>

        {/* Minimal Progress Bar */}
        <div className="absolute bottom-20 w-48 h-[2px] bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-accent shadow-[0_0_10px_rgba(0,255,163,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Decorative Dots */}
      <div className="absolute bottom-10 flex gap-2">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            className="w-1.5 h-1.5 rounded-full bg-white/20"
          />
        ))}
      </div>
    </motion.div>
  );
}
