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
  size = 200 
}: FitnessRingProps) {
  const percentage = Math.min(Math.max((calories / goal) * 100, 0), 100);
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const isGoalReached = calories >= goal;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Ring */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 select-none"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Progress Ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={isGoalReached ? "#00FFA3" : "var(--color-accent, #00FF9D)"}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
            className="drop-shadow-[0_0_12px_rgba(0,255,157,0.3)]"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame size={16} className={isGoalReached ? "text-[#00FFA3]" : "text-accent"} />
              <span className="text-3xl font-black tracking-tighter italic">
                {Math.round(calories)}
              </span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">
              / {goal} KCAL
            </div>
          </motion.div>
        </div>

        {/* Decorative Particles for Goal Reached */}
        {isGoalReached && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -inset-2 border-2 border-[#00FFA3]/20 rounded-full animate-pulse pointer-events-none"
          />
        )}
      </div>

      {/* Sub Stats */}
      <div className="grid grid-cols-2 gap-8 mt-8 w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group hover:text-white transition-colors">
            <Footprints size={18} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 leading-none mb-1">Steps</div>
            <div className="text-lg font-bold tabular-nums leading-none">{steps.toLocaleString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
            <MapPin size={18} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 leading-none mb-1">Distance</div>
            <div className="text-lg font-bold tabular-nums leading-none">{distance.toFixed(2)}<span className="text-[10px] ml-0.5 text-gray-500">KM</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(FitnessRing);
