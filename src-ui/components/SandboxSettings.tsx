import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  XCircle,
  Save,
  Info,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';

interface SandboxField {
  id: string;
  name: string;
  value: any;
  options?: { value: number; label: string }[];
  tooltip?: string;
  section?: string;
}

interface SandboxCategory {
  id: string;
  name: string;
  fields: SandboxField[];
}

interface SandboxSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  apiBase: string;
  showNotification: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

// Helper to get decimal precision from default value string
const getPrecision = (val: any) => {
  if (!val) return 0;
  const str = String(val);
  const parts = str.split('.');
  return parts.length > 1 ? parts[1].length : 0;
};

// More robust comparison for floats vs ints
const normalizeForComp = (val: any) => {
  if (val === undefined || val === null || val === "") return "";
  const n = Number(val);
  return isNaN(n) ? String(val) : String(n);
};

const SandboxSettings: React.FC<SandboxSettingsProps> = ({ isOpen, onClose, apiBase, showNotification }) => {
  const [sandboxData, setSandboxData] = useState<{ categories: SandboxCategory[], lua_path: string } | null>(null);
  const [iniData, setIniData] = useState<any>(null);
  const [workshopPlaylist, setWorkshopPlaylist] = useState<any[]>([]);
  const [mapList, setMapList] = useState<string[]>([]);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Time');
  const [loading, setLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [isSandboxFolderOpen, setIsSandboxFolderOpen] = useState(true);
  const [isIniFolderOpen, setIsIniFolderOpen] = useState(true);
  const [hoveredField, setHoveredField] = useState<any>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isModsSubMenuOpen, setIsModsSubMenuOpen] = useState(true);
  const [workshopSearch, setWorkshopSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAllSettings();
    }
  }, [isOpen]);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      // Parallel fetch for Sandbox, INI, Workshop and Map
      const [sandboxResp, iniResp, playlistResp, mapResp] = await Promise.all([
        fetch(`${apiBase}/api/sandbox-vars`),
        fetch(`${apiBase}/api/ini-vars`),
        fetch(`${apiBase}/api/workshop-playlist`),
        fetch(`${apiBase}/api/map-list`)
      ]);

      const sData = await sandboxResp.json();
      const iData = await iniResp.json();
      const pData = await playlistResp.json();
      const mData = await mapResp.json();

      setSandboxData(sData);
      setIniData(iData);
      setWorkshopPlaylist(pData);
      setMapList(mData);

      if (sData.categories && sData.categories.length > 0) {
        if (!activeCategory || activeCategory === 'Time') {
          setActiveCategory(sData.categories[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      showNotification('Failed to load server settings.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0 && activeCategory !== 'Steam Workshop' && activeCategory !== 'Map') {
      return;
    }

    setSaving(true);
    try {
      if (activeCategory === 'Steam Workshop') {
        // Save Workshop Playlist
        const resp = await fetch(`${apiBase}/api/workshop-playlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workshopPlaylist),
        });
        const data = await resp.json();
        if (data.status === 'success') {
          showNotification('Workshop order saved!', 'success');
          await fetchAllSettings();
        }
        return;
      }

      if (activeCategory === 'Map') {
        // Save Map Playlist
        const resp = await fetch(`${apiBase}/api/map-list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mapList),
        });
        const data = await resp.json();
        if (data.status === 'success') {
          showNotification('Map order saved!', 'success');
          await fetchAllSettings();
        }
        return;
      }

      // Standard Variable Save (Sandbox or INI)
      const isIni = iniData?.categories.some((c: any) => c.id === activeCategory);
      const endpoint = isIni ? `${apiBase}/api/ini-vars` : `${apiBase}/api/sandbox-vars`;

      const sanitizedVars = { ...pendingChanges };

      // Flatten all available fields to find metadata for precision enforcement
      const allFields = [
        ...(sandboxData?.categories.flatMap((c: any) => c.fields) || []),
        ...(iniData?.categories.flatMap((c: any) => c.fields) || [])
      ];

      for (const key in sanitizedVars) {
        if (sanitizedVars[key] === "") {
          sanitizedVars[key] = 0;
        } else {
          const field = allFields.find(f => f.id === key);

          if (field && field.type === 'number') {
            const val = sanitizedVars[key];
            const hasDecimalInDefault = field.defaultValue?.toString().includes('.');

            if (isIni) {
              // For INI, if it should be a float, enforce precision
              if (hasDecimalInDefault) {
                const precision = getPrecision(field.defaultValue);
                const num = Number(val);
                if (!isNaN(num)) {
                  sanitizedVars[key] = num.toFixed(precision);
                }
              }
            } else {
              // For Sandbox, convert to Number type
              if (!isNaN(Number(val))) {
                sanitizedVars[key] = Number(val);
              }
            }
          }
        }
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: sanitizedVars }),
      });
      const data = await resp.json();
      if (data.status === 'success') {
        showNotification(`${isIni ? 'INI' : 'Sandbox'} settings saved!`, 'success');
        setPendingChanges({});
        await fetchAllSettings();
      }
    } catch (err) {
      console.error('Save failed:', err);
      showNotification('Failed to save settings.', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const updateField = (id: string, value: any) => {
    setPendingChanges(prev => ({ ...prev, [id]: value }));
  };

  const handleDragStart = (e: any, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: any, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    if (activeCategory === 'Steam Workshop') {
      const newPlaylist = [...workshopPlaylist];
      const item = newPlaylist.splice(draggedItemIndex, 1)[0];
      newPlaylist.splice(index, 0, item);
      setWorkshopPlaylist(newPlaylist);
    } else if (activeCategory === 'Map') {
      const newMapList = [...mapList];
      const item = newMapList.splice(draggedItemIndex, 1)[0];
      newMapList.splice(index, 0, item);
      setMapList(newMapList);
    }

    setDraggedItemIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 4000,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}
      >
        {/* Custom Tooltip */}
        <AnimatePresence>
          {hoveredField && hoveredField.tooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed',
                left: mousePos.x + 20,
                top: mousePos.y + 20,
                zIndex: 5000,
                maxWidth: '400px',
                background: 'rgba(10, 10, 10, 0.95)',
                border: '1px solid #5a3f2d',
                borderRadius: '4px',
                padding: '12px 16px',
                pointerEvents: 'none',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(5px)'
              }}
            >
              <div style={{ color: '#5a3f2d', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
                Orientation
              </div>
              <div style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                {hoveredField.tooltip}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          style={{
            width: '100%', maxWidth: '1200px', height: '90vh',
            background: `linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)), url('px.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '1px solid #333',
            borderRadius: '4px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 0 50px rgba(0,0,0,1)'
          }}
        >
          {/* Top Bar - Game Title Style */}
          <div style={{ padding: '12px 24px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              EDIT SETTINGS: {sandboxData?.lua_path?.replace('_SandboxVars.lua', '') || 'servertest'}
            </h2>
            <button
              onClick={onClose}
              style={{ position: 'absolute', right: '20px', top: '10px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}
            >
              <XCircle size={20} />
            </button>
          </div>

          <div style={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Sidebar - Game Tree Style */}
            <div style={{ width: '280px', background: 'rgba(0,0,0,0.5)', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flexGrow: 1, overflowY: 'auto', padding: '8px' }}>


                {/* Folder: INI */}
                <div style={{ marginBottom: '12px' }}>
                  <div
                    onClick={() => setIsIniFolderOpen(!isIniFolderOpen)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', color: '#ccc', cursor: 'pointer', fontSize: '13px', background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div style={{ width: '12px' }}>
                      {isIniFolderOpen ? <ChevronDown size={12} /> : <div style={{ transform: 'rotate(-90deg)', display: 'flex' }}><ChevronDown size={12} /></div>}
                    </div>
                    <span style={{ fontWeight: 'bold' }}>INI</span>
                  </div>

                  {isIniFolderOpen && (
                    <div style={{ marginLeft: '4px', borderLeft: '1px solid #111' }}>
                      {[
                        'Details', 'Steam', 'Backups', 'Steam Workshop', 'Map',
                        'Spawn Regions', 'Players', 'Admin', 'Fire', 'PVP', 'ServerLoot',
                        'War', 'Faction', 'Safehouse', 'Chat', 'RCON', 'Discord',
                        'UPnP', 'Other', 'ServerVehicles', 'Voice'
                      ].map((catId) => {
                        // Find category data from either INI or Sandbox sources
                        let catData = iniData?.categories?.find((c: any) => c.id === catId);
                        
                        // Special case: Mods is in sandboxData
                        if (!catData && catId === 'Mods') {
                          catData = sandboxData?.categories?.find((c: any) => c.id === 'Mods');
                        }

                        // Manual categories that don't exist in either but need to be rendered
                        const isManual = catId === 'Steam Workshop' || catId === 'Map';
                        
                        // If we have data OR it's a manual one we know how to handle
                        if (!catData && !isManual) return null;

                        const name = catData ? catData.name : catId;
                        const isMods = catId === 'Mods';
                        const isActive = activeCategory === catId;

                        return (
                          <div key={catId}>
                            <div
                              onClick={() => {
                                if (isActive && isMods) {
                                  setIsModsSubMenuOpen(!isModsSubMenuOpen);
                                } else {
                                  setActiveCategory(catId);
                                  if (isMods) setIsModsSubMenuOpen(true);
                                }
                              }}
                              style={{
                                padding: '6px 12px 6px 20px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.1s',
                                background: isActive ? '#3d2b1f' : 'transparent',
                                color: isActive ? '#fff' : '#888',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <span>{name}</span>
                              {isMods && (
                                <ChevronDown
                                  size={12}
                                  style={{
                                    opacity: 0.5,
                                    transform: (isActive && isModsSubMenuOpen) ? 'rotate(0deg)' : 'rotate(-90deg)',
                                    transition: 'transform 0.2s'
                                  }}
                                />
                              )}
                            </div>

                            {/* Sub-items for Mods Tab (Moved here) */}
                            {isMods && isActive && isModsSubMenuOpen && catData && (
                              <div style={{ padding: '4px 0 8px 10px', marginLeft: '25px', borderLeft: '1px solid #222', marginTop: '2px', marginBottom: '8px' }}>
                                {catData.fields.filter((f: any) => f.section).map((sec: any, sIdx: number) => (
                                  <div
                                    key={`side-sec-${sIdx}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      scrollToSection(`sec-${sec.section}`);
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                                    style={{
                                      padding: '4px 8px', fontSize: '11px', color: '#666', cursor: 'pointer',
                                      transition: 'color 0.1s', textTransform: 'none', whiteSpace: 'nowrap',
                                      overflow: 'hidden', textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {sec.section.replace(/([A-Z])/g, ' $1').trim()}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Folder: Sandbox */}
                <div style={{ marginBottom: '12px' }}>
                  <div
                    onClick={() => setIsSandboxFolderOpen(!isSandboxFolderOpen)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', color: '#ccc', cursor: 'pointer', fontSize: '13px', background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div style={{ width: '12px' }}>
                      {isSandboxFolderOpen ? <ChevronDown size={12} /> : <div style={{ transform: 'rotate(-90deg)', display: 'flex' }}><ChevronDown size={12} /></div>}
                    </div>
                    <span style={{ fontWeight: 'bold' }}>Sandbox</span>
                  </div>

                  {isSandboxFolderOpen && (
                    <div style={{ marginLeft: '4px', borderLeft: '1px solid #111' }}>
                      <div
                        onClick={() => setActiveCategory('Presets')}
                        style={{ padding: '6px 12px 6px 20px', color: activeCategory === 'Presets' ? '#fff' : '#888', background: activeCategory === 'Presets' ? '#3d2b1f' : 'transparent', cursor: 'pointer', fontSize: '13px' }}
                      >
                        Presets
                      </div>

                      {sandboxData?.categories?.map(cat => {
                        const isMods = cat.id === 'Mods';
                        const isActive = activeCategory === cat.id;

                        return (
                          <div key={cat.id}>
                            <div
                              onClick={() => {
                                if (isActive && isMods) {
                                  setIsModsSubMenuOpen(!isModsSubMenuOpen);
                                } else {
                                  setActiveCategory(cat.id);
                                  if (isMods) setIsModsSubMenuOpen(true);
                                }
                              }}
                              style={{
                                padding: '6px 12px 6px 20px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.1s',
                                background: isActive ? '#3d2b1f' : 'transparent',
                                color: isActive ? '#fff' : '#888',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <span>{cat.name}</span>
                              {isMods && (
                                <ChevronDown
                                  size={12}
                                  style={{
                                    opacity: 0.5,
                                    transform: (isActive && isModsSubMenuOpen) ? 'rotate(0deg)' : 'rotate(-90deg)',
                                    transition: 'transform 0.2s'
                                  }}
                                />
                              )}
                            </div>

                            {/* Sub-items for Mods Tab */}
                            {isMods && isActive && isModsSubMenuOpen && (
                              <div style={{ padding: '4px 0 8px 10px', marginLeft: '25px', borderLeft: '1px solid #222', marginTop: '2px', marginBottom: '8px' }}>
                                {cat.fields.filter((f: any) => f.section).map((sec: any, sIdx: number) => (
                                  <div
                                    key={`side-sec-${sIdx}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      scrollToSection(`sec-${sec.section}`);
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      color: '#666',
                                      cursor: 'pointer',
                                      transition: 'color 0.1s',
                                      textTransform: 'none',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {sec.section.replace(/([A-Z])/g, ' $1').trim()}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Area - Centered Alignment Style */}
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '40px 0', background: 'rgba(20,20,20,0.4)' }}>
              {loading ? (
                <div style={{ textAlign: 'center', marginTop: '100px', color: '#888' }}>
                  <p>Loading World Data...</p>
                </div>
              ) : (
                <div style={{ width: '100%', maxWidth: '800px' }}>
                  {activeCategory === 'Steam Workshop' ? (
                    <div style={{ padding: '0 20px' }}>
                      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ color: '#888', fontSize: '13px' }}>
                          Workshop items used by this server (Drag entries to reorder):
                        </div>
                        <div style={{ position: 'relative', width: '300px' }}>
                          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                          <input
                            type="text"
                            placeholder="Search mods or IDs..."
                            value={workshopSearch}
                            onChange={(e) => setWorkshopSearch(e.target.value)}
                            style={{
                              width: '100%',
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid #444',
                              height: '32px',
                              borderRadius: '4px',
                              padding: '0 10px 0 32px',
                              color: '#fff',
                              outline: 'none',
                              fontSize: '13px',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ border: '1px solid #333', background: 'rgba(0,0,0,0.2)', maxHeight: '60vh', overflowY: 'auto' }}>
                        {workshopPlaylist
                          .filter(item => 
                            item.name.toLowerCase().includes(workshopSearch.toLowerCase()) || 
                            item.modId.toLowerCase().includes(workshopSearch.toLowerCase()) || 
                            item.workshopId.toLowerCase().includes(workshopSearch.toLowerCase())
                          )
                          .map((item, index) => (
                          <div
                            key={`${item.workshopId}-${item.modId}-${index}`}
                            draggable={!workshopSearch} // Disable drag while searching to avoid confusion
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            style={{
                              padding: '10px 15px',
                              borderBottom: '1px solid #222',
                              background: draggedItemIndex === index ? 'rgba(61, 43, 31, 0.4)' : 'transparent',
                              cursor: workshopSearch ? 'default' : 'grab',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              color: '#eee',
                              fontSize: '13px',
                              opacity: workshopSearch ? 1 : 1
                            }}
                            className="workshop-item-row"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 'bold', color: item.modId ? '#eee' : '#888' }}>
                                  {item.name}
                                </span>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                                  {item.modId && (
                                    <span style={{ color: '#aaa', fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '1px 4px' }}>
                                      Mod: {item.modId}
                                    </span>
                                  )}
                                  <span style={{ color: '#777', fontSize: '10px', background: 'rgba(0,0,0,0.2)', padding: '1px 4px' }}>
                                    WS: {item.workshopId}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="drag-handle" style={{ opacity: 0.3, fontSize: '10px', textTransform: 'uppercase' }}>
                              drag
                            </div>
                          </div>
                        ))}
                      </div>
                      <style>{`
                        .workshop-item-row:hover { background: rgba(255,255,255,0.05) !important; }
                        .workshop-item-row:hover .drag-handle { opacity: 0.8 !important; }
                      `}</style>
                    </div>
                  ) : activeCategory === 'Map' ? (
                    <div style={{ padding: '0 20px' }}>
                      <div style={{ marginBottom: '20px', color: '#888', fontSize: '13px' }}>
                        Maps used by this server (Drag entries to reorder - Top map is usually Muldraugh, KY):
                      </div>
                      <div style={{ border: '1px solid #333', background: 'rgba(0,0,0,0.2)' }}>
                        {mapList.map((mapName, index) => (
                          <div
                            key={`${mapName}-${index}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            style={{
                              padding: '10px 15px',
                              borderBottom: '1px solid #222',
                              background: draggedItemIndex === index ? 'rgba(61, 43, 31, 0.4)' : 'transparent',
                              cursor: 'grab',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              color: '#eee',
                              fontSize: '13px'
                            }}
                            className="workshop-item-row"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontWeight: 'bold' }}>{mapName}</span>
                            </div>
                            <div className="drag-handle" style={{ opacity: 0.3, fontSize: '10px', textTransform: 'uppercase' }}>
                              drag
                            </div>
                          </div>
                        ))}
                      </div>
                      <style>{`
                        .workshop-item-row:hover { background: rgba(255,255,255,0.05) !important; }
                        .workshop-item-row:hover .drag-handle { opacity: 0.8 !important; }
                      `}</style>
                    </div>
                  ) : activeCategory === 'Presets' ? (
                    <div style={{ padding: '0 40px' }}>
                      <h2 style={{ color: '#fff', marginBottom: '20px', fontSize: '16px' }}>Configuration Presets</h2>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', border: '1px solid #333' }}>
                        <p style={{ color: '#888', fontSize: '13px' }}>Choose a preset to quickly apply common configurations.</p>
                        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                          {['Apocalypse', 'Survivor', 'Brawler', 'Initial Infection'].map(p => (
                            <button key={p} className="glass-btn" style={{ padding: '10px', fontSize: '11px' }}>{p}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '0 20px' }}>
                      {(() => {
                        const isIni = iniData?.categories.some((c: any) => c.id === activeCategory);
                        const fields = isIni
                          ? iniData?.categories.find((c: any) => c.id === activeCategory)?.fields
                          : sandboxData?.categories.find(c => c.id === activeCategory)?.fields;

                        return fields?.map((field: any, idx: number) => {
                          if (field.section) {
                            return (
                              <div key={`sec-idx-${idx}`} id={`sec-${field.section}`} style={{
                                color: '#d4af37',
                                borderBottom: '1px solid #3d2b1f',
                                padding: '12px 0 4px 0',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                marginBottom: '8px',
                                width: '100%'
                              }}>
                                {field.section}
                              </div>
                            );
                          }

                          // Regular Field
                          const currentValue = pendingChanges[field.id] !== undefined ? pendingChanges[field.id] : field.value;
                          const hasDefault = field.defaultValue !== undefined && field.defaultValue !== null;

                          const isAlteredFromDefault = hasDefault && normalizeForComp(currentValue) !== normalizeForComp(field.defaultValue);

                          // Formatted display value for numbers
                          const getFormattedValue = () => {
                            if (pendingChanges[field.id] !== undefined) return pendingChanges[field.id];
                            if (typeof field.value === 'number') {
                              const precision = getPrecision(field.defaultValue);
                              if (precision > 0) return field.value.toFixed(precision);
                            }
                            return field.value;
                          };

                          return (
                            <div
                              key={field.id}
                              onMouseEnter={(e) => {
                                setHoveredField(field);
                                setMousePos({ x: e.clientX, y: e.clientY });
                              }}
                              onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                              onMouseLeave={() => setHoveredField(null)}
                              style={{
                                display: 'flex', 
                                alignItems: field.type === 'textarea' ? 'flex-start' : 'center', 
                                gap: '8px', 
                                minHeight: '36px',
                                background: hoveredField?.id === field.id ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                                borderLeft: '2px solid transparent',
                                borderRadius: '2px',
                                padding: '10px 0',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {/* Label (Right-aligned) */}
                                <div style={{
                                  flex: '0 0 280px',
                                  textAlign: 'right',
                                  paddingRight: '16px',
                                  color: isAlteredFromDefault ? '#ffff00' : '#888',
                                  fontSize: '12px',
                                  paddingTop: field.type === 'textarea' ? '6px' : '0',
                                  fontWeight: isAlteredFromDefault ? '600' : 'normal',
                                  userSelect: 'none',
                                  letterSpacing: '0.02em',
                                  opacity: hoveredField?.id === field.id || isAlteredFromDefault ? 1 : 0.8,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }} title={field.name}>
                                  {field.name}
                                </div>

                                {/* Input (Fixed/Fluid-aligned) */}
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                  {field.options ? (
                                    <div style={{ position: 'relative', width: '300px' }}>
                                      <select
                                        value={pendingChanges[field.id] !== undefined ? pendingChanges[field.id] : field.value}
                                        onChange={(e) => updateField(field.id, parseInt(e.target.value))}
                                        style={{
                                          width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid #444', height: '26px',
                                          borderRadius: '0', padding: '0 8px', color: '#fff', outline: 'none', cursor: 'pointer',
                                          fontSize: '12px', appearance: 'none'
                                        }}
                                      >
                                        {field.options.map((opt: any) => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </select>
                                      <div style={{ position: 'absolute', right: '8px', top: '7px', pointerEvents: 'none', color: '#666' }}>
                                        <ChevronDown size={12} />
                                      </div>
                                    </div>
                                  ) : typeof field.value === 'boolean' ? (
                                    <div
                                      onClick={() => updateField(field.id, !(pendingChanges[field.id] !== undefined ? pendingChanges[field.id] : field.value))}
                                      style={{
                                        width: '20px', height: '20px', border: '1px solid #444',
                                        background: (pendingChanges[field.id] !== undefined ? pendingChanges[field.id] : field.value) ? 'rgba(61, 43, 31, 0.4)' : 'rgba(0,0,0,0.4)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                        transition: 'background 0.2s'
                                      }}
                                    >
                                      {(pendingChanges[field.id] !== undefined ? pendingChanges[field.id] : field.value) && (
                                        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2300ff00' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E" alt="check" />
                                      )}
                                    </div>
                                  ) : field.type === 'textarea' ? (
                                    <textarea
                                      value={pendingChanges[field.id] !== undefined ? pendingChanges[field.id] : field.value}
                                      onChange={(e) => updateField(field.id, e.target.value)}
                                      spellCheck={false}
                                      style={{
                                        width: '500px', background: 'rgba(0,0,0,0.4)', border: '1px solid #444', height: '140px',
                                        borderRadius: '0', padding: '4px 8px', color: '#fff', outline: 'none', fontSize: '12px',
                                        resize: 'none', fontFamily: 'inherit'
                                      }}
                                    />
                                  ) : typeof field.value === 'string' ? (
                                    <input
                                      type="text"
                                      value={pendingChanges[field.id] !== undefined ? pendingChanges[field.id] : field.value}
                                      onChange={(e) => updateField(field.id, e.target.value)}
                                      spellCheck={false}
                                      style={{
                                        width: '300px', background: 'rgba(0,0,0,0.4)', border: '1px solid #444', height: '26px',
                                        borderRadius: '0', padding: '0 8px', color: '#fff', outline: 'none', fontSize: '12px'
                                      }}
                                    />
                                  ) : (
                                    <input
                                      type="number"
                                      lang="en-US"
                                      step={
                                        (field.defaultValue?.toString().includes('.') || field.id.includes('Multiplier') || field.id.includes('Modifier') || field.id.includes('Factor'))
                                          ? (getPrecision(field.defaultValue) > 1 ? "0.01" : "0.1")
                                          : "1"
                                      }
                                      value={getFormattedValue()}
                                      onChange={(e) => {
                                        const rawValue = e.target.value;
                                        if (rawValue === "") {
                                          updateField(field.id, ""); // Allow empty string state for typing
                                          return;
                                        }

                                        const normalized = rawValue.replace(',', '.');
                                        // Only update if it's a valid number format or empty
                                        if (normalized === "." || normalized === "-" || normalized === "-.") {
                                          updateField(field.id, normalized);
                                        } else {
                                          const parsed = parseFloat(normalized);
                                          if (!isNaN(parsed)) {
                                            updateField(field.id, normalized); // Store as string to preserve decimal typing
                                          }
                                        }
                                      }}
                                      style={{
                                        width: '300px', background: 'rgba(0,0,0,0.4)', border: '1px solid #444', height: '26px',
                                        borderRadius: '0', padding: '0 8px', color: '#fff', outline: 'none', fontSize: '12px'
                                      }}
                                    />
                                  )}
                                </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid #222', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => {
                setPendingChanges({});
                onClose();
              }}
              className="glass-btn"
              style={{ padding: '8px 20px', fontSize: '12px', opacity: 0.7 }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{
                padding: '8px 24px', fontSize: '12px', borderRadius: '4px',
                background: Object.keys(pendingChanges || {}).length > 0 ? '#3d2b1f' : '#111',
                border: Object.keys(pendingChanges || {}).length > 0 ? '1px solid #5a3f2d' : '1px solid #333',
                color: Object.keys(pendingChanges || {}).length > 0 ? '#fff' : '#666',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: 'none'
              }}
            >
              {saving ? 'Saving...' : 'SAVE & APPLY'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SandboxSettings;
