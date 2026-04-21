import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, FolderSync, Info } from 'lucide-react';

interface GlobalBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (filename: string) => void;
  serverName: string;
}

const GlobalBackupModal: React.FC<GlobalBackupModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  serverName
}) => {
  const [filename, setFilename] = useState('');

  // Initial filename based on server name and timestamp
  useEffect(() => {
    if (isOpen) {
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const cleanName = serverName.replace(/[^a-z0-9]/gi, '_').toUpperCase();
      setFilename(`HELLDRINX_${cleanName}_${date}`);
    }
  }, [isOpen, serverName]);

  const handleConfirm = () => {
    const cleanFilename = filename.trim().replace(/[/\\:*?"<>|]/g, '_');
    if (cleanFilename) {
      onConfirm(cleanFilename);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        className="bg-zinc-950 border border-white/5 rounded-[2.5rem] p-10 max-w-lg w-full shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
      >
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] -z-10" />

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
        <div className="w-32 h-32 mx-auto mb-6 relative flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-500/25 blur-3xl rounded-full" />
          <img 
            src="assets/backup_icon.png" 
            alt="Backup" 
            className="w-24 h-24 object-contain relative z-10 brightness-110 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-transform hover:scale-110 duration-500" 
          />
        </div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase tracking-[0.05em]">
            Safety <span className="text-emerald-500">Protocol</span>
          </h2>
          <p className="mt-3 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">System Integrity Backup</p>
        </div>

        {/* Info Box */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FolderSync size={16} className="text-emerald-500" />
            <span className="text-[10px] font-black text-zinc-100 uppercase tracking-widest">Target Directories</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-[9px] font-black text-zinc-400 uppercase tracking-wider">/Server</span>
            <span className="px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-[9px] font-black text-zinc-400 uppercase tracking-wider">/Saves</span>
          </div>
          <div className="mt-4 flex items-start gap-2 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
            <Info size={14} className="text-emerald-500 mt-0.5" />
            <p className="text-[9px] font-bold text-emerald-500/80 leading-relaxed uppercase tracking-wide">
              Files will be compressed into a single ZIP archive.
            </p>
          </div>
        </div>

        {/* Input Section */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3 block ml-1">Archive Filename</label>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 h-14 focus-within:border-emerald-500/50 transition-all shadow-inner">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter backup name..."
                className="bg-transparent border-none outline-none text-zinc-100 text-xs font-black tracking-wide w-full placeholder:text-zinc-700"
              />
              <div className="px-3 py-1.5 bg-zinc-900 rounded-lg border border-white/5">
                <span className="text-zinc-500 text-[10px] font-black tracking-widest">.ZIP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onClose}
            className="py-4 px-6 bg-transparent hover:bg-white/5 text-zinc-500 hover:text-white rounded-2xl text-lg font-black italic uppercase tracking-tighter transition-all border border-white/5 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-lg font-black italic uppercase tracking-tighter transition-all shadow-[0_10px_30px_rgba(16,185,129,0.2)] active:scale-95 flex items-center justify-center gap-2"
          >
            <ShieldCheck size={18} />
            Execute
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/5 rounded-full transition-all"
        >
          <X size={20} />
        </button>
      </motion.div>
    </motion.div>
  );
};

export default GlobalBackupModal;
