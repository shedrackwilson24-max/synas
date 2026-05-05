import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ConnectionStatus({ hasData = false }: { hasData?: boolean }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-red-500 text-white rounded-full shadow-lg text-xs font-black uppercase tracking-widest"
        >
          <WifiOff size={14} className="animate-pulse" />
          Offline Mode Core Active
        </motion.div>
      )}
      {isOnline && (
         <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 text-gray-500"
         >
           <Wifi size={10} className={hasData ? "text-accent" : "text-gray-600"} />
           <span className="text-[8px] font-black uppercase tracking-widest leading-none text-gray-500">
             {hasData ? 'Connected' : 'No data yet'}
           </span>
         </motion.div>
      )}
    </AnimatePresence>
  );
}
