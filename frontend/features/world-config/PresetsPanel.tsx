import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck, ShieldCheck, Zap, FolderSync, XCircle, Info } from 'lucide-react';
import { ipcService } from '../../services/ipcService';

// --- Particle Component for Elemental Effects ---
const Particle = ({ element, color }: { element: string, color: string }) => {
  const randomLeft = React.useMemo(() => Math.random() * 100, []);
  const randomTop = React.useMemo(() => Math.random() * 100, []);
  const destinationLeft = React.useMemo(() => Math.random() * 100, []);
  const destinationTop = React.useMemo(() => Math.random() * 100, []);
  const duration = React.useMemo(() => Math.random() * 2 + 1, []);
  const delay = React.useMemo(() => Math.random() * 0.5, []);

  return (
    <motion.div
      initial={{ 
        left: `${randomLeft}%`, 
        top: `${randomTop}%`, 
        opacity: 0, scale: 0,
        rotate: 0 
      }}
      animate={{ 
        left: [`${randomLeft}%`, `${destinationLeft}%`],
        top: [`${randomTop}%`, `${destinationTop}%`],
        opacity: [0, 0.8, 0],
        scale: [0, 1.2, 0.5],
        rotate: 360
      }}
      transition={{ 
        duration, 
        repeat: Infinity, 
        delay,
        ease: "easeOut" 
      }}
      className="absolute w-2 h-2 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {element === 'nature' ? (
        <svg viewBox="0 0 24 24" className="w-full h-full filter drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]" style={{ color }}>
          <path fill="currentColor" d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,11 17,8 17,8Z" />
        </svg>
      ) : (
        <div className="w-full h-full rounded-full blur-[1px] shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ backgroundColor: color }} />
      )}
    </motion.div>
  );
};

interface PresetsPanelProps {
  selectedIniPreset: string | null;
  setSelectedIniPreset: (val: string | null) => void;
  selectedLuaPreset: string | null;
  setSelectedLuaPreset: (val: string | null) => void;
  iniImportMode: 'full' | 'soft';
  setIniImportMode: (val: 'full' | 'soft') => void;
  importing: boolean;
  setShowBackupPrompt: (val: boolean) => void;
  setCustomBackupName: (val: string) => void;
}

const PresetsPanel: React.FC<PresetsPanelProps> = ({
  selectedIniPreset,
  setSelectedIniPreset,
  selectedLuaPreset,
  setSelectedLuaPreset,
  iniImportMode,
  setIniImportMode,
  importing,
  setShowBackupPrompt,
  setCustomBackupName
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 gap-6">
        {/* INI Section */}
        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><FileCheck size={18} /></div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Server Settings (.ini)</h4>
            </div>
            <button
              onClick={async () => {
                const file = await ipcService.selectFile([{ name: 'INI Files', extensions: ['ini'] }]);
                if (file) setSelectedIniPreset(file);
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
            >
              Choose File
            </button>
          </div>

          {selectedIniPreset && (
            <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-zinc-800/50">
              <span className="text-[10px] font-mono text-zinc-500 truncate flex-1">{selectedIniPreset}</span>
              <button onClick={() => setSelectedIniPreset(null)} className="text-zinc-600 hover:text-red-500 transition-colors"><XCircle size={14} /></button>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setIniImportMode('full')}
              className={`flex-1 p-4 rounded-xl border transition-all text-left group ${iniImportMode === 'full' ? 'border-amber-500/50 bg-amber-500/5 shadow-lg' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className={iniImportMode === 'full' ? 'text-amber-500' : 'text-zinc-600'} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${iniImportMode === 'full' ? 'text-white' : 'text-zinc-500'}`}>Full Preset</span>
              </div>
              <p className={`text-[10px] leading-relaxed transition-colors font-bold ${iniImportMode === 'full' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                Overwrites the entire <b className="text-zinc-200">.ini</b> file with the chosen preset.
                <br />All current server rules will be replaced.
              </p>
            </button>
            <button
              onClick={() => setIniImportMode('soft')}
              className={`flex-1 p-4 rounded-xl border transition-all text-left group ${iniImportMode === 'soft' ? 'border-blue-500/50 bg-blue-500/5 shadow-lg' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className={iniImportMode === 'soft' ? 'text-blue-500' : 'text-zinc-600'} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${iniImportMode === 'soft' ? 'text-white' : 'text-zinc-500'}`}>Soft Preset</span>
              </div>
              <p className={`text-[10px] leading-relaxed transition-colors font-bold ${iniImportMode === 'soft' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                Only edits <b className="text-zinc-200">Mods=</b>, <b className="text-zinc-200">Map=</b> and <b className="text-zinc-200">WorkshopItems=</b>.
                <br />Preserves gameplay rules.
              </p>
            </button>
          </div>
        </div>

        {/* Sandbox Section */}
        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><FolderSync size={18} /></div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Sandbox Parameters ( _SandboxVars.lua )</h4>
            </div>
            <button
              onClick={async () => {
                const file = await ipcService.selectFile([{ name: 'Lua Files', extensions: ['lua'] }]);
                if (file) setSelectedLuaPreset(file);
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
            >
              Choose File
            </button>
          </div>
          {selectedLuaPreset && (
            <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-zinc-800/50">
              <span className="text-[10px] font-mono text-zinc-500 truncate flex-1">{selectedLuaPreset}</span>
              <button onClick={() => setSelectedLuaPreset(null)} className="text-zinc-600 hover:text-red-500 transition-colors"><XCircle size={14} /></button>
            </div>
          )}
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest flex items-center gap-2 px-1">
            <Info size={12} className="text-amber-500" />
            SandboxVars.lua will be fully replaced by the imported file.
          </p>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <motion.button
          disabled={(!selectedIniPreset && !selectedLuaPreset) || importing}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            setCustomBackupName(`SERVER_BACKUP_${timestamp}`);
            setShowBackupPrompt(true);
          }}
          whileHover={!importing ? { scale: 1.02, y: -2 } : {}}
          whileTap={!importing ? { scale: 0.98 } : {}}
          className={`
            relative w-full max-w-[340px] h-18 rounded-2xl overflow-hidden group transition-all duration-500
            border ${(!selectedIniPreset && !selectedLuaPreset) || importing ? 'border-white/5 opacity-50 cursor-not-allowed' : 'border-emerald-500/30 cursor-pointer shadow-2xl shadow-emerald-900/10'}
            bg-zinc-950/40 backdrop-blur-xl
          `}
        >
          {/* Elemental Particles on Hover */}
          <AnimatePresence>
            {isHovered && !importing && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <Particle key={i} element="nature" color="#10b981" />
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Glow Indicator Layer */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent z-0" />

          {/* Text Content - Resized and Centered */}
          <div className="relative z-20 h-full flex flex-col justify-center items-center">
            <span className={`
              text-xl font-black italic tracking-tighter transition-all duration-300
              ${(!selectedIniPreset && !selectedLuaPreset) || importing ? 'text-zinc-600' : 'text-emerald-500 group-hover:brightness-125'}
              uppercase tracking-[0.2em]
            `}>
              {importing ? 'EXECUTING' : 'SAVE PRESET'}
            </span>
            {!importing && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: isHovered ? 60 : 0 }}
                className="h-0.5 mt-1 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"
              />
            )}
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default PresetsPanel;
