import React, { memo } from 'react';
import { motion } from 'motion/react';
import { Flame, Footprints, MapPin } from 'lucide-react';

interface FitnessRingProps {
  calories: number;
  goal: number;
  steps: number;
  distance: number;
  size?: number;
}

function FitnessRing({ 
  calories, 
  goal, 
  steps, 
  distance,
  size = 220 
}: FitnessRingProps) {
  const percentage = Math.min(Math.max((calories / goal) * 100, 0), 100);
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const isGoalReached = calories >= goal;

  return (
    <div className="flex flex-col items-center">
      <div className="relative group" style={{ width: size, height: size }}>
        {/* Shadow Overlay */}
        <div className="absolute inset-0 rounded-full shadow-[0_0_50px_rgba(79,70,229,0.1)] pointer-events-none group-hover:shadow-[0_0_70px_rgba(79,70,229,0.2)] transition-all duration-700" />
        
        {/* Background Ring */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 select-none relative z-10"
        >
          <defs>
            <linearGradient id="neuralGradientRing" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-brand-primary)" />
              <stop offset="100%" stopColor="var(--color-brand-vibrant)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--color-bg-secondary)"
            strokeWidth={strokeWidth}
          />
          {/* Progress Ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="url(#neuralGradientRing)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            filter={isGoalReached ? "url(#glow)" : "none"}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-5xl font-bold tracking-tighter text-text-primary font-display uppercase">
                {Math.round(percentage)}
              </span>
              <span className="text-xl font-bold text-text-secondary font-display mt-2">%</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-primary font-display">
              Protocol Load
            </div>
          </motion.div>
        </div>
      </div>

      {/* Sub Stats */}
      <div className="grid grid-cols-2 gap-12 mt-12 w-full max-w-[320px]">
        <div className="flex flex-col items-center gap-2 group transition-all">
          <div className="flex items-center gap-2 text-text-secondary/40 group-hover:text-brand-cyan transition-colors">
            <Footprints size={14} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-display">Steps</span>
          </div>
          <div className="text-2xl font-bold text-text-primary tabular-nums font-display tracking-tight group-hover:text-brand-cyan transition-colors">
            {steps.toLocaleString()}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 group transition-all">
          <div className="flex items-center gap-2 text-text-secondary/40 group-hover:text-brand-vibrant transition-colors">
            <MapPin size={14} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-display">Distance</span>
          </div>
          <div className="text-2xl font-bold text-text-primary tabular-nums font-display tracking-tight group-hover:text-brand-vibrant transition-colors">
            {distance.toFixed(1)}<span className="text-[10px] ml-1.5 text-text-secondary/40 font-bold uppercase tracking-widest">km</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(FitnessRing);
