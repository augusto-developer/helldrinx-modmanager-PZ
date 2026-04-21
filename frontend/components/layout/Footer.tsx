import React, { useState } from 'react';
import { ArrowUpCircle, Download } from 'lucide-react';

/**
 * 🛠️ HellDrinx Engine Footer
 * Global status bar spanning the full window width.
 * Displays version branding and update notifications.
 */
export const Footer: React.FC = () => {
  // Mock state for demonstration - will be connected to auto-updater logic later
  const [hasUpdate] = useState(false);
  const APP_VERSION = "V2.2.0-STABLE";

  return (
    <footer className="h-8 bg-zinc-950/60 backdrop-blur-md border-t border-white/5 flex items-center justify-between px-8 shrink-0 z-20 relative">
      {/* LEFT: Version Branding & Updates */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <span className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-500">
            HellDrinx Engine <span className="text-zinc-400">{APP_VERSION}</span>
          </span>
        </div>

        {hasUpdate && (
          <div className="flex items-center animate-in fade-in slide-in-from-left-2 duration-700">
            <div className="h-4 w-px bg-white/10 mx-2" />
            <div className="flex items-center gap-3 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 group hover:bg-amber-500/20 transition-all cursor-pointer">
              <ArrowUpCircle size={10} className="text-amber-500 animate-bounce" />
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-amber-500">New Version Available</span>
              <button className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-white hover:text-cyan-400 transition-colors">
                <Download size={8} />
                Update Now
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center">
        <button 
          onClick={() => window.electron.openUrl("https://ko-fi.com/A0A71Y6UGF")}
          className="hover:scale-110 active:scale-95 transition-all duration-300 flex items-center opacity-80 hover:opacity-100 hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] cursor-pointer"
        >
          <img 
            style={{ border: '0px', height: '18px' }} 
            src="https://storage.ko-fi.com/cdn/kofi6.png?v=6" 
            alt="Buy Me a Coffee at ko-fi.com" 
          />
        </button>
      </div>

      {/* RIGHT: Credits */}
      <span className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">
        Developed by augusto-developer (Lopez)
      </span>
    </footer>
  );
};
