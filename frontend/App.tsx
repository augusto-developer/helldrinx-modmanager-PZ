import React, { useState, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';

// Context & Provider
import { ModProvider, useMods } from './context/ModContext';

// Services
import { ipcService } from './services/ipcService';

// Layout Components
import { MainLayout } from './components/layout/MainLayout';

// Feature Components
import { ModList } from './features/mod-management/ModList';
import { ConflictSidebar } from './features/audit-engine/ConflictSidebar';
import { SettingsModal } from './components/modals/SettingsModal';
import WorldConfigModal from './features/world-config/WorldConfigModal';
import PresetsModal from './features/world-config/PresetsModal';
import GlobalBackupModal from './components/modals/GlobalBackupModal';
import { CustomLoading } from './components/common/CustomLoading';
import { SuccessModal } from './features/world-config/Overlays/StatusFeedback';

/**
 * 🚀 HellDrinx "Impact Edition" - App Content Orchestrator
 * This component consumes the ModContext and manages UI-only states (Modals).
 */
const AppContent: React.FC = () => {
  const {
    mods,
    serverMods,
    issues,
    activeTab,
    setActiveTab,
    loading,
    syncMods,
    settings,
    updateSettings,
    ignoreConflict,
    toggleMod,
    removeFromActive,
    deactivateAll,
    diagnoseConflict,
    setHighlightedModId
  } = useMods();

  // Modal Visibility States (UI Only)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isWorldConfigOpen, setIsWorldConfigOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isGlobalBackupOpen, setIsGlobalBackupOpen] = useState(false);

  // Search local to this view
  const [searchQuery, setSearchQuery] = useState('');

  // Feedback States (Backup)
  const [isBackupProcessing, setIsBackupProcessing] = useState(false);
  const [showBackupSuccess, setShowBackupSuccess] = useState(false);

  // 🎯 UI Logic: Locating mods from Audit Center
  const scrollToMod = useCallback((modId: string) => {
    const isActive = serverMods.includes(modId);
    const targetTab = isActive ? 'active' : 'unactivated';

    if (activeTab !== targetTab) setActiveTab(targetTab);
    setSearchQuery('');
    setHighlightedModId(modId); // Trigger group expansion

    setTimeout(() => {
      const element = document.getElementById(`mod-${modId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-amber-500', 'ring-offset-2', 'ring-offset-black', 'z-[100]');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-amber-500', 'ring-offset-2', 'ring-offset-black', 'z-[100]');
          setHighlightedModId(null); // Clear after jump
        }, 2000);
        setIsAuditOpen(false);
      } else {
        setHighlightedModId(null);
      }
    }, 300); // Give more time for tab switch and expansion
  }, [serverMods, activeTab, setActiveTab, setHighlightedModId]);

  // Derived State: Filtering
  const filteredMods = useMemo(() => {
    if (!Array.isArray(mods)) return [];
    const q = searchQuery.toLowerCase();
    return mods.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.id || '').toLowerCase().includes(q) ||
      (m.workshop_id || '').toLowerCase().includes(q)
    );
  }, [mods, searchQuery]);

  // Backup/Mass Actions (Handled via ipcService or specialized hooks in future)
  const handleGlobalBackup = useCallback(async (zipFilename: string) => {
    // This could also be moved to a dedicated hook/service
    const iniPath = settings.serverIniPath;
    if (!iniPath) return;

    try {
      const parts = iniPath.split(/[\\/]/);
      const serverDir = parts.slice(0, -1).join('\\');
      const zomboidRoot = parts.slice(0, -2).join('\\');
      const savesDir = `${zomboidRoot}\\Saves`;

      const destFolder = await ipcService.selectFolder();
      if (!destFolder) return;

      const fullZipPath = `${destFolder}\\${zipFilename}.zip`;
      setIsGlobalBackupOpen(false);
      setIsBackupProcessing(true);

      await ipcService.createMultiBackup({
        sourceDirs: [serverDir, savesDir],
        zipPath: fullZipPath
      });

      setIsBackupProcessing(false);
      setTimeout(() => setShowBackupSuccess(true), 400);
    } catch (e) {
      console.error(e);
      setIsBackupProcessing(false);
      alert('Critical Error during backup orchestration. Check console.');
    }
  }, [settings.serverIniPath]);

  return (
    <>
      <MainLayout
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenWorldConfig={() => setIsWorldConfigOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenGlobalBackup={() => setIsGlobalBackupOpen(true)}
      >
        <ModList
          mods={filteredMods}
          serverMods={serverMods}
          issues={issues}
          type={activeTab}
          onActivate={(id) => toggleMod(id)}
          onDeactivate={(id) => toggleMod(id)}
          onDeactivateAll={deactivateAll}
          loading={loading !== 'none'}
        />

      </MainLayout>
      
      {/* Audit Engine - Sidebar moved outside to fix stacking context */}
      <ConflictSidebar
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        issues={issues}
        onLocateMod={scrollToMod}
        onIgnoreConflict={ignoreConflict}
        onDiagnose={diagnoseConflict}
      />

      <AnimatePresence>
        {loading !== 'none' && (
          <CustomLoading variant={loading === 'mini' ? 'mini' : 'full'} />
        )}
        {isBackupProcessing && (
          <CustomLoading variant="full" message="EXHAUSTIVE SYSTEM BACKUP IN PROGRESS" />
        )}
      </AnimatePresence>

      {/* Global Modals - Rendered at root for full viewport coverage */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onSave={updateSettings}
            initialSettings={settings}
          />
        )}

        {isWorldConfigOpen && (
          <WorldConfigModal
            isOpen={isWorldConfigOpen}
            onClose={() => setIsWorldConfigOpen(false)}
            iniPath={settings.serverIniPath}
            onSync={syncMods}
          />
        )}

        {isPresetsOpen && (
          <PresetsModal
            isOpen={isPresetsOpen}
            onClose={() => setIsPresetsOpen(false)}
            iniPath={settings.serverIniPath}
            onSync={syncMods}
          />
        )}

        {isGlobalBackupOpen && (
          <GlobalBackupModal
            isOpen={isGlobalBackupOpen}
            onClose={() => setIsGlobalBackupOpen(false)}
            onConfirm={handleGlobalBackup}
            serverName={settings.serverIniPath.split(/[\\/]/).pop()?.replace('.ini', '') || 'Server'}
          />
        )}

        <SuccessModal
          show={showBackupSuccess}
          onClose={() => setShowBackupSuccess(false)}
        />
      </AnimatePresence>
    </>
  );
};

const App: React.FC = () => {
  return (
    <ModProvider>
      <AppContent />
    </ModProvider>
  );
};

export default App;
