import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Mod, Issue } from '../../types/mod_manager';
import { Search, Info, X, XCircle } from 'lucide-react';
import { ModGroup } from './ModGroup';
import { THEME } from '../../theme/design_system';

interface ModListProps {
  mods: Mod[];
  serverMods: string[];
  issues: Issue[];
  type: 'active' | 'unactivated';
  onActivate?: (id: string) => void;
  onDeactivate?: (id: string) => void;
  onDeactivateAll?: () => void;
  loading?: boolean;
}

interface GroupedMod {
  workshopId: string;
  mods: Mod[];
  minOrder: number;
}

export const ModList: React.FC<ModListProps> = ({
  mods,
  serverMods,
  issues,
  type,
  onActivate,
  onDeactivate,
  onDeactivateAll,
  loading
}) => {
  const [search, setSearch] = useState('');

  // Clear search on tab switch
  React.useEffect(() => {
    setSearch('');
  }, [type]);

  const groups = useMemo(() => {
    if (!Array.isArray(mods)) return [];

    const uniqueMap = new Map<string, Mod>();
    mods.forEach(m => {
      if (m && m.id && !uniqueMap.has(m.id)) uniqueMap.set(m.id, m);
    });
    const uniqueList = Array.from(uniqueMap.values());

    let filtered = uniqueList;
    const activeSet = new Set(serverMods || []);

    if (type === 'active') {
      filtered = uniqueList.filter(m => activeSet.has(m.id));
    } else {
      filtered = uniqueList.filter(m => !activeSet.has(m.id));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.id || '').toLowerCase().includes(q) ||
        (m.workshop_id || '').toLowerCase().includes(q)
      );
    }

    const groupMap = new Map<string, Mod[]>();
    filtered.forEach(m => {
      const wid = m.workshop_id || `local-${m.id}`;
      if (!groupMap.has(wid)) groupMap.set(wid, []);
      groupMap.get(wid)!.push(m);
    });

    const safeServerMods = serverMods || [];
    const serverOrderMap = new Map(safeServerMods.map((id, index) => [id, index]));

    const groupList: GroupedMod[] = Array.from(groupMap.entries()).map(([wid, gMods]) => {
      const sortedGMods = [...gMods].sort((a, b) => {
        if (a.poster_url && !b.poster_url) return -1;
        if (!a.poster_url && b.poster_url) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      const indices = gMods.map(m => serverOrderMap.get(m.id) ?? 999999);
      const minOrder = Math.min(...indices);

      return { workshopId: wid, mods: sortedGMods, minOrder };
    });

    if (type === 'active') {
      return groupList.sort((a, b) => a.minOrder - b.minOrder);
    } else {
      return groupList.sort((a, b) => (a.mods[0]?.name || '').localeCompare(b.mods[0]?.name || ''));
    }
  }, [mods, serverMods, type, search]);

  if (!mods || mods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Info size={48} className="mb-4 opacity-50" />
        <p>No mods found in the Workshop directory.</p>
        <p className="text-sm mt-2">Configure the path by clicking the settings gear.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-6 pt-64 pb-0 sticky top-0 z-10 transition-all">
        {/* Unified Command Row (Search + Actions) */}
        <div className="max-w-5xl mx-auto mt-2 px-2 flex items-center justify-between gap-6 transition-all">
          {/* Search Bar Section */}
          <div className="flex-1 max-w-md relative group">
            <div className="absolute inset-0 bg-red-600/10 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-red-500 transition-all" size={20} />
            <input
              type="text"
              placeholder="Search mods by name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full ${THEME.glass.input} ${THEME.layout.borderRadius} py-1.5 pl-12 pr-10 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-500/20 ${THEME.transitions.default} placeholder:text-zinc-600 font-bold tracking-tight shadow-2xl`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Action Row - Small and above first mod */}
          {type === 'active' && serverMods.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onDeactivateAll}
              disabled={loading}
              className={`px-4 py-2 flex items-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-red-500/30 bg-black/60 shadow-xl text-red-500 hover:text-white hover:bg-red-600 hover:border-red-500 disabled:opacity-30 group shrink-0`}
            >
              <XCircle size={14} className="group-hover:rotate-90 transition-transform" />
              CLEAR LIST
            </motion.button>
          )}
        </div>

        {/* Ornate Kingdom Divider */}
        <div className="max-w-5xl mx-auto mt-1 mb-4 flex items-center justify-center opacity-40">
          <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
          <div className="mx-4 w-2 h-2 border-2 border-zinc-500 rotate-45 transform" />
          <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6 space-y-2 custom-scrollbar">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <Info size={32} className="mb-2 opacity-20" />
            <p className="text-sm italic">No mods match the current file.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {groups.map(group => (
              <motion.div
                key={group.workshopId}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{
                  layout: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
              >
                <ModGroup
                  workshopId={group.workshopId}
                  mods={group.mods}
                  serverMods={serverMods}
                  issues={issues}
                  type={type}
                  onActivate={onActivate}
                  onDeactivate={onDeactivate}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
