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
  XCircle
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
  const [modalData, setModalData] = useState({ title: '', message: '', remediation: '' });

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

  const handleAction = async (endpoint: string, payload: any) => {
    try {
      const resp = await fetch(`${API_BASE}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      
      if (data.status === 'error') {
        setModalData({
          title: data.title || "Conflito Detectado",
          message: data.message || "Não foi possível realizar esta ação.",
          remediation: data.remediation || "Tente resolver os conflitos manualmente."
        });
        setModalOpen(true);
        return;
      }

      if (resp.ok) {
        if (data.cleaned_up && data.cleaned_up.length > 0) {
          showNotification(`${data.cleaned_up.length} unnecessary dependencies were removed.`, 'info');
        }
        await fetchMods();
      }
    } catch (err) {
      console.error(`Action ${endpoint} failed:`, err);
    }
  };

  useEffect(() => {
    fetchMods();
  }, []);

  const filteredMods = mods.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app-container">
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-8 shadow-2xl overflow-hidden relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                <AlertTriangle size={28} />
              </div>
              <h2 className="text-2xl font-bold text-white">{modalData.title}</h2>
            </div>
            
            <div className="space-y-4 mb-8">
              <p className="text-slate-300 leading-relaxed">
                {modalData.message}
              </p>
              
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">What to do?</p>
                <p className="text-sm text-cyan-400">
                  {modalData.remediation}
                </p>
              </div>
            </div>

            <button 
              onClick={() => setModalOpen(false)}
              className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-cyan-400 hover:text-slate-950 transition-all duration-300"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <header className="header">
        <div className="brand-section">
          <span className="brand-subtitle">Project Zomboid</span>
          <h1>Mod Manager <span style={{color: '#3b82f6'}}>PRO</span></h1>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
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
              DELETE PERMANENTLY ({trash.length})
            </motion.button>
          )}
        </AnimatePresence>

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
            Installed
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
            Trash
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '4px' }}>
        <AnimatePresence mode="popLayout">
          {loading ? (
             <motion.div initial={{opacity: 0}} animate={{opacity: 1}} style={{textAlign: 'center', marginTop: '100px', color: '#64748b'}}>
                <div className="animate-pulse">Carregando gerenciador...</div>
             </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(activeTab === 'active' ? filteredMods : trash).map((mod, idx) => (
                <motion.div 
                  key={`${mod.id}-${idx}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="mod-card"
                  style={{ 
                    opacity: activeTab === 'active' && !serverMods.includes(mod.id) ? 0.6 : 1,
                    border: serverMods.includes(mod.id) ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: serverMods.includes(mod.id) ? '0 0 15px rgba(59, 130, 246, 0.2)' : 'none',
                    background: serverMods.includes(mod.id) ? 'rgba(15, 23, 42, 0.8)' : 'rgba(15, 23, 42, 0.4)'
                  }}
                >
                  <img 
                    src={mod.poster_url ? `${API_BASE}${mod.poster_url}` : 'https://placehold.co/120x120/1e293b/64748b?text=PZ'} 
                    alt={mod.name} 
                    className="mod-poster"
                  />
                  <div className="mod-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div className="mod-name" style={{ color: serverMods.includes(mod.id) ? '#fff' : '#94a3b8' }}>{mod.name}</div>
                      {serverMods.includes(mod.id) ? (
                         <span style={{ fontSize: '9px', background: '#3b82f6', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>LINKED</span>
                      ) : (
                         <span style={{ fontSize: '9px', background: '#334155', color: '#94a3b8', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>INACTIVE</span>
                      )}
                      
                      {dependencyMap[mod.id]?.required_by?.some(rid => serverMods.includes(rid)) && (
                         <span style={{ fontSize: '9px', background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>DEPENDENCY</span>
                      )}
                    </div>
                    <div className="mod-meta">
                      <span>ID: <code style={{color: serverMods.includes(mod.id) ? '#3b82f6' : '#64748b'}}>{mod.id}</code></span>
                      <span>Vol: <code style={{color: '#64748b'}}>{mod.workshop_id}</code></span>
                    </div>
                    
                    {/* Exibição de Dependências */}
                    {mod.require && mod.require.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {mod.require.map(reqId => (
                          <span key={reqId} style={{ fontSize: '8px', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: '3px', color: serverMods.includes(reqId) ? '#4ade80' : '#f87171', border: `1px solid ${serverMods.includes(reqId) ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}` }}>
                            {reqId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {activeTab === 'active' ? (
                      serverMods.includes(mod.id) ? (
                        <button 
                          className="btn" 
                          title="Remover do Servidor"
                          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => handleAction('delete-specific', { mod_id: mod.id, workshop_id: mod.workshop_id, name: mod.name })}
                        >
                          <XCircle size={18} />
                          <span style={{ fontSize: '11px', fontWeight: 'bold' }}>REMOVE</span>
                        </button>
                      ) : (
                        <button 
                          className="btn" 
                          title="Add to Server"
                          style={{ background: '#3b82f6', color: 'white', borderRadius: '8px', padding: '8px 16px' }}
                          onClick={() => handleAction('activate-mod', { mod_id: mod.id, workshop_id: mod.workshop_id })}
                        >
                          <Monitor size={18} />
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>LINK</span>
                        </button>
                      )
                    ) : (
                      <button 
                        className="btn" 
                        style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '50%', padding: '10px' }}
                        onClick={() => handleAction('restore', { workshop_id: mod.workshop_id })}
                      >
                        <History size={18} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {!loading && (activeTab === 'active' ? filteredMods : trash).length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontStyle: 'italic' }}>
                  Nenhum mod encontrado nesta seção.
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

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
           <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Monitor size={12}/> {mods.length} Installed</span>
           <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={12}/> {trash.length} Archived</span>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
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
