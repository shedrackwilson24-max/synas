import React, { memo } from 'react';
import { motion } from 'motion/react';

function Logo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative flex items-center justify-center ${className} group`}
    >
      <img 
        src="/logo.png" 
        alt="Synapse Logo" 
        className="w-full h-full object-contain relative z-10"
        referrerPolicy="no-referrer"
      />
    </motion.div>
  );
}

export default memo(Logo);
