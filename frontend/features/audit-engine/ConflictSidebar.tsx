import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, AlertTriangle, Package, Search, EyeOff, Activity } from 'lucide-react';
import { THEME } from '../../theme/design_system';
import type { Issue, DiagnosisReport } from '../../types/mod_manager';
import { ConflictDiagnosisModal } from './ConflictDiagnosisModal';
import { useMods } from '../../context/ModContext';

interface ConflictSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  issues: Issue[];
  onLocateMod: (modId: string) => void;
  onIgnoreConflict: (fingerprint: string) => void;
  onDiagnose: (fingerprint: string, fileKey?: string) => Promise<DiagnosisReport | null>;
}

export const ConflictSidebar: React.FC<ConflictSidebarProps> = ({
  isOpen,
  onClose,
  issues,
  onLocateMod,
  onIgnoreConflict,
  onDiagnose
}) => {
  const [activeTab, setActiveTab] = React.useState<'conflicts' | 'missing' | 'ignored'>('conflicts');
  const [confirmIgnoreId, setConfirmIgnoreId] = React.useState<string | null>(null);
  const [diagnosisReport, setDiagnosisReport] = React.useState<DiagnosisReport | null>(null);
  const [isDiagnosisOpen, setIsDiagnosisOpen] = React.useState(false);
  const [showFooter, setShowFooter] = React.useState(true);
  const { mods, ignoredIssues, restoreConflict } = useMods();

  const handleLocateFile = (fileKey: string, modId: string) => {
    const mod = mods.find(m => m.id === modId);
    if (!mod) {
      onLocateMod(modId);
      return;
    }
    
    // Construct absolute path. Files are relative to media/
    const fullPath = `${mod.absolute_path}\\media\\${fileKey.replace(/\//g, '\\')}`;
    window.electron.showItemInFolder(fullPath);
  };

  const groupedConflicts = React.useMemo(() => {
    const conflicts = issues.filter(i => i.type === 'conflict');
    const groups: Record<string, Issue[]> = {};
    
    conflicts.forEach(issue => {
      // Primary grouping by file path, fallback to detail
      const key = issue.file?.toLowerCase() || issue.detail.toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(issue);
    });
    
    return Object.entries(groups).map(([fileName, groupIssues]) => {
      // Deduplicate mods involved in this entire file conflict group
      const modMap = new Map<string, string>();
      const entryMap = new Map<string, { detail: string, fingerprint?: string }>();
      
      groupIssues.forEach(i => {
        modMap.set(i.modId, i.modName);
        // Track unique "entries" (logic identifiers or snippets) within the file
        const entryKey = i.fingerprint || i.detail;
        if (!entryMap.has(entryKey)) {
          entryMap.set(entryKey, { detail: i.detail, fingerprint: i.fingerprint });
        }
      });
      
      const modsInvolved = Array.from(modMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => {
          // Sorting to keep consistency: Winner (last in active list) should be last
          // This is a heuristic as we don't have the full order here, but it helps.
          return 0; 
        });

      const uniqueEntries = Array.from(entryMap.values());

      return {
        fileKey: groupIssues[0].file || groupIssues[0].detail,
        title: groupIssues[0].file || groupIssues[0].detail,
        subType: groupIssues[0].subType,
        modsInvolved,
        uniqueEntries,
        // For technical actions, use the first valid fingerprint
        primaryFingerprint: uniqueEntries.find(e => e.fingerprint)?.fingerprint
      };
    });
  }, [issues]);

  const groupedMissing = React.useMemo(() => {
    const missing = issues.filter(i => i.type === 'missing');
    const groups: Record<string, Issue[]> = {};
    
    missing.forEach(issue => {
      if (!groups[issue.modId]) groups[issue.modId] = [];
      groups[issue.modId].push(issue);
    });
    
    return Object.entries(groups).map(([modId, groupIssues]) => ({
      modId,
      modName: groupIssues[0].modName,
      groupIssues
    }));
  }, [issues]);

  const groupedIgnored = React.useMemo(() => {
    const groups: Record<string, Issue[]> = {};
    
    ignoredIssues.forEach(issue => {
      const fileKey = issue.file || issue.detail;
      if (!groups[fileKey]) groups[fileKey] = [];
      groups[fileKey].push(issue);
    });
    
    return Object.entries(groups).map(([fileKey, groupIssues]) => {
      const modMap = new Map<string, string>();
      const entryMap = new Map<string, Issue>();
      
      groupIssues.forEach(issue => {
        modMap.set(issue.modId, issue.modName);
        entryMap.set(`${issue.modId}-${issue.subType}`, issue);
      });

      return {
        fileKey: groupIssues[0].file || groupIssues[0].detail,
        title: groupIssues[0].file || groupIssues[0].detail,
        subType: groupIssues[0].subType,
        modsInvolved: Array.from(modMap.entries()).map(([id, name]) => ({ id, name })),
        uniqueEntries: Array.from(entryMap.values()),
        primaryFingerprint: groupIssues[0].fingerprint
      };
    });
  }, [ignoredIssues]);

  const handleRunDiagnosis = async (fingerprint: string, fileKey?: string) => {
    if (fingerprint.startsWith('legacy-')) return;
    setIsDiagnosisOpen(true);
    setDiagnosisReport(null);
    const report = await onDiagnose(fingerprint, fileKey);
    setDiagnosisReport(report);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed top-0 left-0 h-screen w-96 ${THEME.glass.modal} border-r border-white/10 z-[101] flex flex-col shadow-2xl`}
            >
              {/* Header */}
              <div className="p-8 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1">Audit Center</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Security & Stability Scan</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="px-8 mb-6 shrink-0">
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1">
                    <button
                      onClick={() => setActiveTab('conflicts')}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter flex flex-col items-center justify-center transition-all ${activeTab === 'conflicts'
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                        : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                      <AlertTriangle size={14} className="mb-0.5" />
                      Conflicts ({groupedConflicts.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('missing')}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter flex flex-col items-center justify-center transition-all ${activeTab === 'missing'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                      <AlertCircle size={14} className="mb-0.5" />
                      Missing ({groupedMissing.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('ignored')}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter flex flex-col items-center justify-center transition-all ${activeTab === 'ignored'
                        ? 'bg-zinc-700 text-white shadow-lg shadow-zinc-800/20'
                        : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                      <EyeOff size={14} className="mb-0.5" />
                      Ignored ({ignoredIssues.length})
                    </button>
              </div>
            </div>

            {/* Issues List */}
            <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 custom-scrollbar">
                {activeTab === 'conflicts' ? (
                  groupedConflicts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <Package size={48} className="text-zinc-800 mb-4" />
                      <p className="text-zinc-500 font-bold text-sm tracking-tight">No conflicts detected.</p>
                      <p className="text-[10px] text-zinc-600 uppercase mt-1 tracking-widest">Everything looks stable</p>
                    </div>
                  ) : (
                    groupedConflicts.map((group, idx) => (
                      <motion.div
                        key={group.fileKey}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 rounded-2xl border bg-red-500/5 border-red-500/20 group"
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <div className="p-2 rounded-lg bg-red-500 text-white shadow-lg shadow-red-500/20">
                            <AlertTriangle size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[10px] font-black text-white/40 mb-1 uppercase tracking-widest leading-none">
                              {group.subType === 'file' ? 'Core File Overlap' : 'Logic Modification'}
                            </h3>
                            <p className="text-sm font-black text-red-500 leading-tight uppercase tracking-tight break-all decoration-red-500/20 underline underline-offset-4 decoration-2">
                              {group.title}
                            </p>
                            
                            {/* Logic Overrides List */}
                            {group.subType === 'logic' && group.uniqueEntries.length > 0 && (
                              <div className="mt-4 px-2 space-y-1">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 opacity-50">Affected Logic</p>
                                {group.uniqueEntries.map((e, eIdx) => (
                                  <div key={eIdx} className="text-[10px] font-bold text-red-400 flex items-center gap-2 italic">
                                    <div className="w-1 h-1 rounded-full bg-red-500/60" />
                                    {e.detail}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Consolidated Collision Matrix */}
                            <div className="mt-5 space-y-2 bg-black/20 p-3 rounded-xl border border-white/5">
                              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2 px-1">Collision Matrix</p>
                              {group.modsInvolved.map((m, mIdx) => (
                                <div key={m.id} className="flex items-center justify-between px-1 gap-4">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-1 h-1 rounded-full shrink-0 ${mIdx === group.modsInvolved.length - 1 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-zinc-700'}`} />
                                    <span className={`text-[10px] font-black tracking-tight truncate ${mIdx === group.modsInvolved.length - 1 ? 'text-zinc-100' : 'text-zinc-500'}`}>
                                      {m.name}
                                    </span>
                                  </div>
                                  <div className="shrink-0 flex items-center gap-2">
                                    <button 
                                      onClick={() => onLocateMod(m.id)}
                                      className="text-[8px] font-black text-zinc-500 hover:text-white uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all active:scale-95"
                                    >
                                      Jump
                                    </button>
                                    {mIdx === group.modsInvolved.length - 1 ? (
                                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/10 shadow-sm animate-pulse">Winner</span>
                                    ) : (
                                      <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Overwritten</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <button
                            onClick={() => {
                              const winnerMod = group.modsInvolved[group.modsInvolved.length - 1];
                              handleLocateFile(group.fileKey, winnerMod.id);
                            }}
                            className="py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5 active:scale-95"
                          >
                            <Search size={12} />
                            Locate
                          </button>

                          <button
                            onClick={() => {
                              if (group.primaryFingerprint) {
                                handleRunDiagnosis(group.primaryFingerprint, group.fileKey);
                              }
                            }}
                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-blue-500/20 shadow-lg ${
                              !group.primaryFingerprint 
                              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                              : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white shadow-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                            }`}
                            disabled={!group.primaryFingerprint}
                          >
                            <Activity size={12} />
                            Diagnose
                          </button>
                        </div>

                        {group.primaryFingerprint && (
                          <button
                            onClick={() => {
                              if (confirmIgnoreId === group.primaryFingerprint) {
                                onIgnoreConflict(group.primaryFingerprint!);
                                setConfirmIgnoreId(null);
                              } else {
                                setConfirmIgnoreId(group.primaryFingerprint!);
                              }
                            }}
                            onMouseLeave={() => setConfirmIgnoreId(null)}
                            className={`w-full mt-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/5 ${
                              confirmIgnoreId === group.primaryFingerprint
                              ? 'bg-red-600 text-white opacity-100 animate-pulse'
                              : 'bg-white/5 text-zinc-400 opacity-50 hover:opacity-100 hover:bg-white/10 hover:text-white'
                            }`}
                            title="Ignore files in this group"
                          >
                            {confirmIgnoreId === group.primaryFingerprint ? (
                              <>
                                <AlertTriangle size={12} />
                                CONFIRM IGNORE?
                              </>
                            ) : (
                              <>
                                <EyeOff size={12} />
                                Ignore Alert
                              </>
                            )}
                          </button>
                        )}
                      </motion.div>
                    ))
                  )
                ) : activeTab === 'missing' ? (
                  groupedMissing.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <Package size={48} className="text-zinc-800 mb-4" />
                      <p className="text-zinc-500 font-bold text-sm tracking-tight">No missing dependencies.</p>
                      <p className="text-[10px] text-zinc-600 uppercase mt-1 tracking-widest">Library is complete</p>
                    </div>
                  ) : (
                    groupedMissing.map((group) => (
                      <motion.div
                        key={group.modId}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 rounded-2xl border bg-amber-500/5 border-amber-500/20 group"
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <div className="p-2 rounded-lg bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                            <AlertCircle size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xs font-black text-white truncate mb-1 uppercase tracking-tight">Missing Requirements</h3>
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">
                              {group.modName}
                            </p>
                            <div className="space-y-1">
                              {group.groupIssues.map((i, subIdx) => (
                                <div key={subIdx} className="text-[9px] font-bold text-zinc-400 flex items-center gap-2">
                                  <div className="w-1 h-1 rounded-full bg-amber-500/40" />
                                  {i.detail}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => onLocateMod(group.modId)}
                          className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white border border-amber-500/20"
                        >
                          <Search size={12} />
                          Locate Mod
                        </button>
                      </motion.div>
                    ))
                  )
                ) : (
                  groupedIgnored.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <EyeOff size={48} className="text-zinc-800 mb-4" />
                      <p className="text-zinc-500 font-bold text-sm tracking-tight">No ignored alerts.</p>
                      <p className="text-[10px] text-zinc-600 uppercase mt-1 tracking-widest">Safe & Sound</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groupedIgnored.map((group, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-4 rounded-2xl border bg-zinc-900/50 border-white/5 group"
                        >
                          <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400 shadow-lg">
                              {group.subType === 'logic' ? <Activity size={14} /> : <AlertTriangle size={14} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-[10px] font-black text-white/40 mb-1 uppercase tracking-widest leading-none">
                                {group.subType === 'file' ? 'Core File Overlap (Ignored)' : 'Logic Modification (Ignored)'}
                              </h3>
                              <p className="text-sm font-black text-zinc-100 leading-tight uppercase tracking-tight break-all border-b border-white/5 pb-1">
                                {group.title}
                              </p>
                              
                              {/* Consolidated Collision Matrix */}
                              <div className="mt-5 space-y-2 bg-black/20 p-3 rounded-xl border border-white/5">
                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2 px-1">Collision Matrix</p>
                                {group.modsInvolved.map((m, mIdx) => (
                                  <div key={m.id} className="flex items-center justify-between px-1 gap-4">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={`w-1 h-1 rounded-full shrink-0 ${mIdx === group.modsInvolved.length - 1 ? 'bg-zinc-500 shadow-[0_0_8px_rgba(161,161,170,0.5)]' : 'bg-zinc-800'}`} />
                                      <span className={`text-[10px] font-black tracking-tight truncate ${mIdx === group.modsInvolved.length - 1 ? 'text-zinc-100' : 'text-zinc-500'}`}>
                                        {m.name}
                                      </span>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                      <button 
                                        onClick={() => onLocateMod(m.id)}
                                        className="text-[8px] font-black text-zinc-500 hover:text-white uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all active:scale-95"
                                      >
                                        Jump
                                      </button>
                                      {mIdx === group.modsInvolved.length - 1 ? (
                                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border border-zinc-500/20 bg-zinc-500/10">Winner</span>
                                      ) : (
                                        <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Overwritten</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => group.primaryFingerprint && restoreConflict(group.primaryFingerprint)}
                            className="w-full py-3 rounded-xl bg-zinc-800 text-[10px] font-black text-white hover:bg-blue-600 border border-white/10 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-[0.2em]"
                          >
                            <Activity size={12} />
                            RESTORE ALERT
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Footer */}
              {showFooter && (
                <div className="p-8 border-t border-white/5 bg-black/20 flex items-start gap-4 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <p className="flex-1 text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-loose">
                    💡 Fix these issues to ensure your server doesn't crash on startup. Overlapping files may cause unpredictable behavior.
                  </p>
                  <button 
                    onClick={() => setShowFooter(false)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-700 hover:text-zinc-400 transition-all active:scale-95"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConflictDiagnosisModal 
        isOpen={isDiagnosisOpen}
        onClose={() => setIsDiagnosisOpen(false)}
        report={diagnosisReport}
      />
    </>
  );
};
