import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-14 bg-bg-card border border-border-color rounded-[1.25rem] flex items-center justify-center text-text-secondary hover:text-brand-primary transition-all shadow-sm group overflow-hidden"
      aria-label="Toggle Theme"
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ y: 20, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.3, ease: "backOut" }}
          >
            <Moon size={22} className="group-hover:scale-110 transition-transform" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ y: 20, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.3, ease: "backOut" }}
          >
            <Sun size={22} className="text-amber-500 group-hover:rotate-45 transition-transform" />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Subtle background glow */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${isDark ? 'bg-brand-primary' : 'bg-amber-500'}`} />
    </button>
  );
}
