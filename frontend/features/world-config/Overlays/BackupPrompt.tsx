import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, ShieldCheck } from 'lucide-react';

interface BackupPromptProps {
  show: boolean;
  onClose: () => void;
  customBackupName: string;
  setCustomBackupName: (name: string) => void;
  onConfirm: (withBackup: boolean) => void;
}

const BackupPrompt: React.FC<BackupPromptProps> = ({
  show,
  onClose,
  customBackupName,
  setCustomBackupName,
  onConfirm
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-zinc-950 border border-amber-900/20 rounded-[2rem] p-8 max-w-md w-full text-center shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-600/5 blur-[60px] -z-10" />

            <div className="w-24 h-24 mx-auto mb-8 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full" />
              <img 
                src="/assets/trigger_preset_icon.png" 
                alt="Safety" 
                className="w-20 h-20 object-contain relative z-10 brightness-110 drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]" 
              />
            </div>

            <h3 className="text-white text-3xl font-black mb-2 tracking-tighter uppercase">Safety Protocol</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-8">System Integrity Backup</p>

            <div className="w-12 h-1 bg-gradient-to-r from-transparent via-amber-600/30 to-transparent mx-auto mb-8 rounded-full" />

            <p className="text-zinc-400 text-[10px] leading-relaxed mb-8 font-bold uppercase tracking-[0.15em]">
              Create a <b className="text-amber-500">structural backup</b> of your server folder before deploying these presets?
            </p>

            {/* Editable Backup Name field */}
            <div className="bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-md rounded-2xl p-5 mb-8 text-left relative overflow-hidden group">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3 block">Backup Filename</label>
              
              <div className="flex items-center gap-3 bg-black/40 border border-zinc-800/50 rounded-xl px-4 h-12 focus-within:border-amber-500/50 transition-all">
                <input 
                  type="text"
                  value={customBackupName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomBackupName(e.target.value)}
                  placeholder="Enter name..."
                  className="bg-transparent border-none outline-none text-zinc-100 text-xs font-bold w-full placeholder:text-zinc-800"
                />
                <div className="px-2 py-0.5 bg-zinc-900 rounded border border-zinc-800">
                  <span className="text-zinc-600 text-[8px] font-black uppercase tracking-widest">.ZIP</span>
                </div>
              </div>
              
              <p className="text-[7px] text-zinc-700 mt-3 uppercase font-bold tracking-[0.15em] leading-relaxed">
                Chars like / \ : * ? " &lt; &gt; | will be purged.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => onConfirm(true)}
                className="group relative py-4 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-[0_15px_30px_rgba(245,158,11,0.2)] active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <ShieldCheck size={16} />
                <span>Execute Backup & Sync</span>
              </button>

              <button
                onClick={() => onConfirm(false)}
                className="py-4 bg-zinc-900/40 hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 border border-zinc-800/50 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
              >
                Skip Safety Step
              </button>
            </div>

            <button
              onClick={onClose}
              className="mt-8 text-zinc-700 hover:text-red-500/80 text-[8px] font-black uppercase tracking-[0.3em] transition-colors"
            >
              Abort Deployment
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BackupPrompt;
