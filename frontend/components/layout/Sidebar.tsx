import React from 'react';
import { Settings, RefreshCw, Bell } from 'lucide-react';
import { THEME } from '../../theme/design_system';
import { NavButton } from '../common/NavButton';
import { useMods } from '../../context/ModContext';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenAudit: () => void;
  onOpenWorldConfig: () => void;
  onOpenPresets: () => void;
  onOpenGlobalBackup: () => void;
}

/**
 * 🛰️ HellDrinx Sidebar
 * Main navigation and status dashboard.
 * Consumes global mod state from useMods().
 */
export const Sidebar: React.FC<SidebarProps> = ({
  onOpenSettings,
  onOpenAudit,
  onOpenWorldConfig,
  onOpenPresets,
  onOpenGlobalBackup
}) => {
  const {
    mods,
    serverMods,
    issues,
    activeTab,
    setActiveTab,
    loading,
    syncMods,
    settings,
    activeFileName
  } = useMods();

  const workshopPath = settings.workshopPath;
  const iniPath = settings.serverIniPath;

  const groupedCount = React.useMemo(() => {
    const conflicts = issues.filter(i => i.type === 'conflict');
    const missing = issues.filter(i => i.type === 'missing');
    
    const conflictFiles = new Set(conflicts.map(i => i.file?.toLowerCase() || i.detail.toLowerCase()));
    const missingMods = new Set(missing.map(i => i.modId));
    
    return conflictFiles.size + missingMods.size;
  }, [issues]);

  return (
    <aside className={`${THEME.layout.sidebarWidth} h-full ${THEME.glass.sidebar} flex flex-col z-20`}>
      {/* Navigation Tabs */}
      <div className="px-6 pt-6 flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-2">
        {/* HellDrinx Style Welcome Header */}
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-[16px] font-black uppercase tracking-[0.4em] italic pl-[0.4em]
            text-transparent bg-clip-text bg-gradient-to-t from-orange-700 via-orange-400 to-amber-200
            filter drop-shadow-[0_0_8px_rgba(234,88,12,0.8)] drop-shadow-[0_0_2px_rgba(255,255,255,0.4)]
            text-center">
            Menu
          </h1>
          <div className="w-12 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent mt-1 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
        </div>

        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Management</h2>
          <button
            onClick={onOpenAudit}
            className={`p-2 rounded-xl transition-all active:scale-90 relative z-50 cursor-pointer group ${groupedCount > 0
              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-lg shadow-red-500/5'
              : 'hover:bg-white/5 text-zinc-500 hover:text-zinc-100'
              }`}
          >
            <Bell size={16} className={groupedCount > 0 ? 'animate-bounce' : ''} />
            {groupedCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black font-mono rounded-full flex items-center justify-center border-2 border-[#121214] shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                {groupedCount}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={() => setActiveTab('active')}
          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-bold transition-all group ${activeTab === 'active'
            ? 'bg-white/10 text-zinc-100 border border-white/10 shadow-sm'
            : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent'
            }`}
        >
          <span className="tracking-tight">Active Mods</span>
          <span className={`py-0.5 px-2 rounded-full text-[11px] font-bold font-mono ${activeTab === 'active' ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-zinc-800/50 text-zinc-600'
            }`}>
            {serverMods.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('unactivated')}
          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-bold mt-1 transition-all group ${activeTab === 'unactivated'
            ? 'bg-white/10 text-zinc-100 border border-white/10 shadow-sm'
            : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent'
            }`}
        >
          <span className="tracking-tight">Library</span>
          <span className={`py-0.5 px-2 rounded-full text-[11px] font-bold font-mono ${activeTab === 'unactivated' ? 'bg-orange-600 text-white shadow-[0_0_10px_rgba(234,88,12,0.3)]' : 'bg-zinc-800/50 text-zinc-600'
            }`}>
            {mods.length - serverMods.length}
          </span>
        </button>

        <div className="h-px bg-white/5 my-2 mx-2" />

        {/* Section Header: Configurations */}
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
          <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] whitespace-nowrap">Configurations</h2>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
        </div>

        <div className="flex flex-col gap-4 px-2">
          <NavButton
            label="World"
            icon="assets/world_icon.png"
            isActive={false} // State controlled in MainLayout
            onClick={onOpenWorldConfig}
            disabled={!iniPath}
            colorContrast="amber-500"
            element="nature"
          />

          <NavButton
            label="Presets"
            icon="assets/presets_icon.png"
            isActive={false}
            onClick={onOpenPresets}
            disabled={!iniPath}
            colorContrast="emerald-500"
            element="lightning"
          />

          <NavButton
            label="Backup"
            icon="assets/backup_icon.png"
            isActive={false}
            onClick={onOpenGlobalBackup}
            disabled={!iniPath}
            colorContrast="blue-500"
            element="bubbles"
          />
        </div>

      </div>

      {/* Control Panel Footer - Floating Card Style (Restored) */}
      <div className="mt-auto p-4 m-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl relative z-30">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none">Current File:</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              <span className="text-xs font-mono font-bold text-zinc-300 truncate">{activeFileName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={syncMods}
              disabled={loading !== 'none' || !workshopPath || !iniPath}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all border border-white/5 active:scale-95 disabled:opacity-30 group"
              title="Refresh Cache"
            >
              <RefreshCw size={14} className={`${loading !== 'none' ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">Sync</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all border border-white/5 active:scale-95 group"
              title="Settings"
            >
              <Settings size={18} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
