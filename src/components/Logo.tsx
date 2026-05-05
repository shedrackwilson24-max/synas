import React, { memo } from 'react';
import { motion } from 'motion/react';

function Logo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative flex items-center justify-center ${className}`}
    >
      <img 
        src="/regenerated_image_1777364200753.png" 
        alt="Synapse Logo" 
        className="w-full h-full object-contain rounded-2xl shadow-2xl shadow-accent/20"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-accent/10 rounded-2xl blur-xl -z-10 group-hover:bg-accent/20 transition-colors" />
    </motion.div>
  );
}

export default memo(Logo);
