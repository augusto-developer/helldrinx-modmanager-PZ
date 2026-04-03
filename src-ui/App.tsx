import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Trash2,
  Search,
  Package,
  History,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Github,
  Monitor,
  XCircle,
  Settings,
  FolderOpen,
  Info,
  ChevronDown,
  ChevronUp,
  Database,
  Save,
  Download,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:8000';

interface Mod {
  id: string;
  name: string;
  workshop_id: string;
  poster?: string;
  poster_url?: string;
  require: string[];
  incompatible?: string[];
  absolute_path?: string;
}

interface DependencyInfo {
  depends_on: string[];
  required_by: string[];
}

interface Notification {
  message: string;
  type: 'success' | 'info' | 'warning';
}

const App: React.FC = () => {
  const [mods, setMods] = useState<Mod[]>([]);
  const [serverMods, setServerMods] = useState<string[]>([]);
  const [trash, setTrash] = useState<Mod[]>([]);
  const [dependencyMap, setDependencyMap] = useState<Record<string, DependencyInfo>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rememberConflict, setRememberConflict] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [settings, setSettings] = useState({ workshop_path: '', server_config_path: '' });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [rulesText, setRulesText] = useState('');
  const [savingRules, setSavingRules] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [highlightedMod, setHighlightedMod] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'conflict' | 'missing'>('conflict');
  const [profiles, setProfiles] = useState<string[]>([]);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [zomboidPath, setZomboidPath] = useState<string>('');
  const [backupDest, setBackupDest] = useState<string>('');

  // Calculate Issues (Missing dependencies, Conflicts)
  const issues = React.useMemo(() => {
    const list: { modId: string, modName: string, type: 'missing' | 'conflict', detail: string }[] = [];
    serverMods.forEach(mid => {
      const mod = mods.find(m => m.id === mid);
      if (!mod) return;

      // 1. Missing Dependency Check
      mod.require.forEach(req => {
        if (!serverMods.includes(req)) {
          list.push({
            modId: mid,
            modName: mod.name,
            type: 'missing',
            detail: `Missing: ${req}`
          });
        }
      });

      // 2. Conflict Check
      if (mod.incompatible) {
        mod.incompatible.forEach(inc => {
          if (serverMods.includes(inc)) {
            list.push({
              modId: mid,
              modName: mod.name,
              type: 'conflict',
              detail: `Incompatible with: ${inc}`
            });
          }
        });
      }
    });
    return list;
  }, [mods, serverMods]);

  const scrollToMod = (id: string) => {
    setActiveTab('active');
    setIsSidebarOpen(false);
    
    // If it's a sub-mod, ensure its group is expanded
    const mod = mods.find(m => m.id === id);
    if (mod && mod.workshop_id) {
       setExpandedGroups(prev => ({ ...prev, [mod.workshop_id]: true }));
    }

    setTimeout(() => {
      const el = document.getElementById(`mod-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMod(id);
        setTimeout(() => setHighlightedMod(null), 2000);
      }
    }, 100);
  };

  const fetchMods = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/mods`);
      const data = await resp.json();
      setMods(data.mods);
      setServerMods(data.server_mods);
      setTrash(data.trash || []);
      setDependencyMap(data.dependency_map || {});
    } catch (err) {
      console.error('Error fetching mods:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/settings`);
      const data = await resp.json();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchRules = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/sorting-rules/raw`);
      const data = await resp.json();
      setRulesText(data.content || "");
    } catch (err) {
      console.error('Error fetching rules:', err);
    }
  };

  const showNotification = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchProfiles = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/profiles`);
      const data = await resp.json();
      setProfiles(data.profiles || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  };

  const handleProfileSave = async (name: string) => {
    if (!name) return;
    try {
      const resp = await fetch(`${API_BASE}/api/profiles/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await resp.json();
      if (data.status === 'success') {
        showNotification(data.message, 'success');
        fetchProfiles();
      } else {
        showNotification(data.message, 'warning');
      }
    } catch (err) {
      console.error('Save profile failed:', err);
    }
  };

  const handleProfileLoad = async (name: string) => {
    try {
      const resp = await fetch(`${API_BASE}/api/profiles/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await resp.json();
      if (data.status === 'success') {
        showNotification(data.message, 'success');
        setSelectedProfile(name);
        await fetchMods(); // Refresh mod list for the new profile
      } else {
        showNotification(data.message, 'warning');
      }
    } catch (err) {
      console.error('Load profile failed:', err);
    }
  };

  const handleProfileDelete = async (name: string) => {
    try {
      const resp = await fetch(`${API_BASE}/api/profiles/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (resp.ok) {
        showNotification(`Profile '${name}' deleted.`, 'info');
        fetchProfiles();
      }
    } catch (err) {
      console.error('Delete profile failed:', err);
    }
  };

  const handleBackupPathStep = async (step: 'zomboid' | 'dest') => {
    try {
      const path = await (window as any).require('electron').ipcRenderer.invoke('select-folder');
      if (path) {
        if (step === 'zomboid') setZomboidPath(path);
        else setBackupDest(path);
      }
    } catch (err) {
      console.error('Path selection error:', err);
    }
  };

  const handleBackupExecution = async () => {
    if (!zomboidPath || !backupDest) return;

    setBackupLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zomboid_path: zomboidPath, backup_dest: backupDest }),
      });
      const data = await resp.json();
      if (data.status === 'success') {
        showNotification(data.message, 'success');
        setBackupModalOpen(false);
      } else {
        showNotification(data.message, 'warning');
      }
    } catch (err) {
      console.error('Backup failed:', err);
      showNotification('Backup failed due to a system error.', 'warning');
    } finally {
      setBackupLoading(false);
    }
  };

  const syncMods = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'error') {
        setModalData({
          title: data.title || 'Sync Error',
          message: data.message || 'An error occurred while syncing mods.',
          remediation: data.remediation || 'Check your connection or server logs.'
        });
        setModalOpen(true);
      }
      await fetchMods();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleAction = async (endpoint: string, payload: any, bypass: boolean = false) => {
    // Merge bypass flag into payload if provided
    const finalPayload = bypass ? { ...payload, bypass_conflicts: true } : payload;

    // --- Optimistic UI Update ---
    if (endpoint === 'delete-specific') {
      setServerMods(prev => prev.filter(id => id !== payload.mod_id));
    } else if (endpoint === 'activate-mod' && !bypass) { 
        // Only optimistic if not a bypass (bypass might fail for other reasons)
      setServerMods(prev => [...prev, payload.mod_id]);
    }
    // ... other optimistics ...
    // ----------------------------

    try {
      const resp = await fetch(`${API_BASE}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });
      const data = await resp.json();

      if (data.status === 'error') {
        await fetchMods(); // Revert optimistics
        setModalData({
          title: data.title || "Conflict Detected",
          message: data.message || "Unable to complete action.",
          remediation: data.remediation || "Check requirements or manual rules.",
          can_bypass: data.can_bypass || false,
          originalAction: { endpoint, payload } // To retry with bypass
        });
        setModalOpen(true);
        return;
      }

      if (resp.ok) {
        setModalOpen(false); // Close if successful bypass
        if (data.cleaned_up && data.cleaned_up.length > 0) {
          showNotification(`${data.cleaned_up.length} unnecessary dependencies were removed.`, 'info');
        }
        await fetchMods();
      }
    } catch (err) {
      console.error(`Action ${endpoint} failed:`, err);
      await fetchMods(); // Revert optimistics
    }
  };

  const handleBulkAction = async (endpoint: string, bypass: boolean = false, bypassFingerprints: string[] = []) => {
    if (selectedIds.length === 0) return;
    
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mod_ids: selectedIds, 
          bypass_conflicts: bypass,
          fingerprints: bypassFingerprints
        }),
      });
      const data = await resp.json();

      if (data.status === 'conflict_detected') {
        setModalData({
          title: "⚠️ Multiple Conflicts Detected",
          message: `Found ${data.conflicts.length} unique conflicts across your selection.`,
          conflicts: data.conflicts,
          can_bypass: true,
          isBulk: true,
          originalAction: { endpoint, mod_ids: selectedIds }
        });
        setModalOpen(true);
        return;
      }

      if (data.status === 'error') {
        showNotification(data.message, 'warning');
      } else {
        showNotification(data.message || 'Bulk action completed', 'success');
        setSelectedIds([]);
      }
      await fetchMods();
    } catch (err) {
      console.error(`Bulk action ${endpoint} failed:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleIgnoreFingerprint = async (fp: string) => {
    try {
      await fetch(`${API_BASE}/api/ignore-fingerprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: fp }),
      });
    } catch (err) {
      console.error('Failed to ignore fingerprint:', err);
    }
  };

  const saveSettings = async (newSettings: any) => {
    try {
      const resp = await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      
      const rulesResp = await fetch(`${API_BASE}/api/sorting-rules/raw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: rulesText }),
      });
      
      if (resp.ok && rulesResp.ok) {
        setSettings(newSettings);
        showNotification('Settings and Rules saved successfully. Resyncing...', 'success');
        setSettingsOpen(false);
        await syncMods();
      }
    } catch (err) {
      console.error('Save settings failed:', err);
      showNotification('Failed to save settings.', 'warning');
    }
  };

  useEffect(() => {
    fetchMods();
    fetchSettings();
    fetchProfiles();
  }, []);

  const filteredMods = mods.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getDependencyStyle = (reqId: string) => {
    const isActive = serverMods.includes(reqId);
    const isDownloaded = mods.some(m => m.id === reqId) || trash.some(t => t.id === reqId);
    
    if (isActive && isDownloaded) {
      return { color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.2)' };
    } else if (!isActive && isDownloaded) {
      return { color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.2)' };
    } else if (isActive && !isDownloaded) {
      return { color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.2)' };
    } else {
      return { color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.2)' };
    }
  };

  const getModName = (mid: string) => {
    const found = mods.find(m => m.id === mid) || trash.find(t => t.id === mid);
    return found ? found.name : mid;
  };

  // --- LÓGICA DE AGRUPAMENTO DE WORKSHOP ---
  const groupModsByWorkshop = (modsList: Mod[]) => {
    const groups: Record<string, Mod[]> = {};
    modsList.forEach(m => {
      if (!groups[m.workshop_id]) groups[m.workshop_id] = [];
      groups[m.workshop_id].push(m);
    });

    // Ordenação interna: Mod Core sempre no topo
    for (const workshopId in groups) {
      const group = groups[workshopId];
      if (group.length > 1) {
        const coreId = getCoreModId(group);
        groups[workshopId] = [
          ...group.filter(m => m.id === coreId),
          ...group.filter(m => m.id !== coreId).sort((a,b) => a.name.localeCompare(b.name))
        ];
      }
    }

    return groups;
  };

  const getCoreModId = (group: Mod[]) => {
    if (group.length <= 1) return group[0]?.id;
    
    // Heurística 1: O mod que outros no mesmo grupo requerem
    const groupIds = new Set(group.map(m => m.id));
    const requirementCounts: Record<string, number> = {};
    
    group.forEach(m => {
      m.require?.forEach(reqId => {
        if (groupIds.has(reqId)) {
          requirementCounts[reqId] = (requirementCounts[reqId] || 0) + 1;
        }
      });
    });

    let topMod = group[0].id;
    let maxReqs = -1;
    
    for (const mid in requirementCounts) {
      if (requirementCounts[mid] > maxReqs) {
        maxReqs = requirementCounts[mid];
        topMod = mid;
      }
    }

    if (maxReqs > 0) return topMod;

    // Heurística 2: O ID mais curto (geralmente o nome base)
    return [...group].sort((a, b) => a.id.length - b.id.length)[0].id;
  };

  return (
    <div className="app-container">
      {/* Premium Notification Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="premium-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="premium-modal"
            >
              <div className="premium-modal-header">
                <div className={`premium-alert-icon-container ${modalData.title.includes('Error') || modalData.title.includes('Incompatible') ? 'error' : 'warning'}`}>
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h2 className="premium-modal-title">{modalData.title}</h2>
                  <p className="premium-modal-subtitle">System Alert</p>
                </div>
              </div>

              <div className="premium-modal-body">
                <p>
                  {modalData.message}
                </p>

                <div className="premium-modal-detail">
                  <div className="flex items-center gap-2 mb-2 justify-center">
                    <Info size={14} className="text-blue-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recommended Action</span>
                  </div>
                  <p>
                    {modalData.remediation}
                  </p>
                </div>
              </div>

              <div className="premium-modal-actions">
                {(modalData as any).can_bypass && (
                  <button
                    onClick={() => handleAction((modalData as any).originalAction.endpoint, (modalData as any).originalAction.payload, true)}
                    className="premium-btn-action premium-btn-secondary"
                  >
                    Proceed Anyway (Overwrite)
                  </button>
                )}
                
                <button
                  onClick={() => setModalOpen(false)}
                  className="premium-btn-action premium-btn-primary"
                >
                  Cancel & Go Back
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <header className="header">
        <div className="brand-section">
          <span className="brand-subtitle">Project Zomboid</span>
          <h1>HellDrinx - Tool<span style={{ color: '#d97706' }}> | ModManager</span></h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.button
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={async () => {
              await fetchSettings();
              await fetchRules();
              setSettingsOpen(true);
            }}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-muted)', cursor: 'pointer', padding: '10px', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
            }}
            title="Application Settings"
          >
            <Settings size={20} />
          </motion.button>

          <div style={{ position: 'relative' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              style={{
                background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.2)',
                cursor: 'pointer', padding: '10px 16px', borderRadius: '12px',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
              }}
              title="Switch Profiles"
            >
              <Database size={18} />
              <span style={{ fontSize: '11px', fontWeight: 'bold' }}>
                {selectedProfile ? selectedProfile.toUpperCase() : 'PROFILES'}
              </span>
              <ChevronDown size={14} style={{ transform: profileMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {profileMenuOpen && (
                <motion.div
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                   className="glass"
                   style={{
                     position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '220px',
                     borderRadius: '16px', padding: '8px', zIndex: 100,
                     boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                     border: '1px solid rgba(217, 119, 6, 0.3)'
                   }}
                >
                  <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '8px' }}>
                    {profiles.length === 0 ? (
                      <div style={{ padding: '12px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>No profiles found</div>
                    ) : (
                      profiles.map(p => (
                        <div key={p} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                          <button
                            onClick={() => {
                              handleProfileLoad(p);
                              setProfileMenuOpen(false);
                            }}
                            className="btn"
                            style={{ 
                              flexGrow: 1, background: 'rgba(255,255,255,0.05)', color: 'white', padding: '8px 12px', 
                              borderRadius: '8px', justifyContent: 'flex-start', fontSize: '12px' 
                            }}
                          >
                            {p}
                          </button>
                          <button
                            onClick={() => handleProfileDelete(p)}
                            style={{ 
                              background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', 
                              borderRadius: '8px', padding: '8px', cursor: 'pointer' 
                            }}
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
                  
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setProfilesOpen(true);
                    }}
                    className="btn"
                    style={{ 
                      width: '100%', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', 
                      padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' 
                    }}
                  >
                    <Save size={14} />
                    CREATE NEW PROFILE
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {issues.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSidebarOpen(true)}
              style={{
                background: 'rgba(139, 38, 18, 0.15)', color: '#8b2612', border: '1px solid rgba(139, 38, 18, 0.3)',
                cursor: 'pointer', padding: '10px', borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
              }}
              title="View Issues"
            >
              <AlertTriangle size={20} />
              <span className="badge-count" style={{ top: '-4px', right: '-4px' }}>{issues.length}</span>
            </motion.button>
          )}

          <AnimatePresence mode="wait">
            {serverMods.length > 0 ? (
              <motion.button
                key="deactivate"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={() => handleAction('deactivate-all', {})}
                className="glass-btn btn-danger"
                style={{ fontSize: '12px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <XCircle size={16} />
                DEACTIVATE ALL
              </motion.button>
            ) : (
              <motion.button
                key="activate"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={() => handleAction('activate-all', {})}
                className="glass-btn"
                style={{
                  fontSize: '12px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.3)'
                }}
              >
                <Monitor size={16} />
                ACTIVATE ALL
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Control Bar */}
      <div className="glass" style={{ borderRadius: '16px', padding: '12px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder={activeTab === 'active' ? "Search by name or ID..." : "Search in trash..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'trash' && trash.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => handleAction('empty-trash', {})}
              className="glass-btn btn-danger"
              style={{ fontSize: '11px', padding: '10px 16px' }}
            >
              <Trash2 size={14} />
              EMPTY TRASH ({trash.length})
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setBackupModalOpen(true)}
          className="glass-btn"
          style={{ 
            fontSize: '11px', padding: '10px 16px', background: 'rgba(217, 119, 6, 0.1)', 
            borderColor: 'rgba(217, 119, 6, 0.3)', color: '#d97706'
          }}
        >
          <History size={14} />
          SERVER BACKUP
        </motion.button>


        <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '12px', flexShrink: 0, marginLeft: 'auto' }}>
          <button
            onClick={() => {
              setActiveTab('active');
              setSelectedIds([]);
            }}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === 'active' ? '#0891b2' : 'transparent',
              color: activeTab === 'active' ? 'white' : '#a6998a',
              fontSize: '11px', fontWeight: 'bold', transition: 'all 0.2s'
            }}
          >
            Active
          </button>
          <button
            onClick={() => {
              setActiveTab('trash');
              setSelectedIds([]);
            }}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === 'trash' ? '#8b2612' : 'transparent',
              color: activeTab === 'trash' ? 'white' : '#a6998a',
              fontSize: '11px', fontWeight: 'bold', transition: 'all 0.2s'
            }}
          >
            Uninstalled
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '4px' }}>
        <AnimatePresence mode="popLayout">
          {loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', marginTop: '100px', color: '#64748b' }}>
              <div className="animate-pulse">Carregando gerenciador...</div>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeTab === 'active' && (() => {
                const activeModsInServer = filteredMods.filter(m => serverMods.includes(m.id));
                const grouped = groupModsByWorkshop(activeModsInServer);
                
                if (activeModsInServer.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontStyle: 'italic' }}>
                      Nenhum mod ativo no servidor atualmente.
                    </div>
                  );
                }

                return Object.entries(grouped).map(([workshopId, group]) => {
                  const coreId = getCoreModId(group);
                  const isExpanded = expandedGroups[workshopId] || false;
                  
                  return (
                    <div key={workshopId} className="workshop-group" style={{ 
                      marginBottom: '16px', 
                      background: group.length > 1 ? 'rgba(30, 41, 59, 0.3)' : 'transparent',
                      borderRadius: '20px',
                      padding: group.length > 1 ? '4px' : '0',
                      border: group.length > 1 ? (isExpanded ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)') : 'none',
                      transition: 'all 0.3s ease'
                    }}>
                      <AnimatePresence mode="popLayout">
                        {group.map((mod, idx) => {
                          const isCore = mod.id === coreId && group.length > 1;
                          const isStandalone = group.length === 1;
                          const isLarge = isCore || isStandalone;

                          if (!isCore && group.length > 1 && !isExpanded) return null;
                          
                          return (
                            <motion.div
                              key={mod.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
              className={`mod-card ${highlightedMod === mod.id ? 'mod-highlight' : ''}`}
              id={`mod-${mod.id}`}
              style={{
                minHeight: isLarge ? '90px' : '65px',
                height: 'auto',
                border: isLarge ? '1px solid #d97706' : '1px solid rgba(255,255,255,0.1)',
                                boxShadow: isLarge ? '0 4px 20px rgba(217, 119, 6, 0.15)' : 'none',
                                background: isLarge ? 'rgba(15, 23, 42, 0.8)' : 'rgba(15, 23, 42, 0.4)',
                                marginLeft: !isLarge && group.length > 1 ? '32px' : '0',
                                marginTop: idx > 0 ? '4px' : '0',
                                position: 'relative',
                                display: 'flex'
                              }}
                            >
                              {!isLarge && group.length > 1 && (
                                 <div style={{ position: 'absolute', left: '-20px', top: '50%', width: '16px', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                              )}
                              <img
                                src={mod.poster_url ? `${API_BASE}${mod.poster_url}` : 'https://placehold.co/120x120/1e293b/64748b?text=PZ'}
                                alt={mod.name}
                                className="mod-poster"
                                style={{ width: isLarge ? '90px' : '65px', height: 'auto', alignSelf: 'stretch' }}
                              />
                              <div className="mod-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                  <div className="mod-name" style={{ color: isLarge ? '#fff' : '#94a3b8', fontSize: isLarge ? '16px' : '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mod.name}</div>
                                  {isCore && (
                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                      <span style={{ fontSize: '8px', background: 'linear-gradient(90deg, #d97706, #fbbf24)', color: 'black', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>CORE</span>
                                      <span style={{ fontSize: '8px', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>
                                        +{group.length - 1} SHARDS
                                      </span>
                                    </div>
                                  )}
                                  {!isCore && group.length > 1 && (
                                    <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.05)', color: '#64748b', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>SUB-MOD</span>
                                  )}
                                  
                                  {dependencyMap[mod.id]?.required_by?.some(rid => serverMods.includes(rid)) && (
                                    <span style={{ fontSize: '9px', background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>DEPENDENCY</span>
                                  )}
                                </div>
                                <div className="mod-meta">
                                  <span>ID: <code style={{ color: isCore ? '#d97706' : '#475569' }}>{mod.id}</code></span>
                                </div>
            
                                {/* Exibição de Dependências */}
                                {mod.require && mod.require.length > 0 && (
                                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {mod.require.map(reqId => {
                                      const style = getDependencyStyle(reqId);
                                      return (
                                        <span key={reqId} style={{ fontSize: '8px', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: '3px', ...style }} title={reqId}>
                                          {getModName(reqId)}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
            
                                {/* Exibição de Incompatibilidades */}
                                {mod.incompatible && mod.incompatible.some(incId => serverMods.includes(incId)) && (
                                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px' }}>
                                    <AlertTriangle size={16} className="animate-pulse" color="#ef4444" />
                                    <span style={{ fontSize: '11px', color: '#fca5a5', fontWeight: 'bold' }}>
                                      CONFLICT: {mod.incompatible.filter(incId => serverMods.includes(incId)).map(incId => getModName(incId)).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
            
                              <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {isCore && (
                                  <button
                                    className="btn"
                                    onClick={() => setExpandedGroups(prev => ({ ...prev, [workshopId]: !isExpanded }))}
                                    style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', borderRadius: '8px', padding: '8px' }}
                                  >
                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                  </button>
                                )}
                                  {mod.workshop_id && mod.workshop_id !== '0' && (
                                    <button
                                      className="btn"
                                      title="Ver no Steam Workshop"
                                      style={{ background: 'rgba(255,255,255,0.05)', color: '#3b82f6', borderRadius: '8px', padding: '8px' }}
                                      onClick={() => {
                                        const url = `steam://url/CommunityFilePage/${mod.workshop_id}`;
                                        (window as any).require('electron').ipcRenderer.invoke('open-external-url', url);
                                      }}
                                    >
                                      <ExternalLink size={16} />
                                    </button>
                                  )}
                                  <button
                                    className="btn"
                                    title="Abrir pasta local no Windows"
                                    style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderRadius: '8px', padding: '8px' }}
                                    onClick={() => {
                                      const targetPath = mod.absolute_path || `${settings.workshop_path}\\${mod.workshop_id}\\mods\\${mod.id}`;
                                      if (targetPath) {
                                         (window as any).require('electron').ipcRenderer.invoke('open-folder-native', targetPath);
                                      }
                                    }}
                                  >
                                    <FolderOpen size={16} />
                                  </button>
                                
                                <button
                                  className="btn"
                                  title="Remover do Servidor"
                                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                  onClick={() => handleAction('delete-specific', { mod_id: mod.id, workshop_id: mod.workshop_id, name: mod.name })}
                                >
                                  <XCircle size={18} />
                                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>REMOVE</span>
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  );
                });
              })()}

              {/* Uninstalled Tab rendering */}
              {activeTab === 'trash' && (() => {
                const inactiveMods = [...filteredMods.filter(m => !serverMods.includes(m.id) && !trash.some(t => t.id === m.id)), ...trash];
                const grouped = groupModsByWorkshop(inactiveMods);

                if (inactiveMods.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontStyle: 'italic' }}>
                      Nenhum mod inativo ou removido.
                    </div>
                  );
                }

                return Object.entries(grouped).map(([workshopId, group]) => {
                  const coreId = getCoreModId(group);
                  const isExpanded = expandedGroups[workshopId] || false;

                  return (
                    <div key={workshopId} className="workshop-group" style={{ 
                      marginBottom: '16px', 
                      background: group.length > 1 ? 'rgba(30, 41, 59, 0.1)' : 'transparent',
                      borderRadius: '20px',
                      padding: group.length > 1 ? '4px' : '0',
                      border: group.length > 1 ? (isExpanded ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(255,255,255,0.02)') : 'none',
                      transition: 'all 0.3s ease'
                    }}>
                      <AnimatePresence mode="popLayout">
                        {group.map((mod, idx) => {
                          const isTrash = trash.some(t => t.id === mod.id);
                          const isCore = mod.id === coreId && group.length > 1;
                          const isStandalone = group.length === 1;
                          const isLarge = isCore || isStandalone;

                          if (!isCore && group.length > 1 && !isExpanded) return null;

                          return (
                            <motion.div
                              key={mod.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              className="mod-card"
                              style={{
                                minHeight: isLarge ? '90px' : '65px',
                                height: 'auto',
                                opacity: isTrash ? 0.6 : 0.8,
                                border: isLarge ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                                background: isTrash ? 'rgba(239, 68, 68, 0.05)' : 'rgba(15, 23, 42, 0.4)',
                                marginLeft: !isLarge && group.length > 1 ? '32px' : '0',
                                marginTop: idx > 0 ? '4px' : '0',
                                position: 'relative',
                                display: 'flex'
                              }}
                            >
                              {/* Enhanced Selection Checkbox */}
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedIds(prev => 
                                    prev.includes(mod.id) 
                                      ? prev.filter(id => id !== mod.id) 
                                      : [...prev, mod.id]
                                  );
                                }}
                                style={{
                                  position: 'absolute', left: '8px', top: '8px', zIndex: 100,
                                  width: '26px', height: '26px', borderRadius: '8px',
                                  border: `2px solid ${selectedIds.includes(mod.id) ? '#0891b2' : 'rgba(255,255,255,0.5)'}`,
                                  background: selectedIds.includes(mod.id) ? '#0891b2' : 'rgba(15, 23, 42, 0.95)',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                              >
                                {selectedIds.includes(mod.id) ? (
                                   <div style={{ width: '10px', height: '10px', background: 'white', borderRadius: '2px', boxShadow: '0 0 5px rgba(255,255,255,0.5)' }} />
                                ) : (
                                   <div style={{ width: '4px', height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '50%' }} />
                                )}
                              </div>

                              <img
                                src={mod.poster_url ? `${API_BASE}${mod.poster_url}` : 'https://placehold.co/120x120/1e293b/64748b?text=PZ'}
                                alt={mod.name}
                                className="mod-poster"
                                style={{ filter: isTrash ? 'grayscale(100%)' : 'none', width: isLarge ? '90px' : '65px', height: 'auto', alignSelf: 'stretch' }}
                              />
                              <div className="mod-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                  <div className="mod-name" style={{ color: isLarge ? '#fff' : '#94a3b8', textDecoration: isTrash ? 'line-through' : 'none', fontSize: isLarge ? '16px' : '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mod.name}</div>
                                  {isCore && (
                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                      <span style={{ fontSize: '8px', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>ROOT</span>
                                      <span style={{ fontSize: '8px', background: 'rgba(15, 23, 42, 0.4)', color: '#64748b', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>
                                        {group.length - 1} SHARDS
                                      </span>
                                    </div>
                                  )}
                                  {isTrash ? (
                                      <span style={{ fontSize: '9px', background: '#8b2612', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>TRASH BIN</span>
                                  ) : (
                                      <span style={{ fontSize: '9px', background: '#334155', color: '#94a3b8', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>INACTIVE</span>
                                  )}
                                </div>
                                <div className="mod-meta">
                                  <span>ID: <code style={{ color: '#64748b' }}>{mod.id}</code></span>
                                </div>
                                
                                {mod.require && mod.require.length > 0 && (
                                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {mod.require.map(reqId => {
                                      const style = getDependencyStyle(reqId);
                                      return (
                                        <span key={reqId} style={{ fontSize: '8px', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: '3px', ...style }} title={reqId}>
                                          {getModName(reqId)}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
            
                                {mod.incompatible && mod.incompatible.some(incId => serverMods.includes(incId)) && (
                                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '10px' }}>
                                    <AlertTriangle size={16} color="#f87171" />
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
                                      CONFLICT WITH ACTIVE MODS: {mod.incompatible.filter(incId => serverMods.includes(incId)).map(incId => getModName(incId)).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
            
                                <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {isCore && (
                                    <button
                                      className="btn"
                                      onClick={() => setExpandedGroups(prev => ({ ...prev, [workshopId]: !isExpanded }))}
                                      style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '8px', padding: '8px' }}
                                    >
                                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                  )}
                                  {mod.workshop_id && mod.workshop_id !== '0' && (
                                    <button
                                      className="btn"
                                      title="Ver no Steam Workshop"
                                      style={{ background: 'rgba(255,255,255,0.05)', color: '#3b82f6', borderRadius: '8px', padding: '8px' }}
                                      onClick={() => {
                                        const url = `steam://url/CommunityFilePage/${mod.workshop_id}`;
                                        (window as any).require('electron').ipcRenderer.invoke('open-external-url', url);
                                      }}
                                    >
                                      <ExternalLink size={16} />
                                    </button>
                                  )}
                                  {!isTrash && (
                                    <button
                                      className="btn"
                                      title="Abrir pasta local no Windows"
                                      style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderRadius: '8px', padding: '8px' }}
                                      onClick={() => {
                                        const targetPath = mod.absolute_path || `${settings.workshop_path}\\${mod.workshop_id}\\mods\\${mod.id}`;
                                        if (targetPath) {
                                           (window as any).require('electron').ipcRenderer.invoke('open-folder-native', targetPath);
                                        }
                                      }}
                                    >
                                      <FolderOpen size={16} />
                                    </button>
                                  )}
                                
                                {!isTrash ? (
                                    <button
                                      className="btn"
                                      style={{ padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #0891b2 0%, #059669 100%)', color: 'white', border: 'none', boxShadow: '0 0 15px rgba(5, 150, 105, 0.3)' }}
                                      onClick={() => handleAction('activate-mod', { mod_id: mod.id, workshop_id: mod.workshop_id })}
                                    >
                                      <Package size={16} />
                                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>ACTIVATE</span>
                                    </button>
                                ) : (
                                    <button
                                      className="btn"
                                      style={{ background: 'linear-gradient(135deg, #0891b2 0%, #059669 100%)', color: 'white', border: 'none', boxShadow: '0 0 10px rgba(5, 150, 105, 0.2)', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                      onClick={() => handleAction('restore', { workshop_id: mod.workshop_id })}
                                    >
                                    <History size={16} />
                                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>RESTORE</span>
                                  </button>
                                )}
            
                                {!isTrash && (
                                  <button
                                    className="btn"
                                    title="Mover pasta física para Lixeira (Archive)"
                                    style={{ background: 'rgba(139, 38, 18, 0.1)', color: '#8b2612', borderRadius: '8px', padding: '8px' }}
                                    onClick={() => handleAction('delete-volume', { mod_id: mod.id, workshop_id: mod.workshop_id, name: mod.name })}
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              style={{
                background: '#0f172a', border: '1px solid #334155', width: '100%',
                maxWidth: '600px', borderRadius: '24px', padding: '40px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <Settings size={28} color="#3b82f6" />
                <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Application Settings</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>Workshop Content Path</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      defaultValue={settings.workshop_path}
                      id="workshop_path_input"
                      style={{ flexGrow: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '14px', color: 'white', outline: 'none' }}
                    />
                    <button
                      onClick={async () => {
                        try {
                          const path = await (window as any).require('electron').ipcRenderer.invoke('select-folder');
                          if (path) (document.getElementById('workshop_path_input') as HTMLInputElement).value = path;
                        } catch (e) { console.error('IPC failed', e); }
                      }}
                      className="glass-btn" style={{ padding: '0 16px' }}
                    >
                      <FolderOpen size={18} />
                    </button>
                  </div>
                  <p style={{ fontSize: '10px', color: '#4d5569', marginTop: '6px' }}>Target: \Steam\steamapps\workshop\content\108600</p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>Server Config (servertest.ini)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      defaultValue={settings.server_config_path}
                      id="server_config_path_input"
                      style={{ flexGrow: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '14px', color: 'white', outline: 'none' }}
                    />
                    <button
                      onClick={async () => {
                        try {
                          const path = await (window as any).require('electron').ipcRenderer.invoke('select-file');
                          if (path) (document.getElementById('server_config_path_input') as HTMLInputElement).value = path;
                        } catch (e) { console.error('IPC failed', e); }
                      }}
                      className="glass-btn" style={{ padding: '0 16px' }}
                    >
                      <FolderOpen size={18} />
                    </button>
                  </div>
                  <p style={{ fontSize: '10px', color: '#4d5569', marginTop: '6px' }}>Target: \Zomboid\Server\servertest.ini</p>
                </div>
                
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ display: 'block', margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Sorting Rules Editor</label>
                      <span title="Sorting rules serve to correctly order mods, preventing them from crashing the server. Be careful, always backup your server before modifying this!" style={{ cursor: 'help', display: 'flex' }}>
                        <Info size={14} color="#64748b" />
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await fetch(`${API_BASE}/api/sorting-rules/open`, { method: 'POST' });
                        } catch (e) { console.error(e); }
                      }}
                      style={{ background: 'transparent', border: '1px solid #334155', color: '#3b82f6', borderRadius: '6px', fontSize: '10px', padding: '4px 12px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      OPEN IN NOTEPAD
                    </button>
                  </div>
                  <textarea
                     value={rulesText}
                     onChange={(e) => setRulesText(e.target.value)}
                     style={{
                       width: '100%', minHeight: '180px', background: '#020617', border: '1px solid #334155', borderRadius: '12px', 
                       padding: '16px', color: '#a5b4fc', fontFamily: '"Fira Code", monospace', fontSize: '12px', outline: 'none', resize: 'vertical'
                     }}
                     placeholder="[modID]\nloadAfter=mod_x, mod_y\nloadFirst=on\ncategory=map"
                     spellCheck={false}
                  />
                </div>

                <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '12px', color: '#fca5a5', margin: 0, fontWeight: 'bold' }}>CONFLICT WHITELIST</h4>
                      <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0 0' }}>Reset all previously 'ignored' file conflicts.</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const resp = await fetch(`${API_BASE}/api/clear-ignored-conflicts`, { method: 'POST' });
                          if (resp.ok) showNotification('All ignored conflicts have been cleared.', 'success');
                        } catch (e) { console.error(e); }
                      }}
                      style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '8px', fontSize: '10px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      CLEAR WHITELIST
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
                <button
                  onClick={() => {
                    const w = (document.getElementById('workshop_path_input') as HTMLInputElement).value;
                    const s = (document.getElementById('server_config_path_input') as HTMLInputElement).value;
                    saveSettings({ workshop_path: w, server_config_path: s });
                  }}
                  className="btn btn-primary"
                  style={{ flexGrow: 1, justifyContent: 'center' }}
                >
                  SAVE CONFIGURATIONS
                </button>
                <button
                  onClick={() => setSettingsOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Footer Info */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#475569', fontSize: '0.70rem', padding: '8px 16px', background: 'rgba(15, 23, 42, 0.5)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>v2.1 NODE PERFORMANCE EDITION</span>
        </div>

        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(5, 150, 105, 0.3)' }}
          whileTap={{ scale: 0.95 }}
          onClick={syncMods}
          disabled={syncing}
          style={{
            fontSize: '11px',
            padding: '6px 20px',
            background: 'linear-gradient(135deg, #d97706 0%, #8b2612 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(139, 38, 18, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold',
            opacity: syncing ? 0.7 : 1,
            cursor: syncing ? 'not-allowed' : 'pointer',
            zIndex: 10
          }}
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'SYNCING...' : 'Sync Now !'}
        </motion.button>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Número de inscrições do Workshop"><Package size={12} /> {new Set(mods.map(m => m.workshop_id)).size} Subscribed</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={12} /> {trash.length} Archived</span>
        </div>
      </footer>

      {/* Sidebar Alerta */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="sidebar-overlay"
              style={{ zIndex: 3000 }}
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="sidebar"
              style={{ zIndex: 3001 }}
            >
              <div className="sidebar-header">
                <h2>Avisos Críticos</h2>
                <button className="glass-btn" onClick={() => setIsSidebarOpen(false)} style={{ padding: '8px' }}>
                  <ChevronDown size={24} style={{ transform: 'rotate(-90deg)' }} />
                </button>
              </div>
              
              <div className="issue-list">
                {issues.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: '40px', color: '#64748b' }}>
                    <Package size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <p>Nenhum problema detectado!</p>
                  </div>
                ) : (
                  <>
                    {/* Tab Switcher */}
                    <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '14px', marginBottom: '20px' }}>
                      <button 
                        onClick={() => setActiveSidebarTab('conflict')}
                        style={{ 
                          flexGrow: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                          background: activeSidebarTab === 'conflict' ? '#8b2612' : 'transparent',
                          color: activeSidebarTab === 'conflict' ? 'white' : '#94a3b8',
                          fontSize: '11px', fontWeight: 'bold', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                      >
                        <XCircle size={14} />
                        Conflitos ({issues.filter(i => i.type === 'conflict').length})
                      </button>
                      <button 
                        onClick={() => setActiveSidebarTab('missing')}
                        style={{ 
                          flexGrow: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                          background: activeSidebarTab === 'missing' ? '#d97706' : 'transparent',
                          color: activeSidebarTab === 'missing' ? 'white' : '#94a3b8',
                          fontSize: '11px', fontWeight: 'bold', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                      >
                        <AlertCircle size={14} />
                        Dependências ({issues.filter(i => i.type === 'missing').length})
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeSidebarTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                      >
                        {issues.filter(i => i.type === activeSidebarTab).length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
                            <Package size={32} style={{ opacity: 0.1, marginBottom: '12px' }} />
                            <p style={{ fontSize: '12px' }}>Nenhum item nesta categoria.</p>
                          </div>
                        ) : (
                          issues.filter(i => i.type === activeSidebarTab).map((issue, idx) => (
                            <div key={`${activeSidebarTab}-${idx}`} className="issue-card">
                              <div className="issue-desc" style={{ marginBottom: '12px' }}>
                                <strong>{issue.modName}</strong>: {issue.detail}
                              </div>
                              <button 
                                className={activeSidebarTab === 'conflict' ? "btn-primary" : "btn-secondary"}
                                style={{ 
                                  padding: '6px 12px', fontSize: '10px', width: '100%', justifyContent: 'center',
                                  ...(activeSidebarTab === 'missing' ? { background: 'rgba(8, 145, 178, 0.1)', border: '1px solid rgba(8, 145, 178, 0.2)', color: '#0891b2' } : {})
                                }}
                                onClick={() => scrollToMod(issue.modId)}
                              >
                                Localizar Mod
                              </button>
                            </div>
                          ))
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </>
                )}
              </div>

              <div style={{ marginTop: 'auto', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', fontSize: '12px', color: '#64748b' }}>
                <p>💡 Resolver esses alertas garante que seu servidor carregue corretamente e sem crashes.</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{
        __html: `
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}} />
      {/* Profiles Modal */}
      <AnimatePresence>
        {profilesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="premium-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="premium-modal"
              style={{ maxWidth: '600px' }}
            >
              <div className="premium-modal-header" style={{ marginBottom: '24px' }}>
                <div className="premium-alert-icon-container warning" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  <Database size={32} />
                </div>
                <h2 className="premium-modal-title">Profile Management</h2>
                <p className="premium-modal-subtitle">Config Presets</p>
              </div>

              <div className="premium-modal-body" style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', display: 'block' }}>Set Profile Name</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      id="new-profile-name"
                      placeholder="Enter profile name (e.g., Multiplayer_Survival)..." 
                      className="glass-input" 
                      style={{ flexGrow: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleProfileSave((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                          setProfilesOpen(false);
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('new-profile-name') as HTMLInputElement;
                        handleProfileSave(input.value);
                        input.value = '';
                        setProfilesOpen(false);
                      }}
                      className="glass-btn" 
                      style={{ background: '#3b82f6', color: 'white', border: 'none' }}
                    >
                      <Save size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="premium-modal-actions" style={{ marginTop: '24px' }}>
                <button
                  onClick={() => setProfilesOpen(false)}
                  className="premium-btn-action premium-btn-primary"
                  style={{ padding: '14px' }}
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backup Modal */}
      <AnimatePresence>
        {backupModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="premium-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="premium-modal"
              style={{ maxWidth: '600px' }}
            >
              <div className="premium-modal-header" style={{ marginBottom: '24px' }}>
                <div className="premium-alert-icon-container warning" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc' }}>
                  <History size={32} />
                </div>
                <h2 className="premium-modal-title">Server Backup</h2>
                <p className="premium-modal-subtitle">Secure Your Progress</p>
              </div>

              <div className="premium-modal-body" style={{ textAlign: 'left' }}>
                {/* Zomboid Folder Step */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={14} /> 1. Project Zomboid Main Directory
                  </label>
                  <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px' }}>
                    Typically: <code>C:\Users\{window.process?.env?.USERNAME || 'User'}\Zomboid</code>
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      readOnly
                      type="text" 
                      placeholder="Folder not selected..." 
                      className="glass-input" 
                      value={zomboidPath}
                      style={{ flexGrow: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '11px' }}
                    />
                    <button 
                      onClick={() => handleBackupPathStep('zomboid')}
                      className="glass-btn" 
                      style={{ padding: '8px 12px', borderColor: zomboidPath ? '#3b82f6' : 'rgba(255,255,255,0.1)' }}
                    >
                      <FolderOpen size={16} />
                    </button>
                  </div>
                </div>

                {/* Backup Destination Step */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <History size={14} /> 2. Where To Store The Backup?
                  </label>
                  <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px' }}>
                    Recommendation: Area de Trabalho (Desktop)
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      readOnly
                      type="text" 
                      placeholder="Destination not selected..." 
                      className="glass-input" 
                      value={backupDest}
                      style={{ flexGrow: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '11px' }}
                    />
                    <button 
                      onClick={() => handleBackupPathStep('dest')}
                      className="glass-btn" 
                      style={{ padding: '8px 12px', borderColor: backupDest ? '#3b82f6' : 'rgba(255,255,255,0.1)' }}
                    >
                      <FolderOpen size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="premium-modal-actions" style={{ gap: '12px' }}>
                <button
                  disabled={!zomboidPath || !backupDest || backupLoading}
                  onClick={handleBackupExecution}
                  className="premium-btn-action premium-btn-primary"
                  style={{ 
                    padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    opacity: (!zomboidPath || !backupDest || backupLoading) ? 0.5 : 1,
                    background: backupLoading ? 'var(--text-secondary)' : 'white'
                  }}
                >
                  <History size={18} className={backupLoading ? "animate-spin" : ""} />
                  {backupLoading ? "GENERATING BACKUP..." : "GENERATE BACKUP NOW"}
                </button>
                <button
                  onClick={() => setBackupModalOpen(false)}
                  className="premium-btn-action"
                  style={{ background: 'transparent', color: '#94a3b8', padding: '10px', fontSize: '10px' }}
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            style={{
              position: 'fixed', bottom: '32px', left: '50%', zIndex: 3000,
              background: notification.type === 'success' ? 'rgba(34, 197, 94, 0.9)' : (notification.type === 'warning' ? 'rgba(245, 158, 11, 0.9)' : 'rgba(59, 130, 246, 0.9)'),
              color: 'white', padding: '12px 24px', borderRadius: '16px', fontWeight: 'bold',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}
          >
            {notification?.type === 'success' ? <Package size={18} /> : <AlertTriangle size={18} />}
            {notification?.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Bar (Bulk Actions) */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 100, x: '-50%', opacity: 0 }}
            style={{
              position: 'fixed', bottom: '80px', left: '50%', zIndex: 2000,
              background: 'rgba(13, 11, 10, 0.95)', border: '1px solid #0891b2',
              backdropFilter: 'blur(12px)', padding: '12px 24px', borderRadius: '24px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '20px'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0891b2' }}>{selectedIds.length} SELECTED</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>MODS ENQUEUED</span>
            </div>
            <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="premium-btn-action"
                style={{ padding: '8px 16px', fontSize: '11px', background: 'linear-gradient(135deg, #0891b2 0%, #059669 100%)', color: 'white', border: 'none', boxShadow: '0 0 15px rgba(5, 150, 105, 0.3)' }}
                onClick={() => handleBulkAction('activate-bulk')}
              >
                PROCEED TO ACTIVATE
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                style={{ padding: '8px 16px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
              >
                DESELECT ALL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Conflict Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            style={{ 
              background: 'rgba(2, 6, 23, 0.9)', 
              backdropFilter: 'blur(10px)',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass"
              style={{
                width: '100%', maxWidth: '500px', padding: '40px', borderRadius: '32px',
                textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)',
                position: 'relative', overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', opacity: 0.05 }}>
                <AlertTriangle size={300} color="#f59e0b" />
              </div>

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ 
                  width: '80px', height: '80px', borderRadius: '24px', 
                  background: 'rgba(245, 158, 11, 0.1)', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                  boxShadow: '0 0 30px rgba(245, 158, 11, 0.15)'
                }}>
                  <AlertTriangle size={40} color="#f59e0b" />
                </div>

                <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#fff', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                  {modalData?.title || "System Alert"}
                </h1>
                
                {modalData?.isBulk ? (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '16px', textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px' }}>
                        Found <strong>{modalData.conflicts.length} unique conflicts</strong> across your selection.
                      </p>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {modalData.conflicts.map((c: any, i: number) => (
                          <div key={i} style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '11px', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.05)' }}>
                             Conflict between <strong>{c.mod_id}</strong> and <strong>{c.conflicting_with}</strong>
                             <div style={{ opacity: 0.6, marginTop: '4px' }}>{c.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
                      {modalData?.message}
                    </p>

                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '20px', borderRadius: '20px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#60a5fa' }}>
                        <Info size={16} />
                        <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Recommended Action</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
                        {modalData?.remediation}
                      </p>
                    </div>
                  </>
                )}

                {modalData?.can_bypass && (
                  <div 
                    onClick={() => setRememberConflict(!rememberConflict)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '10px', 
                      justifyContent: 'center', marginBottom: '32px', cursor: 'pointer',
                      padding: '12px', borderRadius: '16px', background: rememberConflict ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                     <div style={{ 
                        width: '18px', height: '18px', borderRadius: '5px', 
                        border: '2px solid #3b82f6', background: rememberConflict ? '#3b82f6' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                     }}>
                       {rememberConflict && <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '1px' }} />}
                     </div>
                     <span style={{ fontSize: '12px', color: rememberConflict ? '#fff' : '#64748b', fontWeight: 'bold' }}>
                       Ignore future identical conflicts for this mod set
                     </span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {modalData?.can_bypass && (
                    <button
                      className="premium-btn-action"
                      style={{ padding: '16px', background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#000' }}
                      onClick={() => {
                        if (rememberConflict) {
                          if (modalData.isBulk) {
                            modalData.conflicts.forEach((c: any) => handleIgnoreFingerprint(c.fingerprint));
                          } else if (modalData.fingerprint) {
                            handleIgnoreFingerprint(modalData.fingerprint);
                          }
                        }
                        
                        if (modalData.isBulk) {
                           handleBulkAction(modalData.originalAction.endpoint, true, modalData.conflicts.map((c: any) => c.fingerprint));
                        } else {
                           handleAction(modalData.originalAction.endpoint, modalData.originalAction.payload, true);
                        }
                        setModalOpen(false);
                      }}
                    >
                      PROCEED ANYWAY (OVERWRITE)
                    </button>
                  )}
                  <button
                    onClick={() => setModalOpen(false)}
                    style={{ 
                      background: 'white', color: '#000', border: 'none', 
                      padding: '16px', borderRadius: '16px', cursor: 'pointer', 
                      fontWeight: '900', fontSize: '13px' 
                    }}
                  >
                    CANCEL & GO BACK
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
