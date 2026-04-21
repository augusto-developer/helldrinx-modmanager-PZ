import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavButtonProps {
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  colorContrast: string; // e.g., "amber-500"
  element?: 'nature' | 'lightning' | 'bubbles';
}

const Particle: React.FC<{ element: string, color: string }> = ({ element, color }) => {
  const randomX = Math.random() * 100;
  const randomY = Math.random() * 100;
  const randomDelay = Math.random() * 2;
  const randomDuration = 2 + Math.random() * 2;

  if (element === 'nature') {
    return (
      <motion.svg
        viewBox="0 0 24 24"
        className="absolute w-3 h-3 opacity-40 pointer-events-none"
        style={{ left: `${randomX}%`, top: `${randomY}%`, color }}
        initial={{ opacity: 0, scale: 0, rotate: 0 }}
        animate={{ 
          opacity: [0, 0.6, 0], 
          scale: [0.5, 1, 0.5], 
          rotate: [0, 360],
          x: [0, 40],
          y: [0, -20]
        }}
        transition={{ duration: randomDuration, repeat: Infinity, delay: randomDelay }}
      >
        <path fill="currentColor" d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,11 17,8 17,8Z" />
      </motion.svg>
    );
  }

  if (element === 'lightning') {
    return (
      <motion.div
        className="absolute w-px h-8 blur-[0.5px] pointer-events-none"
        style={{ left: `${randomX}%`, top: `${randomY}%`, backgroundColor: color }}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ 
          opacity: [0, 1, 0], 
          scaleY: [0, 1.5, 0],
          x: [0, (Math.random() - 0.5) * 20]
        }}
        transition={{ duration: 0.1 + Math.random() * 0.2, repeat: Infinity, repeatDelay: Math.random() * 2 }}
      />
    );
  }

  if (element === 'bubbles') {
    return (
      <motion.div
        className="absolute rounded-full pointer-events-none flex items-center justify-center"
        style={{ 
          left: `${randomX}%`, 
          bottom: '-10%', 
          width: 8 + Math.random() * 12, 
          height: 8 + Math.random() * 12,
          border: `1px solid ${color}44`,
          backgroundColor: `${color}11`,
          backdropFilter: 'blur(1px)'
        }}
        initial={{ opacity: 0, y: 0, scale: 0.5 }}
        animate={{ 
          opacity: [0, 1, 0.5, 0], 
          y: [0, -100],
          x: [0, Math.sin(randomDelay) * 30, Math.cos(randomDelay) * -30],
          scale: [0.5, 1.2, 1, 0.8]
        }}
        transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: randomDelay }}
      >
        {/* Bubble Highlight */}
        <div className="absolute top-1 left-1 w-1/4 h-1/4 bg-white/40 rounded-full blur-[0.5px]" />
      </motion.div>
    );
  }

  return null;
};

export const NavButton: React.FC<NavButtonProps> = ({
  label,
  icon,
  isActive,
  onClick,
  disabled,
  colorContrast,
  element
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const colorMap = {
    'amber-500': {
      text: 'text-amber-500',
      border: 'border-amber-500/40',
      bgGlow: 'from-amber-500/10',
      indicator: 'bg-amber-500',
      partColor: '#f59e0b'
    },
    'emerald-500': {
      text: 'text-emerald-500',
      border: 'border-emerald-500/40',
      bgGlow: 'from-emerald-500/10',
      indicator: 'bg-emerald-500',
      partColor: '#10b981'
    },
    'blue-500': {
      text: 'text-blue-500',
      border: 'border-blue-500/40',
      bgGlow: 'from-blue-500/10',
      indicator: 'bg-blue-500',
      partColor: '#3b82f6'
    }
  }[colorContrast as 'amber-500' | 'emerald-500' | 'blue-500'] || {
    text: 'text-white',
    border: 'border-white/5',
    bgGlow: 'from-white/10',
    indicator: 'bg-white',
    partColor: '#ffffff'
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={`
        relative w-full h-16 rounded-[1.2rem] overflow-hidden group transition-all duration-500
        border ${isActive ? colorMap.border : 'border-white/5'}
        ${disabled ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}
        ${isActive ? 'bg-zinc-900/60 shadow-xl' : 'bg-zinc-950/40'}
        backdrop-blur-xl
      `}
    >
      {/* Background Image / Icon Layer with Fade */}
      <motion.div
        initial={false}
        animate={{
          scale: isActive ? 1.15 : 1,
          opacity: (isActive || isHovered) ? 1 : 0.6,
          x: isHovered ? 5 : 0
        }}
        className="absolute inset-0 left-2 w-[70%] transition-all duration-700"
        style={{
          backgroundImage: `url(${icon})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left center',
          maskImage: 'linear-gradient(to right, black 25%, black 45%, transparent 95%)',
          WebkitMaskImage: 'linear-gradient(to right, black 25%, black 45%, transparent 95%)',
          zIndex: 0
        }}
      />

      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-zinc-950/80 z-10" />

      {/* Elemental Particles on Hover */}
      <AnimatePresence>
        {isHovered && !disabled && element && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <Particle key={i} element={element} color={colorMap.partColor} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Active State Glow Indicator */}
      {isActive && (
        <motion.div
          layoutId="activeGlow"
          className={`absolute inset-0 bg-gradient-to-r ${colorMap.bgGlow} to-transparent z-0`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}

      {/* Text Content */}
      <div className="relative z-30 h-full flex flex-col justify-center items-end pr-8">
        <span className={`
          text-base font-black italic tracking-tighter transition-all duration-300
          ${isActive ? `${colorMap.text} brightness-125` : 'text-zinc-400 group-hover:text-white'}
          uppercase tracking-[0.1em]
        `}>
          {label}
        </span>
        {isActive && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 40 }}
            className={`h-0.5 mt-1 ${colorMap.indicator} self-end rounded-full shadow-[0_0_10px_white]`}
          />
        )}
      </div>

      {/* Interaction Light Flash */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none bg-gradient-to-tr from-white/20 via-transparent to-transparent transition-opacity" />
    </motion.button>
  );
};
