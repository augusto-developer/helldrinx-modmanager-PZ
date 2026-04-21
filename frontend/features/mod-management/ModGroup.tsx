import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Box, AlertTriangle, FolderOpen, ExternalLink } from 'lucide-react';
import type { Mod, Issue } from '../../types/mod_manager';
import { THEME } from '../../theme/design_system';
import { ipcService } from '../../services/ipcService';
import { useMods } from '../../context/ModContext';

interface ModGroupProps {
  workshopId: string;
  mods: Mod[];
  serverMods: string[];
  issues: Issue[];
  type: 'active' | 'unactivated';
  onActivate?: (id: string) => void;
  onDeactivate?: (id: string) => void;
}

export const ModGroup: React.FC<ModGroupProps> = ({
  workshopId,
  mods,
  serverMods,
  issues,
  type,
  onActivate,
  onDeactivate
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const groupModsIds = useMemo(() => mods.map(m => m.id), [mods]);
  const groupIssues = useMemo(() => issues.filter(i => groupModsIds.includes(i.modId)), [issues, groupModsIds]);
  
  const hasIncompatibility = useMemo(() => groupIssues.some(i => i.subType === 'rule'), [groupIssues]);
  const hasFileConflict = useMemo(() => groupIssues.some(i => i.type === 'conflict' && i.subType !== 'rule'), [groupIssues]);
  const hasMissing = useMemo(() => groupIssues.some(i => i.type === 'missing'), [groupIssues]);
  const { highlightedModId } = useMods();

  React.useEffect(() => {
    if (highlightedModId && groupModsIds.includes(highlightedModId)) {
      setIsExpanded(true);
    }
  }, [highlightedModId, groupModsIds]);

  // O "Principal" do grupo para o card de cabeçalho
  const mainMod = mods[0];
  const hasMultiple = mods.length > 1;

  const handleToggle = (e: React.MouseEvent) => {
    if (!hasMultiple) return;
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div id={`mod-${mainMod.id}`} className={`mb-3 border ${THEME.layout.borderRadius} overflow-hidden ${THEME.transitions.default} backdrop-blur-sm ${
        hasIncompatibility
          ? 'border-red-500/50 bg-red-500/10 shadow-[0_0_25px_rgba(239,68,68,0.2)]'
          : hasFileConflict
            ? 'border-orange-500/40 bg-orange-500/5 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
            : isExpanded
              ? 'border-red-500/30 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
              : `border-zinc-800/50 ${THEME.glass.card}`
      }`}>
      {/* Header Card */}
      <div
        className={`flex items-center gap-4 p-4 cursor-pointer relative group`}
        onClick={handleToggle}
      >
        {/* Poster */}
        <div className="relative flex-shrink-0">
          {mainMod.poster_url ? (
            <img
              src={mainMod.poster_url}
              alt="poster"
              className="w-16 h-16 object-cover rounded-lg shadow-lg border border-zinc-800 group-hover:border-zinc-600 transition-colors"
            />
          ) : (
            <div className="w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700">
              <Box size={20} className="text-zinc-600" />
            </div>
          )}
          {hasMultiple && (
            <div className="absolute -top-2 -right-2 bg-red-600 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-red-500 shadow-xl">
              +{mods.length - 1}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-zinc-100 truncate tracking-tight">{mainMod.name}</h3>
            {hasMultiple && (
              <div
                className={`p-1 rounded-md transition-all border ${isExpanded
                    ? 'bg-red-500 border-red-400 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-500 group-hover:text-red-500 group-hover:border-red-500/50 group-hover:bg-red-500/10'
                  }`}
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[10px] text-zinc-500 font-mono tracking-tighter">ID: {workshopId}</p>
          </div>

          {/* Main Mod specific issues (Always visible since it's the Core) */}
          <div className="mt-2 flex flex-wrap gap-2">
            {issues.filter(i => i.modId === mainMod.id).map((issue, idx) => {
              const isRule = issue.subType === 'rule';
              const isMissing = issue.type === 'missing';
              return (
                <span key={idx} className={`text-[8px] font-black uppercase tracking-tight flex items-center gap-1 ${
                  isRule ? 'text-red-500' : (isMissing ? 'text-amber-500' : 'text-orange-500')
                }`}>
                  <AlertTriangle size={10} />
                  {issue.detail}
                </span>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (mainMod.absolute_path) ipcService.openFolder(mainMod.absolute_path);
            }}
            className="p-2 rounded-md text-zinc-600 hover:text-zinc-100 hover:bg-white/5 transition-all active:scale-95"
            title="Open Local Folder"
          >
            <FolderOpen size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (mainMod.workshop_id && mainMod.workshop_id !== '0') {
                ipcService.openUrl(`steam://url/CommunityFilePage/${mainMod.workshop_id}`);
              }
            }}
            className="p-2 rounded-md text-zinc-600 hover:text-zinc-100 hover:bg-white/5 transition-all active:scale-95"
            title="Open Steam Workshop"
          >
            <ExternalLink size={14} />
          </button>

          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (type === 'active') {
                onDeactivate?.(mainMod.id);
              } else {
                onActivate?.(mainMod.id);
              }
            }}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${type === 'active'
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-950 border border-zinc-700'
              }`}
          >
            {type === 'active' ? 'Remove' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Sub-mods List */}
      <AnimatePresence>
        {isExpanded && hasMultiple && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="border-t border-zinc-800/50 bg-black/40 overflow-hidden"
          >
            <div className="p-2 space-y-1">
              {mods.slice(1).map((mod) => (
                <div
                  key={mod.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/20 transition-colors border border-transparent hover:border-zinc-800 group/item"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="w-1 h-1 rounded-full bg-zinc-700" />
                      <div className="w-0.5 h-4 bg-zinc-800" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-zinc-300 truncate">{mod.name}</span>
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">Shard</span>
                      </div>
                      <p className="text-[9px] text-zinc-600 font-mono">ID: {mod.id}</p>

                      {/* Individual Mod Issues */}
                      {issues.filter(i => i.modId === mod.id).map((issue, iIdx) => {
                        const isRule = issue.subType === 'rule';
                        const isMissing = issue.type === 'missing';
                        return (
                          <div key={iIdx} className={`mt-1 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                            isRule ? 'text-red-500' : (isMissing ? 'text-amber-500' : 'text-orange-500')
                          }`}>
                            <AlertTriangle size={10} />
                            {issue.detail}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div id={`mod-${mod.id}`} className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-0" />

                  <div className="flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mod.absolute_path) ipcService.openFolder(mod.absolute_path);
                      }}
                      className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-100 hover:bg-white/5 transition-all active:scale-95"
                      title="Open Local Folder"
                    >
                      <FolderOpen size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mod.workshop_id && mod.workshop_id !== '0') {
                          ipcService.openUrl(`steam://url/CommunityFilePage/${mod.workshop_id}`);
                        }
                      }}
                      className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-100 hover:bg-white/5 transition-all active:scale-95"
                      title="Open Steam Workshop"
                    >
                      <ExternalLink size={12} />
                    </button>
                    <div className="w-[1px] h-3 bg-zinc-800 mx-0.5" />
                    <button
                      onClick={() => {
                        const isActive = serverMods.includes(mod.id);
                        if (isActive) {
                          onDeactivate?.(mod.id);
                        } else {
                          onActivate?.(mod.id);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${serverMods.includes(mod.id)
                          ? 'text-red-500 hover:bg-red-500/10'
                          : 'text-zinc-500 hover:text-zinc-100'
                        }`}
                    >
                      {serverMods.includes(mod.id) ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
