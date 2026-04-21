import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, FileCode, Activity, Info, AlertTriangle } from 'lucide-react';
import { THEME } from '../../theme/design_system';
import type { DiagnosisReport } from '../../types/mod_manager';

interface ConflictDiagnosisModalProps {
  report: DiagnosisReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ConflictDiagnosisModal: React.FC<ConflictDiagnosisModalProps> = ({
  report,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.aiContext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (report && 'error' in report) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`relative w-full max-w-lg p-8 rounded-3xl ${THEME.glass.modal} border border-red-500/20 text-center shadow-2xl shadow-red-500/10`}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-widest">Diagnosis Failed</h2>
              <p className="text-sm text-zinc-400 font-medium">{(report as any).error}</p>
              <button 
                onClick={onClose}
                className="mt-4 px-8 py-3 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest border border-white/5"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  if (!report && isOpen) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`relative w-full max-w-lg p-8 rounded-3xl ${THEME.glass.modal} border border-white/10 text-center`}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
                <FileCode size={32} className="text-zinc-500" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-widest">Diagnosing...</h2>
              <p className="text-sm text-zinc-500 font-medium">Extracting code snippets and analyzing mod precedence.</p>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && report && !('error' in report) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`relative w-full max-w-6xl max-h-[90vh] rounded-3xl ${THEME.glass.modal} border border-white/10 shadow-2xl flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Conflict Diagnosis</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                      {report.issue.subType || 'logic'}
                    </span>
                    <span className="text-zinc-500 text-xs font-bold truncate max-w-md">
                      {report.issue.file || 'Multiple files'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    copied 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied Context' : 'Copy AI Report'}
                </button>
                <button
                  onClick={onClose}
                  className="p-3 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-white transition-all border border-transparent hover:border-white/5"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/20">
              
              {/* Winner Summary Banner */}
              <div className="mb-8 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between shadow-lg shadow-amber-500/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em] mb-1">Audit Result: Priority Winner</h3>
                    <p className="text-lg font-black text-white tracking-tight leading-none uppercase italic">
                      {report.mods[report.mods.length - 1].name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Final Status</div>
                  <div className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                    Active & Overriding
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {report.mods.map((mod, idx) => (
                  <div key={mod.id} className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                          idx === report.mods.length - 1 
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40 border border-amber-400' 
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                        }`}>
                          {idx === 0 ? 'A' : String.fromCharCode(65 + idx)}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-tight leading-none">
                            {mod.name}
                          </h4>
                          <p className="text-[10px] font-bold mt-1 uppercase tracking-widest text-zinc-500">
                            {idx === 0 ? 'Original Definition' : `Override Layer ${idx}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-600 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                          ID: {mod.id}
                        </span>
                      </div>
                    </div>

                    <div className="relative group">
                      <button 
                        onClick={() => {
                          const relPath = report.issue.file || '';
                          const fullPath = relPath 
                            ? `${mod.path}\\media\\${relPath.replace(/\//g, '\\')}`
                            : mod.path;
                          window.electron.showItemInFolder(fullPath);
                        }}
                        title="Locate Conflicting File"
                        className="absolute top-4 left-4 z-10 p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-zinc-500 group-hover:text-amber-500 group-hover:border-amber-500/50 group-hover:bg-amber-500/10 transition-all active:scale-90"
                      >
                        <FileCode size={14} />
                      </button>
                      <pre className="p-6 pt-12 rounded-2xl bg-black/40 border border-white/5 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto custom-scrollbar min-h-[300px] group-hover:border-white/10 transition-colors">
                        <code>{report.snippets[mod.id] || '// No specific snippet captured for this mod.'}</code>
                      </pre>
                      <div className="absolute top-4 right-4 text-[9px] font-black text-zinc-700 uppercase tracking-widest pointer-events-none">
                        Source Snippet
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Technical Note */}
              <div className="mt-8 p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Info size={16} />
                </div>
                <div className="space-y-1">
                  <h5 className="text-xs font-black text-white uppercase tracking-widest">Technical Diagnosis</h5>
                  <p className="text-xs text-zinc-500 leading-relaxed max-w-4xl">
                    In Project Zomboid, the mod load order dictates file precedence. The snippets above show the same definition path or function identifier being assigned in multiple places. 
                    <span className="text-amber-500/80 font-bold ml-1 uppercase text-[10px]">
                      Mod B will take total priority during game initialization.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-blue-400" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Diagnostic Engine Active</span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-none">
                Deep Conflict Resolution Tool v1.0
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
