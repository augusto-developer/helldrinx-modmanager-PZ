import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  X,
  Save,
  Search,
  Globe,
  Settings,
  Server,
  Grip
} from 'lucide-react';

// Modular Components
import ConfigSidebar from './ConfigSidebar';
import FieldsGrid from './FieldsGrid';
import { CustomLoading } from '../../components/common/CustomLoading';

import type {
  WorldConfigData,
  WorkshopPlaylistItem,
  ConfigCategory,
  ConfigField,
  ConfigValue,
  ElectronBridge
} from '../../types/world_config';
import { ipcService } from '../../services/ipcService';

// (Removed direct electron access in favor of ipcService)

interface WorldConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  iniPath: string;
  onSync?: () => void;
}

const WorldConfigModal: React.FC<WorldConfigModalProps> = ({ isOpen, onClose, iniPath, onSync }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WorldConfigData | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Time');
  const [pendingChanges, setPendingChanges] = useState<Record<string, ConfigValue>>({});
  const [workshopPlaylist, setWorkshopPlaylist] = useState<WorkshopPlaylistItem[]>([]);
  const [mapList, setMapList] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [hoveredField, setHoveredField] = useState<ConfigField | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSandboxFolderOpen, setIsSandboxFolderOpen] = useState(true);
  const [isIniFolderOpen, setIsIniFolderOpen] = useState(true);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [initialWorkshopPlaylist, setInitialWorkshopPlaylist] = useState<WorkshopPlaylistItem[]>([]);
  const [initialMapList, setInitialMapList] = useState<string[]>([]);
  const [showSaveGuard, setShowSaveGuard] = useState(false);



  const LEGACY_INI_ORDER = useMemo(() => [
    'Details', 'Steam', 'Backups', 'Steam Workshop', 'Map',
    'Spawn Regions', 'Players', 'Admin', 'Fire', 'PVP', 'ServerLoot',
    'War', 'Faction', 'Safehouse', 'Chat', 'RCON', 'Discord',
    'UPnP', 'Other', 'ServerVehicles', 'Voice'
  ], []);

  const fetchConfig = useCallback(async () => {
    if (!iniPath) return;
    setLoading(true);
    setError(null);
    try {
      const result = await ipcService.getServerConfig(iniPath);
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
        setWorkshopPlaylist(result.workshopPlaylist || []);
        setMapList(result.mapList || []);
        setInitialWorkshopPlaylist(result.workshopPlaylist || []);
        setInitialMapList(result.mapList || []);

        // Default to 'Time' if it's the first load and we haven't manually switched to something else
        if (activeCategory === 'Time' && result.sandbox?.categories) {
          const hasTime = result.sandbox.categories.some((c: ConfigCategory) => c.id === 'Time');
          if (!hasTime && result.sandbox.categories[0]) {
            setActiveCategory(result.sandbox.categories[0].id);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [iniPath, activeCategory]);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && isMounted) {
      fetchConfig();
    }
    return () => { isMounted = false; };
  }, [isOpen, fetchConfig]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      if (activeCategory === 'Steam Workshop' || activeCategory === 'Mods') {
        await ipcService.saveWorkshopPlaylist({ iniPath, playlist: workshopPlaylist });
      } else if (activeCategory === 'Map') {
        await ipcService.saveMapList({ iniPath, maps: mapList });
      } else if (Object.keys(pendingChanges).length > 0) {
        const sandboxChanges: Record<string, ConfigValue> = {};
        const iniChanges: Record<string, ConfigValue> = {};

        Object.entries(pendingChanges).forEach(([key, val]) => {
          if (data.sandbox.raw[key] !== undefined) {
            sandboxChanges[key] = val;
          } else {
            iniChanges[key] = val;
          }
        });

        if (Object.keys(sandboxChanges).length > 0) {
          await ipcService.saveSandboxVars({ luaPath: data.luaPath, vars: sandboxChanges });
        }
        if (Object.keys(iniChanges).length > 0) {
          await ipcService.saveIniVars({ iniPath: data.iniPath, vars: iniChanges });
        }
      }

      setPendingChanges({});
      await fetchConfig();
      if (onSync) onSync();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };



  const updateField = useCallback((id: string, value: ConfigValue) => {
    setPendingChanges(prev => ({ ...prev, [id]: value }));
  }, []);

  const allCategories = useMemo(() => [
    ...(data?.ini?.categories || []).filter(c => c.id !== 'Mods' && c.id !== 'Map'),
    ...(data?.sandbox?.categories || []).filter(c => c.id !== 'Mods' && c.id !== 'Map')
  ], [data]);

  const iniCategories = useMemo(() => {
    // 1. Get real categories that belong to INI
    const list = allCategories.filter(c => LEGACY_INI_ORDER.includes(c.id));

    // 2. Add manual tabs that aren't in the backend data (Steam Workshop and Map)
    // We label 'Steam Workshop' as 'Mods (Server List)' for the UI
    const manualTabs = [
      { id: 'Steam Workshop', name: 'Mods (Server List)', fields: [] },
      { id: 'Map', name: 'Map', fields: [] }
    ];

    const combined = [...list, ...manualTabs];

    // 3. Sort by legacy order
    return combined.sort((a, b) => LEGACY_INI_ORDER.indexOf(a.id) - LEGACY_INI_ORDER.indexOf(b.id));
  }, [allCategories, LEGACY_INI_ORDER]);

  const sandboxCategories = useMemo(() =>
    allCategories.filter(c => !LEGACY_INI_ORDER.includes(c.id))
    , [allCategories, LEGACY_INI_ORDER]);

  const mainTabs = useMemo(() => [], []);

  const fields = useMemo(() => {
    if (activeCategory === 'Steam Workshop' || activeCategory === 'Map') return [];
    const currentCategory =
      sandboxCategories.find((c: ConfigCategory) => c.id === activeCategory) ||
      iniCategories.find((c: ConfigCategory) => c.id === activeCategory);
    return currentCategory?.fields || [];
  }, [activeCategory, sandboxCategories, iniCategories]);

  const allFields = useMemo(() => {
    const sandbox = sandboxCategories.flatMap((c: ConfigCategory) => c.fields || []);
    const ini = iniCategories.flatMap((c: ConfigCategory) => c.fields || []);
    return [...sandbox, ...ini];
  }, [sandboxCategories, iniCategories]);

  const filteredFields = useMemo(() => {
    if (!searchQuery) return fields;
    const q = searchQuery.toLowerCase();
    return allFields.filter((f) =>
      (f.name || '').toLowerCase().includes(q) ||
      (f.id || '').toLowerCase().includes(q) ||
      (f.tooltip || '').toLowerCase().includes(q)
    );
  }, [searchQuery, fields, allFields]);

  const getMatchCount = useCallback((catId: string) => {
    if (!searchQuery) return 0;
    const q = searchQuery.toLowerCase();
    const cat = [...sandboxCategories, ...iniCategories].find(c => c.id === catId);
    if (!cat || !cat.fields) return 0;
    return cat.fields.filter((f) =>
      (f.name || '').toLowerCase().includes(q) ||
      (f.id || '').toLowerCase().includes(q) ||
      (f.tooltip || '').toLowerCase().includes(q)
    ).length;
  }, [searchQuery, sandboxCategories, iniCategories]);

  const isPlaylistTab = useMemo(() =>
    activeCategory === 'Steam Workshop' || activeCategory === 'Map'
    , [activeCategory]);

  const hasChanges = useMemo(() => {
    if (!data) return false;
    const fieldsChanged = Object.keys(pendingChanges).length > 0;
    const workshopChanged = JSON.stringify(workshopPlaylist) !== JSON.stringify(initialWorkshopPlaylist);
    const mapChanged = JSON.stringify(mapList) !== JSON.stringify(initialMapList);
    return fieldsChanged || workshopChanged || mapChanged;
  }, [pendingChanges, workshopPlaylist, initialWorkshopPlaylist, mapList, initialMapList, data]);

  const handleCloseAttempt = useCallback(() => {
    if (hasChanges) {
      setShowSaveGuard(true);
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  // ESC Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showSaveGuard) {
          setShowSaveGuard(false);
        } else {
          handleCloseAttempt();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showSaveGuard, handleCloseAttempt]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
    >
      <AnimatePresence>
        {hoveredField?.tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[300] max-w-sm bg-zinc-950 border border-amber-900/50 rounded-lg p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-none backdrop-blur-md"
            style={{ left: mousePos.x + 20, top: mousePos.y + 20 }}
          >
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2 px-1 border-b border-amber-900/20 pb-1">Documentation</div>
            <div className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap font-medium">{hoveredField.tooltip}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        className="w-full max-w-7xl h-[90vh] bg-zinc-950 border border-zinc-800/50 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]"
      >
        {/* Main Header - Impact Edition */}
        <motion.div
          onMouseEnter={() => setIsHeaderHovered(true)}
          onMouseLeave={() => setIsHeaderHovered(false)}
          className="relative h-20 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/40 overflow-hidden cursor-default group"
        >
          {/* Background Flare */}
          <div
            className="absolute left-0 top-0 w-[450px] h-full opacity-40 blur-[40px] pointer-events-none z-0"
            style={{ background: `radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)` }}
          />

          {/* GENSHIN STYLE: Golden Leaves (Permanent) */}
          <div className="absolute left-0 top-0 w-[450px] h-full pointer-events-none overflow-hidden z-10">
            {[...Array(15)].map((_, i) => (
              <motion.svg
                key={i}
                viewBox="0 0 24 24"
                className="absolute w-4 h-4 text-amber-500/30"
                initial={{
                  x: 0,
                  y: -20,
                  rotate: 0,
                  opacity: 0
                }}
                animate={{
                  x: [0, (Math.random() - 0.5) * 40],
                  y: [10, 100],
                  rotate: [0, 360],
                  opacity: [0, 1, 0.4, 0]
                }}
                transition={{
                  duration: 8 + Math.random() * 4,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "linear"
                }}
                style={{ left: `${Math.random() * 100}%` }}
              >
                <path fill="currentColor" d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,11 17,8 17,8Z" />
              </motion.svg>
            ))}
          </div>

          <div className="flex items-center h-full relative z-20">
            {/* Cinematic Icon Layer */}
            <div className="relative h-full w-48 overflow-hidden pointer-events-none z-20">
              <div
                className="absolute inset-0 left-6 w-full"
                style={{
                  backgroundImage: `url('assets/edit_settings_icon.png')`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'left center',
                  maskImage: 'linear-gradient(to right, black 25%, black 45%, transparent 95%)',
                  WebkitMaskImage: 'linear-gradient(to right, black 25%, black 45%, transparent 95%)',
                  opacity: 0.8
                }}
              />
            </div>

            <div className="relative z-10 flex flex-col justify-center -ml-16">
              <h2 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">
                WORLD SETTINGS
              </h2>
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-amber-500/60 mt-1.5">
                World & Sandbox Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
              <input
                type="text"
                placeholder="Query variables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black/40 border border-zinc-800 rounded-xl h-10 pl-10 pr-12 text-xs tracking-wider text-white focus:outline-none focus:border-amber-500/30 transition-all w-72"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-red-500 transition-colors active:scale-90">
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`flex items-center gap-3 px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${hasChanges && !saving
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                }`}
            >
              <Save size={16} />
              {saving ? 'Processing...' : 'Upload Configuration'}
            </button>

            <button onClick={handleCloseAttempt} className="p-2 mr-[20px] text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-90">
              <X size={24} />
            </button>
          </div>
        </motion.div>

        <div className="flex-1 flex overflow-hidden">
          <ConfigSidebar
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            isIniFolderOpen={isIniFolderOpen}
            setIsIniFolderOpen={setIsIniFolderOpen}
            isSandboxFolderOpen={isSandboxFolderOpen}
            setIsSandboxFolderOpen={setIsSandboxFolderOpen}
            iniCategories={iniCategories}
            sandboxCategories={sandboxCategories}
            searchQuery={searchQuery}
            getMatchCount={getMatchCount}
            mainTabs={mainTabs}
          />

          <div className="flex-1 relative overflow-hidden bg-zinc-950">
            {/* Static Background Layer */}
            <div
              className="absolute inset-0 bg-black/65"
              style={{
                backgroundImage: `url('assets/background_worldconfig.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundBlendMode: 'overlay'
              }}
            />
            <div className="absolute inset-0 backdrop-blur-[2px] pointer-events-none" />

            {/* Scrollable Content Layer */}
            <div className="absolute inset-0 overflow-y-auto p-12 scroll-smooth custom-scrollbar">
              <div className="max-w-4xl mx-auto relative z-10">
                {loading ? (
                  <div className="h-full min-h-[400px]">
                    <CustomLoading message="Accessing World Registry..." />
                  </div>
                ) : error ? (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-red-500/50 gap-4">
                    <X size={48} /><p className="text-sm font-bold tracking-widest uppercase">System Error</p><p className="text-xs font-mono text-zinc-500">{error}</p>
                  </div>
                ) : !data ? (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-zinc-700 gap-4">
                    <Server size={48} className="opacity-20" /><p className="text-xs font-black uppercase tracking-[0.4em]">Ready to Probe</p>
                  </div>
                ) : (
                  <>

                    {activeCategory === 'Steam Workshop' ? (
                      <div className="space-y-6">
                        <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/30 mb-8">
                          <h3 className="text-white text-lg font-black mb-2 tracking-tight">Active Mods (List)</h3>
                          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">Drag entries to adjust manual loading priority.</p>
                        </div>
                        <Reorder.Group axis="y" values={workshopPlaylist} onReorder={setWorkshopPlaylist} className="space-y-2">
                          {workshopPlaylist.map((item) => (
                            <Reorder.Item
                              key={`${item.workshopId}-${item.modId}`}
                              value={item}
                              whileDrag={{
                                scale: 1.02,
                                boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
                                backgroundColor: "rgba(24, 24, 27, 0.9)",
                                borderColor: "rgba(245, 158, 11, 0.4)",
                                zIndex: 100
                              }}
                              transition={{ type: "spring", stiffness: 600, damping: 60 }}
                              className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl px-4 py-3 flex items-center gap-4 group hover:border-amber-500/20 hover:bg-zinc-900/60 transition-colors cursor-grab active:cursor-grabbing select-none"
                            >
                              <Grip size={16} className="text-zinc-700 group-hover:text-amber-500/70 transition-colors shrink-0" />
                              <div className="flex-1 flex items-center justify-between">
                                <div className="flex flex-col">
                                  <h4 className="text-xs font-bold text-zinc-200 group-hover:text-amber-500 transition-colors">{item.name}</h4>
                                  <span className="text-[8px] font-black text-amber-500/40 uppercase tracking-widest mt-0.5">Priority Entry</span>
                                </div>
                                <div className="flex gap-4 opacity-20 group-hover:opacity-60 transition-opacity">
                                  <span className="text-[9px] font-mono text-zinc-500 tracking-tighter">WS: {item.workshopId}</span>
                                  <span className="text-[9px] font-mono text-zinc-500 tracking-tighter">ID: {item.modId}</span>
                                </div>
                              </div>
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                      </div>
                    ) : activeCategory === 'Map' ? (
                      <div className="space-y-6">
                        <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/30 mb-8">
                          <h3 className="text-white text-lg font-black mb-2 tracking-tight">Map</h3>
                          <p className="text-xs text-zinc-500 leading-relaxed max-w-xl font-medium">Ordering of world maps. Muldraugh, KY should usually be at the bottom.</p>
                        </div>
                        <Reorder.Group axis="y" values={mapList} onReorder={setMapList} className="space-y-2">
                          {mapList.map((mapName) => (
                            <Reorder.Item
                              key={mapName}
                              value={mapName}
                              whileDrag={{
                                scale: 1.02,
                                boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
                                backgroundColor: "rgba(24, 24, 27, 0.9)",
                                borderColor: "rgba(245, 158, 11, 0.4)",
                                zIndex: 100
                              }}
                              transition={{ type: "spring", stiffness: 600, damping: 60 }}
                              className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 flex items-center gap-4 group hover:border-amber-500/30 hover:bg-zinc-900/60 transition-colors cursor-grab active:cursor-grabbing select-none"
                            >
                              <Grip size={18} className="text-zinc-700 group-hover:text-amber-500 transition-colors shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-zinc-100 group-hover:text-amber-500 transition-colors">{mapName}</span>
                                <span className="text-[8px] font-black text-amber-500/40 uppercase tracking-widest mt-0.5">Spatial Layer</span>
                              </div>
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                      </div>
                    ) : (
                      <FieldsGrid
                        filteredFields={filteredFields}
                        pendingChanges={pendingChanges}
                        updateField={updateField}
                        setHoveredField={setHoveredField}
                        setMousePos={setMousePos}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* System Footer Status */}
        <div className="px-8 py-3 bg-zinc-900/50 border-t border-zinc-800/50 flex items-center justify-between text-[10px] uppercase font-black tracking-[0.2em] text-zinc-600">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${Object.keys(pendingChanges).length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
              {Object.keys(pendingChanges).length > 0 ? 'Changes Staged' : 'System Stable'}
            </span>
            <span className="opacity-50">HELLDRINX ENGINE V2.1</span>
          </div>
          <div className="opacity-50">WORLD_CONFIG_SERVICE_0xMOD</div>
        </div>
      </motion.div>

      {/* No redundant overlays here */}
      <AnimatePresence>
        {showSaveGuard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-950 border-2 border-amber-900/40 p-8 rounded-3xl max-w-md w-full shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col items-center text-center gap-6"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Save size={32} className="text-amber-500 animate-pulse" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-2">Unsaved Changes</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  You have modified the world registry. <br /> Upload configuration or discard state?
                </p>
              </div>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={() => {
                    setShowSaveGuard(false);
                    handleSave();
                  }}
                  className="w-full h-12 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-amber-900/20 active:scale-95"
                >
                  Save and Sync
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPendingChanges({});
                      setShowSaveGuard(false);
                      onClose();
                    }}
                    className="flex-1 h-12 bg-zinc-900 hover:bg-red-950/20 border border-zinc-800 hover:border-red-900/30 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all active:scale-95"
                  >
                    Discard All
                  </button>
                  <button
                    onClick={() => setShowSaveGuard(false)}
                    className="flex-1 h-12 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all active:scale-95"
                  >
                    Resume
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WorldConfigModal;
