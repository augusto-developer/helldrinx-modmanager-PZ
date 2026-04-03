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
  ChevronUp
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
  const [showDependencies, setShowDependencies] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    message: string;
    remediation: string;
    can_bypass?: boolean;
    originalAction?: { endpoint: string; payload: any };
  }>({ title: '', message: '', remediation: '' });

  const [settings, setSettings] = useState({ workshop_path: '', server_config_path: '' });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [rulesText, setRulesText] = useState('');
  const [savingRules, setSavingRules] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [highlightedMod, setHighlightedMod] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'conflict' | 'missing'>('conflict');

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
  }, []);

  const filteredMods = mods.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Um mod é considerado dependência implícita se Alguém requer ele.
    // Omitimos se for dependência E a visualização estiver desligada.
    const isDependency = dependencyMap[m.id]?.required_by?.length > 0;
    
    if (!showDependencies && isDependency) {
      return false;
    }

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
          <h1>HellDrinx - Tool<span style={{ color: '#3b82f6' }}> | ModManager</span></h1>
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
              color: '#94a3b8', cursor: 'pointer', padding: '10px', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
            }}
            title="Application Settings"
          >
            <Settings size={20} />
          </motion.button>

          {issues.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSidebarOpen(true)}
              style={{
                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444', cursor: 'pointer', padding: '10px', borderRadius: '12px',
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

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setShowDependencies(!showDependencies)}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
              background: showDependencies ? 'rgba(168, 85, 247, 0.15)' : 'rgba(15, 23, 42, 0.6)',
              color: showDependencies ? '#c084fc' : '#64748b',
              fontSize: '11px', fontWeight: 'bold', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
            }}
            title="Mostra mods transitórios que são apenas bibliotecas ou dependências de outros."
          >
            <Package size={14} />
            {showDependencies ? 'Hide Dependencies' : 'Show Dependencies'}
          </button>

          <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '12px', flexShrink: 0 }}>
            <button
              onClick={() => setActiveTab('active')}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: activeTab === 'active' ? '#3b82f6' : 'transparent',
                color: activeTab === 'active' ? 'white' : '#94a3b8',
                fontSize: '11px', fontWeight: 'bold', transition: 'all 0.2s'
              }}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: activeTab === 'trash' ? '#ef4444' : 'transparent',
                color: activeTab === 'trash' ? 'white' : '#94a3b8',
                fontSize: '11px', fontWeight: 'bold', transition: 'all 0.2s'
              }}
            >
              Uninstalled
            </button>
          </div>
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
                border: isLarge ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                                boxShadow: isLarge ? '0 4px 20px rgba(59, 130, 246, 0.15)' : 'none',
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
                                      <span style={{ fontSize: '8px', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', color: 'white', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>CORE</span>
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
                                  <span>ID: <code style={{ color: isCore ? '#3b82f6' : '#475569' }}>{mod.id}</code></span>
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
                                      <span style={{ fontSize: '9px', background: '#ef4444', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>TRASH BIN</span>
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
                                    className="btn btn-primary"
                                    style={{ padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    onClick={() => handleAction('activate-mod', { mod_id: mod.id, workshop_id: mod.workshop_id })}
                                  >
                                    <Package size={16} />
                                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>ACTIVATE</span>
                                  </button>
                                ) : (
                                  <button
                                    className="btn"
                                    style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}
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
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', padding: '8px' }}
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

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, background: '#1e293b', border: '1px solid #334155',
              padding: '12px 24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', gap: '12px', color: 'white'
            }}
          >
            <AlertCircle size={18} color={notification.type === 'warning' ? '#ef4444' : '#3b82f6'} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#475569', fontSize: '0.70rem', padding: '8px 16px', background: 'rgba(15, 23, 42, 0.5)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>v2.1 NODE PERFORMANCE EDITION</span>
          <button
            onClick={syncMods}
            disabled={syncing}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', borderRadius: '4px', padding: '2px 8px',
              fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px',
              cursor: syncing ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={10} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'SYNCING...' : 'Manual Sync'}
          </button>
        </div>
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
                          background: activeSidebarTab === 'conflict' ? '#ef4444' : 'transparent',
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
                          background: activeSidebarTab === 'missing' ? '#3b82f6' : 'transparent',
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
                                  ...(activeSidebarTab === 'missing' ? { background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6' } : {})
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
    </div>
  );
};

export default App;
