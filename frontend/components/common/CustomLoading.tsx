import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint } from 'lucide-react';

interface CustomLoadingProps {
  message?: string;
  variant?: 'full' | 'mini';
}

export const CustomLoading: React.FC<CustomLoadingProps> = ({ message, variant = 'full' }) => {
  const [dots, setDots] = useState('');

  // Simple "..." animation for the text
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (variant === 'mini') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 50, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 50, scale: 0.9 }}
        className="fixed bottom-12 right-12 z-[1000] flex items-center gap-4 pl-5 pr-7 py-3.5 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        {/* SMALL LOGO / ICON */}
        <div className="relative">
          <motion.div
            animate={{ 
              opacity: [0.5, 1, 0.5],
              scale: [0.95, 1.05, 0.95]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20"
          >
            <PawPrint size={20} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" fill="currentColor" />
          </motion.div>
          {/* Scanning Line overlay */}
          <motion.div 
             animate={{ top: ["0%", "100%", "0%"] }}
             transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
             className="absolute left-0 right-0 h-[2px] bg-amber-500/40 blur-[1px] z-10"
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-white italic tracking-widest uppercase">
              HELL<span className="text-amber-500">DRINX</span>
            </span>
            <div className="w-1 h-1 rounded-full bg-zinc-700" />
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Processing</span>
          </div>
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-0.5">
            {message || "Syncing Data"}{dots}
          </p>
        </div>

        {/* Small Progress Indicator (Edge glow) */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
          <motion.div 
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute h-full w-24 bg-gradient-to-r from-transparent via-amber-500 to-transparent"
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-[#050506]/95 backdrop-blur-2xl overflow-hidden"
    >
      {/* Background Cinematic Flare */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[120px]" />
        <div 
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `radial-gradient(circle at center, transparent 0%, #000 100%)` }}
        />
      </div>

      <div className="relative flex flex-col items-center">
        
        {/* CAT WALK ANIMATION: Staggered Paws */}
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ 
                opacity: [0, 1, 0],
                y: [10, 0, -5],
                scale: [0.8, 1.1, 1],
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut"
              }}
              className="text-amber-500/80"
              style={{
                // Alternate tilt for natural walk look
                rotate: i % 2 === 0 ? '-15deg' : '15deg',
                marginTop: i % 2 === 0 ? '0' : '15px'
              }}
            >
              <PawPrint size={32} fill="currentColor" className="drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]" />
            </motion.div>
          ))}
        </div>

        {/* LOADING TEXT - IMPACT STYLE */}
        <div className="flex flex-col items-center gap-1">
          <motion.div
             initial={{ letterSpacing: "1em", opacity: 0 }}
             animate={{ letterSpacing: "0.3em", opacity: 1 }}
             className="text-3xl font-black italic text-white flex items-center tracking-[0.3em] drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            HELL<span className="text-amber-500">DRINX</span>
          </motion.div>
          
          <div className="h-6 flex items-center justify-center mt-2">
            <p className="text-[10px] font-black uppercase tracking-[0.6em] text-zinc-500 pl-2">
              {message || "ESTABLISHING MODULAR LINK"}{dots}
            </p>
          </div>
        </div>

        {/* PREMIUM PROGRESS BAR */}
        <div className="mt-12 w-64 h-[2px] bg-zinc-900 rounded-full overflow-hidden relative">
          {/* The Actual Scanner */}
          <motion.div 
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute h-full w-full bg-gradient-to-r from-transparent via-amber-500 to-transparent"
          />
          {/* Subtle base progress */}
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute h-full bg-amber-500/10"
          />
        </div>
      </div>

      {/* SYSTEM IDENTIFIER (BOTTOM) */}
      <div className="fixed bottom-12 flex flex-col items-center opacity-40">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-zinc-600" />
          <span className="text-[8px] font-black uppercase tracking-[0.5em] text-zinc-500 italic">
            Developed by Augusto-Developer (Lopez)
          </span>
          <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-zinc-600" />
        </div>
      </div>
    </motion.div>
  );
};
