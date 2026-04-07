import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
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
  Trash,
  Zap,
  Play,
  Copy,
  FileText,
  UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import bgCats from './assets/helldrinx_bg_pure.png';

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
  const [profiles, setProfiles] = useState<{ user: string[], community: string[] }>({ user: [], community: [] });
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{ name: string, isCommunity: boolean } | null>(null);
  const [lastLoadedMods, setLastLoadedMods] = useState<string[]>([]);

  const isProfileDirty = useMemo(() => {
    if (!selectedProfile || lastLoadedMods.length === 0) return false;
    if (serverMods.length !== lastLoadedMods.length) return true;
    const sortedServer = [...serverMods].sort();
    const sortedLast = [...lastLoadedMods].sort();
    return sortedServer.some((mod, idx) => mod !== sortedLast[idx]);
  }, [serverMods, lastLoadedMods, selectedProfile]);

  // New States for Simplified Presets (H.I.P. v2)
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingProfile, setIsProcessingProfile] = useState(false);
  const [customPresetName, setCustomPresetName] = useState<string>("");
  const [isNamingNew, setIsNamingNew] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ path: string, name: string } | null>(null);
  const [importMethod, setImportMethod] = useState<'full' | 'partial'>('partial');
  const [isEditingPresets, setIsEditingPresets] = useState(false);

  const [backupLoading, setBackupLoading] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [zomboidPath, setZomboidPath] = useState<string>('');
  const [backupDest, setBackupDest] = useState<string>('');
  const [enhanceModalOpen, setEnhanceModalOpen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

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
      const response = await fetch(`${API_BASE}/api/profiles`);
      const data = await response.json();
      setProfiles(data);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  };

  const handleOpenProfilesFolder = async (isCommunity = false) => {
    try {
      const response = await fetch(`${API_BASE}/api/profiles/path?is_community=${isCommunity}`);
      const data = await response.json();
      if (data.path) {
        await (window as any).electron.openFolderNative(data.path);
      }
    } catch (err) {
      console.error('Error opening folder:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.ini')) {
        const filePath = (file as any).path;

        if (!filePath) {
          showNotification('Could not detect file path from Drag & Drop. Please click to browse instead!', 'warning');
          return;
        }

        // Use the custom name if provided, otherwise fallback to filename
        const finalName = customPresetName.trim() || file.name.replace('.ini', '');
        if (!customPresetName.trim()) setCustomPresetName(finalName);

        setPendingImport({ path: filePath, name: finalName });
        showNotification(`Modpack data detected! Applying to: ${finalName}`, 'info');
      } else {
        showNotification('Only .ini files are allowed!', 'warning');
      }
    }
  };

  const handleImportProfile = async (isCommunity = false) => {
    try {
      const filePath = await (window as any).electron.selectFile();
      if (filePath) {
        // Extract base name from path
        const fileName = filePath.split(/[\\/]/).pop() || 'preset';
        const cleanName = fileName.replace('.ini', '');

        // Respect the name defined in Step 1
        const finalName = customPresetName.trim() || cleanName;
        if (!customPresetName.trim()) setCustomPresetName(finalName);

        setPendingImport({ path: filePath, name: finalName });
        showNotification(`Content selected: ${fileName}. Ready to apply!`, 'info');
      }
    } catch (err) {
      console.error('Error selecting file:', err);
    }
  };

  const handleProfileSave = async (profileName: string) => {
    if (!profileName) return;
    try {
      const response = await fetch(`${API_BASE}/api/profiles/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName })
      });
      const data = await response.json();
      if (data.status === 'success') {
        showNotification(`Preset "${profileName}" saved!`, 'success');
        fetchProfiles();
        setLastLoadedMods([...serverMods]);
        setSelectedProfile({ name: profileName, isCommunity: false });
      } else {
        showNotification(data.message, 'warning');
      }
    } catch (err) {
      showNotification(`Error saving preset: ${err}`, 'warning');
    }
  };

  const handleProfileLoad = async (profileName: string, isCommunity: boolean = false, method: 'full' | 'partial' = 'full') => {
    try {
      const resp = await fetch(`${API_BASE}/api/profiles/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName, is_community: isCommunity, method }),
      });
      const data = await resp.json();
      if (data.status === 'success') {
        showNotification(data.message.replace('Profile', 'Preset'), 'success');
        setSelectedProfile({ name: profileName, isCommunity });

        // AUTO-CLONE: If from community, save a local copy immediately
        if (isCommunity) {
          try {
            await fetch(`${API_BASE}/api/profiles/save`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: profileName }),
            });
          } catch (e) {
            console.error("Auto-clone error:", e);
          }
        }

        // Synchronize both preset list and active mod state
        await fetchProfiles();
        await syncMods();
      } else {
        showNotification(data.message, 'warning');
      }
    } catch (err) {
      showNotification(`Load error: ${err}`, 'warning');
    } finally {
      // After sync, synchronize the baseline for manual change detection
      setTimeout(() => {
        setLastLoadedMods([...serverMods]);
      }, 1000);
    }
  };

  const handleProfileDelete = async (name: string, isCommunity: boolean = false) => {
    try {
      const resp = await fetch(`${API_BASE}/api/profiles/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, is_community: isCommunity }),
      });
      if (resp.ok) {
        showNotification(`Preset '${name}' removed.`, 'info');
        if (selectedProfile?.name === name) setSelectedProfile(null);
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
    showNotification("Generating backup... This may take a while depending on your Saves folder size.", "info");
    
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
      showNotification('Backup failed due to a system error. Check if the game is running.', 'warning');
    } finally {
      setBackupLoading(false);
    }
  };

  const syncMods = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/sync`, { method: 'POST' });
      const data = await res.json();
      await fetchMods();
      showNotification("Discovery completed! Mod list is up to date.", "info");
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleEnhance = async () => {
    setIsEnhancing(true);
    try {
      const res = await fetch(`${API_BASE}/api/enhance`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        showNotification(data.message, 'success');
        if (data.error) {
          setModalData(data.error);
          setModalOpen(true);
        }
        await fetchMods();
        setEnhanceModalOpen(false);
      } else {
        showNotification(data.message || 'Error occurred during enhancement.', 'warning');
      }
    } catch (err) {
      console.error('Enhance failed:', err);
      showNotification('Communication error with the engine.', 'warning');
    } finally {
      setIsEnhancing(false);
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
          ...group.filter(m => m.id !== coreId).sort((a, b) => a.name.localeCompare(b.name))
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
      <header className="header" style={{
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0, // Prevent header from being squeezed by mod list
        minHeight: '120px' // Ensure a consistent height for the cinematic view
      }}>
        {/* Cinematic Layer 0: Panoramic Cats Night Ops (Fitted) */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none'
        }}>
          <img
            src={bgCats}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: '15% 15%', // Shifted left & Focused on faces
              opacity: 1,
              filter: 'brightness(1.1) contrast(1.2) saturate(1.15)'
            }}
          />
          {/* Ambient Overlay for contrast and readability */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(13, 11, 10, 0.6) 0%, rgba(13, 11, 10, 0) 35%, rgba(13, 11, 10, 0) 75%, rgba(13, 11, 10, 0.6) 100%)',
          }} />
        </div>

        <div className="brand-section" style={{ position: 'relative', zIndex: 1 }}>
          <span className="brand-subtitle">Project Zomboid</span>
          <h1 style={{ textShadow: '2px 2px 15px rgba(0,0,0,0.9), 0 0 20px rgba(255,69,0,0.2)' }}>
            HellDrinx - Tool<span style={{ color: '#d97706' }}> | ModManager</span>
          </h1>
        </div>

        <div className="header-controls" style={{ position: 'relative', zIndex: 1 }}>
          {/* GROUP 1: PRESET STATUS & SAVE */}
          <div className="action-group">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`status-pill ${isProfileDirty ? 'dirty' : ''}`}
              onClick={() => setProfilesOpen(true)}
              title="Click to open Preset Manager"
            >
              <Database size={16} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '7px', fontWeight: '800', opacity: 0.4, letterSpacing: '0.1em', marginBottom: '2px' }}>PROFILE:</span>
                <span style={{ fontSize: '11px', fontWeight: '800', lineHeight: 1 }}>
                  {selectedProfile ? selectedProfile.name.toUpperCase() : 'NO PRESET'}
                </span>
              </div>

              {/* Contextual Save Button INSIDE the pill or next to it for tight integration */}
              <AnimatePresence>
                {isProfileDirty && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProfileSave(selectedProfile!.name);
                    }}
                    style={{
                      background: 'var(--accent-amber)', color: '#000',
                      padding: '6px', borderRadius: '8px', display: 'flex'
                    }}
                    title="UNSAVED CHANGES! Click to save now."
                  >
                    <Save size={14} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* GROUP 2: BULK ACTIONS */}
          <div className="action-group">
            <AnimatePresence mode="wait">
              {serverMods.length > 0 ? (
                <motion.button
                  key="deactivate"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => handleAction('deactivate-all', {})}
                  className="glass-btn btn-danger"
                  style={{ fontSize: '11px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px' }}
                >
                  <XCircle size={16} />
                  DEACTIVATE ALL
                </motion.button>
              ) : (
                <motion.button
                  key="activate"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => handleAction('activate-all', {})}
                  className="glass-btn"
                  style={{ fontSize: '11px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.3)' }}
                >
                  <Play size={16} />
                  ACTIVATE ALL
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* GROUP 3: UTILITIES & SYSTEM */}
          <div className="action-group" style={{ padding: '4px 8px' }}>
            {issues.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSidebarOpen(true)}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none',
                  cursor: 'pointer', padding: '8px', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                }}
                title="View Critical Issues"
              >
                <AlertTriangle size={18} />
                <span className="badge-count" style={{ top: '-4px', right: '-4px', fontSize: '9px' }}>{issues.length}</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ rotate: 90, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={async () => {
                await fetchSettings();
                await fetchRules();
                setSettingsOpen(true);
              }}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Application Settings"
            >
              <Settings size={20} />
            </motion.button>
          </div>
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
              <div className="animate-pulse">Loading manager...</div>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeTab === 'active' && (() => {
                const activeModsInServer = filteredMods.filter(m => serverMods.includes(m.id));
                const grouped = groupModsByWorkshop(activeModsInServer);

                if (activeModsInServer.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontStyle: 'italic' }}>
                      No mods currently active on the server.
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
                                  <span>ID: <code style={{ color: isCore ? '#d97706' : '#475569' }}>{mod.workshop_id && mod.workshop_id !== '0' ? mod.workshop_id : mod.id}</code></span>
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
                                    title="View on Steam Workshop"
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
                                  title="Open local folder in Windows"
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
                                  title="Remove from Server"
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
                      No inactive or removed mods.
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
                                  <span>ID: <code style={{ color: '#64748b' }}>{mod.workshop_id && mod.workshop_id !== '0' ? mod.workshop_id : mod.id}</code></span>
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
                                    title="View on Steam Workshop"
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
                                    title="Open local folder in Windows"
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
                                    title="Archive physical folder to Trash Bin"
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
                      <label style={{ display: 'block', margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Advanced Maintenance</label>
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.1)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Zap size={18} style={{ color: '#60a5fa' }} />
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                      The <strong>Sorting Rule Editor</strong> has been moved to the main dashboard under the <strong>Enhance Mods</strong> button for better workflow access.
                    </p>
                  </div>
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
          <span>developed by: augusto-developer (Lopez)</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)' }}
            whileTap={{ scale: 0.95 }}
            onClick={syncMods}
            disabled={syncing}
            style={{
              fontSize: '11px',
              padding: '6px 20px',
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#3b82f6',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 'bold',
              opacity: syncing ? 0.7 : 1,
              cursor: syncing ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'SCANNING...' : 'Manual Sync'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(217, 119, 6, 0.3)' }}
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              await fetchRules();
              setEnhanceModalOpen(true);
            }}
            disabled={isEnhancing}
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
              opacity: isEnhancing ? 0.7 : 1,
              cursor: isEnhancing ? 'not-allowed' : 'pointer'
            }}
          >
            <Zap size={14} className={isEnhancing ? 'animate-spin' : ''} />
            {isEnhancing ? 'ENHANCING...' : 'Enhance Mods !'}
          </motion.button>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Workshop subscriptions count"><Package size={12} /> {new Set(mods.map(m => m.workshop_id)).size} Subscribed</span>
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
                <h2>Critical Issues</h2>
                <button className="glass-btn" onClick={() => setIsSidebarOpen(false)} style={{ padding: '8px' }}>
                  <ChevronDown size={24} style={{ transform: 'rotate(-90deg)' }} />
                </button>
              </div>

              <div className="issue-list">
                {issues.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: '40px', color: '#64748b' }}>
                    <Package size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <p>No issues detected!</p>
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
                        Conflicts ({issues.filter(i => i.type === 'conflict').length})
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
                        Dependencies ({issues.filter(i => i.type === 'missing').length})
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
                            <p style={{ fontSize: '12px' }}>No items in this category.</p>
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
                                Find Mod
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
                <p>💡 Resolving these alerts ensures your server loads correctly and without crashes.</p>
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
      `}} />

      {/* Advanced Profiles Modal (H.I.P. System) */}
      <AnimatePresence>
        {profilesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="premium-modal-overlay"
            style={{ zIndex: 4000 }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="premium-modal"
              style={{
                maxWidth: '600px', width: '95%', padding: '0',
                background: '#0f172a', border: '1px solid rgba(255,255,255,0.05)',
                maxHeight: '92vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.1)'
              }}
            >
              {/* Header (Compact Integrated Hero Banner Design) */}
              <div className="premium-modal-header" style={{
                height: '160px', padding: '0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, position: 'relative', overflow: 'hidden',
                background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.08) 0%, rgba(15, 23, 42, 1) 100%)'
              }}>
                {/* Visual Integration Layers */}
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {/* Ambient Glow Background Effect */}
                  <div style={{ position: 'absolute', width: '250px', height: '250px', background: 'rgba(59, 130, 246, 0.05)', filter: 'blur(70px)', borderRadius: '50%', zIndex: 0 }} />

                  {/* Shadow Gradient to blend with Body */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '80px', background: 'linear-gradient(to top, #0f172a, transparent)', zIndex: 2 }} />

                  {/* Centered Integrated Mascot (Compact) */}
                  <img
                    src="builder_cat.png"
                    alt="HellDrinx Builder Hero"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                    style={{
                      width: '150px', height: '150px', objectFit: 'contain',
                      maskImage: 'radial-gradient(circle, black 50%, transparent 90%)',
                      WebkitMaskImage: 'radial-gradient(circle, black 50%, transparent 90%)',
                      filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.8))',
                      zIndex: 1, transform: 'translateY(10px)', opacity: 0.95
                    }}
                  />
                </div>

                {/* Discrete Close Button (Top Right) */}
                <button
                  onClick={() => setProfilesOpen(false)}
                  style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', color: '#64748b', cursor: 'pointer', padding: '10px', borderRadius: '12px', display: 'flex', zIndex: 10, transition: 'all 0.2s' }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseOut={(e) => (e.currentTarget.style.color = '#64748b')}
                >
                  <XCircle size={22} />
                </button>
              </div>

              {/* Scrollable Body */}
              {/* Scrollable Body */}
              <div className="premium-modal-body" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', flexGrow: 1, scrollbarWidth: 'thin', justifyContent: isNamingNew ? 'center' : 'flex-start' }}>

                {isNamingNew ? (
                  /* NEW FAST-CREATE UI */
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '40px', borderRadius: '32px', border: '1px solid rgba(59, 130, 246, 0.15)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                  >
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                      <Plus size={32} />
                    </div>

                    <div>
                      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>Insert the Profile Name:</h2>
                      <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>Type carefully and confirm below</p>
                    </div>

                    <input
                      type="text"
                      autoFocus
                      placeholder="My Epic Apocalypse Preset..."
                      value={customPresetName}
                      onChange={(e) => setCustomPresetName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && customPresetName.trim()) {
                          await handleProfileSave(customPresetName);
                          setIsNamingNew(false);
                        }
                      }}
                      className="glass-input"
                      style={{ width: '100%', padding: '20px', borderRadius: '16px', fontSize: '18px', textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(59, 130, 246, 0.3)', color: '#fff' }}
                    />

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => setIsNamingNew(false)}
                        className="glass-btn"
                        style={{ flex: 1, justifyContent: 'center', opacity: 0.6 }}
                      >
                        CANCEL
                      </button>
                      <button
                        disabled={!customPresetName.trim()}
                        onClick={async () => {
                          await handleProfileSave(customPresetName);
                          setIsNamingNew(false);
                        }}
                        className="btn-primary"
                        style={{ flex: 2, justifyContent: 'center', padding: '16px', borderRadius: '16px' }}
                      >
                        CONFIRM & CREATE
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* ORIGINAL LIBRARY UI */
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255, 255, 255, 0.02)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                          Select Preset Profile
                        </label>
                        <button
                          onClick={() => { setIsNamingNew(true); setSelectedProfile(null); setCustomPresetName(""); }}
                          className="glass-btn"
                          style={{ background: 'rgba(217, 119, 6, 0.1)', border: 'none', color: 'var(--accent-amber)', fontSize: '10px', fontWeight: '800', cursor: 'pointer', padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Plus size={14} />
                          NEW PROFILE
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flexGrow: 1 }}>
                          <select
                            value={selectedProfile ? (selectedProfile.isCommunity ? `community:${selectedProfile.name}` : selectedProfile.name) : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                const isComm = val.startsWith('community:');
                                const realName = isComm ? val.replace('community:', '') : val;
                                setSelectedProfile({ name: realName, isCommunity: isComm });
                                setCustomPresetName(realName);
                              } else {
                                setSelectedProfile(null);
                                setCustomPresetName("");
                              }
                            }}
                            className="glass-input"
                            style={{ width: '100%', padding: '16px 20px', borderRadius: '16px', fontSize: '15px', fontWeight: '500', appearance: 'none', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' }}
                          >
                            <option value="">-- Choose from your collection --</option>
                            {profiles.user.map(p => <option key={p} value={p}>{p}</option>)}
                            {profiles.community.length > 0 && <optgroup label="Community Shared">
                              {profiles.community.map(p => <option key={p} value={`community:${p}`}>{p}</option>)}
                            </optgroup>}
                          </select>
                          <ChevronDown size={18} style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.4 }} />
                        </div>

                        <button onClick={() => setIsEditingPresets(!isEditingPresets)} className={`glass-btn ${isEditingPresets ? 'active' : ''}`} style={{ width: '54px', height: '54px', borderRadius: '16px', background: isEditingPresets ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <Settings size={22} style={{ opacity: isEditingPresets ? 1 : 0.6 }} />
                        </button>
                      </div>

                      <AnimatePresence>
                        {isEditingPresets && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', background: 'rgba(0,0,0,0.2)', borderRadius: '14px', marginTop: '4px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              {profiles.user.map(p => (
                                <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{p}</span>
                                  <button onClick={() => handleProfileDelete(p, false)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}><Trash2 size={13} /></button>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* STEP 2: SOURCE FILE (Premium Card) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(217, 119, 6, 0.03)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(217, 119, 6, 0.1)', opacity: selectedProfile || customPresetName ? 1 : 0.3, transition: 'all 0.4s' }}>
                      <label style={{ fontSize: '11px', fontWeight: '900', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Import & Update .ini (Optional)</label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => (selectedProfile || customPresetName) && !pendingImport && handleImportProfile(false)}
                        style={{
                          border: isDragging ? '2px dashed #fbbf24' : '2px dashed rgba(255,255,255,0.05)',
                          background: isDragging ? 'rgba(217, 119, 6, 0.08)' : 'rgba(0,0,0,0.2)',
                          padding: '30px 20px', borderRadius: '20px', textAlign: 'center', cursor: (selectedProfile || customPresetName) ? 'pointer' : 'not-allowed', transition: 'all 0.3s', position: 'relative'
                        }}
                      >
                        {pendingImport ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '50%' }}>
                              <Save size={24} />
                            </div>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', margin: 0 }}>File Ready to Update</p>
                            <button onClick={(e) => { e.stopPropagation(); setPendingImport(null); }} style={{ fontSize: '10px', background: 'none', border: 'none', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer' }}>Remove File</button>
                          </div>
                        ) : (
                          <div style={{ pointerEvents: 'none', opacity: 0.5 }}>
                            <FolderOpen size={32} style={{ marginBottom: '12px' }} />
                            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}><strong>Drag & Drop .ini</strong> to update this profile</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* STEP 3: EXECUTION STYLE */}
                    <AnimatePresence>
                      {pendingImport && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(16, 185, 129, 0.03)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                          <label style={{ fontSize: '11px', fontWeight: '900', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Application Style</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button onClick={() => setImportMethod('partial')} className={`glass-btn ${importMethod === 'partial' ? 'active' : ''}`} style={{ height: '60px', fontSize: '12px', background: importMethod === 'partial' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.02)', borderColor: importMethod === 'partial' ? '#10b981' : 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                              <Zap size={16} /> SMART SYNC
                            </button>
                            <button onClick={() => setImportMethod('full')} className={`glass-btn ${importMethod === 'full' ? 'active' : ''}`} style={{ height: '60px', fontSize: '12px', background: importMethod === 'full' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.02)', borderColor: importMethod === 'full' ? '#ef4444' : 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                              <AlertTriangle size={16} /> FULL OVERWRITE
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Quick Info / Tip */}
                    <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.1)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <Zap size={18} style={{ color: '#60a5fa' }} />
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                        Loading a profile will replace your current <strong>servertest.ini</strong> configuration.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* FOOTER ACTIONS */}
              <div style={{ padding: '24px 32px 32px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => { setProfilesOpen(false); setPendingImport(null); }}
                    className="glass-btn"
                    style={{ padding: '14px', flexGrow: 1, border: 'none' }}
                  >
                    Close
                  </button>
                  <button
                    onClick={async () => {
                      setIsProcessingProfile(true);
                      try {
                        if (pendingImport) {
                          const response = await fetch(`${API_BASE}/api/profiles/import`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              src_path: pendingImport.path,
                              is_community: false,
                              target_name: customPresetName.trim() || pendingImport.name
                            })
                          });
                          const result = await response.json();
                          if (result.status === 'success') {
                            await handleProfileLoad(customPresetName.trim() || pendingImport.name, false, importMethod);
                          } else {
                            showNotification(result.message, 'warning');
                          }
                        } else if (isNamingNew && customPresetName.trim()) {
                          // CASE 2: CREATING NEW EMPTY PROFILE
                          const response = await fetch(`${API_BASE}/api/profiles/save`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: customPresetName.trim() })
                          });
                          const result = await response.json();
                          if (result.status === 'success') {
                            await handleProfileLoad(customPresetName.trim(), false, 'full');
                          } else {
                            showNotification(result.message, 'warning');
                          }
                        } else if (selectedProfile) {
                          // CASE 3: LOADING EXISTING PROFILE
                          await handleProfileLoad(selectedProfile.name, selectedProfile.isCommunity, 'full');
                        }
                      } catch (err) {
                        showNotification(`Critical error during save: ${err}`, 'warning');
                      } finally {
                        setIsProcessingProfile(false);
                        setProfilesOpen(false);
                        setPendingImport(null);
                      }
                    }}
                    className="premium-btn-action premium-btn-primary"
                    style={{
                      padding: '14px 28px', flexGrow: 2,
                      background: isProcessingProfile ? '#1e293b' : 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white', borderRadius: '14px',
                      opacity: (!customPresetName.trim() && !selectedProfile) || isProcessingProfile ? 0.5 : 1
                    }}
                    disabled={(!customPresetName.trim() && !selectedProfile) || isProcessingProfile}
                  >
                    <Save size={18} className={isProcessingProfile ? 'animate-spin' : ''} />
                    {isProcessingProfile ? 'PROCESSING...' :
                      pendingImport ? 'IMPORT & APPLY' :
                        isNamingNew ? 'CREATE NEW PROFILE' : 'LOAD SELECTED PROFILE'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backup Modal */}
      {/* Enhance Mods Modal (The Intelligence Hub) */}
      <AnimatePresence>
        {enhanceModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="premium-modal-overlay"
            style={{ zIndex: 4500 }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="premium-modal"
              style={{
                maxWidth: '1100px', width: '95%', padding: '0',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                background: '#020617', border: '1px solid rgba(251, 146, 60, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 60px rgba(217, 119, 6, 0.05)'
              }}
            >
              <div className="premium-modal-header" style={{ padding: '24px 30px', background: 'linear-gradient(to bottom, rgba(217, 119, 6, 0.05), transparent)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#f59e0b', padding: '12px', borderRadius: '14px' }}>
                    <Zap size={28} />
                  </div>
                  <div>
                    <h2 className="premium-modal-title" style={{ fontSize: '24px' }}>Enhance Mods Engine</h2>
                    <p className="premium-modal-subtitle">Intelligent Sorting & Conflict Resolution</p>
                  </div>
                </div>

                <button
                  onClick={() => setEnhanceModalOpen(false)}
                  style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '10px', display: 'flex', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="premium-modal-body" style={{ padding: '30px', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Sorting Rules Knowledge Base</label>
                      <span title="Rules defined here will guide the order of mods in your servertest.ini" style={{ cursor: 'help', display: 'flex' }}>
                        <Info size={14} color="#475569" />
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 180 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={async () => {
                          await fetchRules();
                          showNotification("Rules reloaded from disk", "info");
                        }}
                        className="glass-btn"
                        title="Reload from File"
                        style={{
                          padding: '0', width: '36px', height: '36px',
                          background: 'rgba(57, 182, 246, 0.15)',
                          border: '1px solid rgba(57, 182, 246, 0.3)',
                          color: '#39b6f6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <RefreshCw size={16} />
                      </motion.button>
                      <button
                        onClick={() => fetch(`${API_BASE}/api/sorting-rules/open`, { method: 'POST' })}
                        className="glass-btn" style={{ fontSize: '10px', padding: '4px 12px', height: '36px' }}
                      >
                        OPEN EXTERNAL EDITOR
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={rulesText}
                    onChange={(e) => setRulesText(e.target.value)}
                    style={{
                      width: '100%', flexGrow: 1, minHeight: '400px', background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px',
                      padding: '20px', color: '#fbbf24', fontFamily: '"Fira Code", monospace',
                      fontSize: '13px', outline: 'none', resize: 'none', lineHeight: '1.6',
                      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
                    }}
                    placeholder="[modID]\nloadAfter=dependency_id\ncategory=core"
                    spellCheck={false}
                  />

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                    <button
                      onClick={async () => {
                        await fetch(`${API_BASE}/api/sorting-rules/raw`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ content: rulesText }),
                        });
                        showNotification("Rules saved successfully", "success");
                      }}
                      className="glass-btn"
                      style={{ padding: '10px 30px', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa', fontSize: '11px', fontWeight: 'bold', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)' }}
                    >
                      <Save size={14} style={{ marginRight: '8px' }} />
                      SAVE RULES ONLY
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
                  <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <RefreshCw size={16} style={{ color: '#60a5fa' }} />
                    <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>
                      <strong>Tip:</strong> If you edited rules externally, use the 🔄 button to reload the file.
                    </p>
                  </div>

                  <div style={{ padding: '12px', background: 'rgba(217, 119, 6, 0.05)', borderRadius: '12px', border: '1px solid rgba(217, 119, 6, 0.1)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Info size={16} style={{ color: '#f59e0b' }} />
                    <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>
                      <strong>Tip:</strong> The Enhance Engine follows these rules during the topological sort to ensure server stability.
                    </p>
                  </div>
                </div>
              </div>

              <div className="premium-modal-actions" style={{ padding: '30px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button
                    onClick={async () => {
                      // Save rules first
                      await fetch(`${API_BASE}/api/sorting-rules/raw`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: rulesText }),
                      });
                      handleEnhance();
                    }}
                    className="premium-btn-action premium-btn-primary"
                    style={{
                      width: '100%', maxWidth: '400px', padding: '18px',
                      background: 'linear-gradient(135deg, #d97706 0%, #8b2612 100%)',
                      boxShadow: '0 10px 40px rgba(139, 38, 18, 0.3)',
                      fontSize: '14px'
                    }}
                    disabled={isEnhancing}
                  >
                    <Zap size={22} className={isEnhancing ? 'animate-spin' : ''} />
                    {isEnhancing ? 'ENHANCING ENGINE...' : 'START ENHANCE PROCESS'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              position: 'fixed', bottom: '32px', left: '50%', zIndex: 9999,
              background: notification?.type === 'success' ? 'rgba(34, 197, 94, 0.9)' : (notification?.type === 'warning' ? 'rgba(245, 158, 11, 0.9)' : 'rgba(59, 130, 246, 0.9)'),
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
