/**
 * HellDrinx V2 - Design System Tokens
 * Single source of truth for the premium glassmorphism aesthetic.
 */

export const THEME = {
  colors: {
    accent: 'red-600',
    accentHover: 'red-700',
    accentLight: 'red-500',
    bg: '#0a0a0c',
    border: 'white/5',
    text: 'zinc-200',
    textMuted: 'zinc-500',
  },
  
  glass: {
    sidebar: 'bg-[#0a0a0c] backdrop-blur-3xl border-r border-white/5 shadow-2xl',
    card: 'bg-black/40 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all duration-300',
    header: 'bg-transparent backdrop-blur-sm border-b border-white/5',
    input: 'bg-black/60 backdrop-blur-xl border border-white/10 focus:border-red-500/50',
    modal: 'bg-[#0a0a0c]/90 backdrop-blur-2xl border border-white/10 shadow-3xl',
  },
  
  layout: {
    sidebarWidth: 'w-72',
    maxWidth: 'max-w-7xl',
    borderRadius: 'rounded-2xl',
  },

  transitions: {
    default: 'transition-all duration-200 ease-in-out',
    slow: 'transition-all duration-500 ease-in-out',
  }
};
