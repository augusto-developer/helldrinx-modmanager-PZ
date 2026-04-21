import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import { useModManagement } from '../hooks/useModManagement';
import type { LoadingState } from '../hooks/useModManagement';
import { useSettings } from '../hooks/useSettings';
import type { Mod, Issue, Settings } from '../types/mod_manager';
import { ipcService } from '../services/ipcService';

interface ModContextType {
  // State
  mods: Mod[];
  serverMods: string[];
  issues: Issue[];
  ignoredIssues: Issue[];
  loading: LoadingState;
  activeTab: 'active' | 'unactivated';
  setActiveTab: (tab: 'active' | 'unactivated') => void;
  settings: Settings;
  activeFileName: string;
  highlightedModId: string | null;
  setHighlightedModId: (id: string | null) => void;

  // Settings UI
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;

  // Actions
  toggleMod: (id: string) => Promise<void>;
  removeFromActive: (id: string) => Promise<void>;
  syncMods: () => Promise<void>;
  updateSettings: (settings: Settings) => Promise<boolean>;
  ignoreConflict: (fingerprint: string) => Promise<void>;
  restoreConflict: (fingerprint: string) => Promise<void>;
  refreshIssues: () => Promise<void>;
  deactivateAll: () => Promise<void>;
  diagnoseConflict: (fingerprint: string, filePath?: string) => Promise<any>;
}

const ModContext = createContext<ModContextType | undefined>(undefined);

export const ModProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const modManager = useModManagement();
  const settingsManager = useSettings();
  const [activeTab, setActiveTab] = React.useState<'active' | 'unactivated'>('active');
  const [highlightedModId, setHighlightedModId] = React.useState<string | null>(null);

  const { iniPath, workshopPath, loadSettings, saveSettings } = settingsManager;
  const { mods, serverMods, handleLoadData, handleActivate, handleDeactivate, handleSyncAll, refreshIssues } = modManager;

  // 🔄 Initial Load: Settings -> Cache -> Background Sync
  useEffect(() => {
    const init = async () => {
      const settings = await loadSettings();
      if (settings) {
        // 1. Instant Cache Load
        const cached = await ipcService.getCachedMods();
        let modCount = 0;
        if (cached && cached.length > 0) {
          modManager.setMods(cached);
          modCount = cached.length;
        }

        // 2. Background Sync
        handleLoadData(settings.workshopPath, settings.serverIniPath, modCount);
      }
    };
    init();
  }, [loadSettings]);

  // 🔍 Refresh Issues when Active Mods change
  useEffect(() => {
    if (serverMods.length > 0) {
      refreshIssues(serverMods);
    } else {
      // Clear issues if no mods are active
    }
  }, [serverMods, refreshIssues]);

  // --- Handlers wrapped with current iniPath ---
  const wrappedActivate = useCallback(async (id: string) => {
    if (iniPath) await handleActivate(iniPath, id);
  }, [iniPath, handleActivate]);

  const wrappedDeactivate = useCallback(async (id: string) => {
    if (iniPath) await handleDeactivate(iniPath, id);
  }, [iniPath, handleDeactivate]);

  const wrappedSyncAll = useCallback(async (ids: string[]) => {
    if (iniPath) await handleSyncAll(iniPath, ids);
  }, [iniPath, handleSyncAll]);

  const wrappedLoadData = useCallback(async () => {
    if (workshopPath && iniPath) {
      await handleLoadData(workshopPath, iniPath, mods.length);
    }
  }, [workshopPath, iniPath, mods.length, handleLoadData]);

  const wrappedRefreshIssues = useCallback(async () => {
    await refreshIssues(serverMods);
  }, [serverMods, refreshIssues]);

  const toggleMod = useCallback(async (id: string) => {
    if (!iniPath) return;
    const isActive = serverMods.includes(id);
    if (isActive) {
      await handleDeactivate(iniPath, id);
    } else {
      await handleActivate(iniPath, id);
    }
  }, [iniPath, serverMods, handleActivate, handleDeactivate]);

  const activeFileName = useMemo(() => {
    if (!iniPath) return 'NO FILE';
    return iniPath.split(/[\\/]/).pop()?.replace('.ini', '').toUpperCase() || 'SERVER';
  }, [iniPath]);

  const deactivateAll = useCallback(async () => {
    if (iniPath) await handleSyncAll(iniPath, []);
  }, [iniPath, handleSyncAll]);

  const value = useMemo(() => ({
    mods,
    serverMods,
    issues: modManager.issues,
    ignoredIssues: modManager.ignoredIssues,
    loading: modManager.loading,
    activeTab,
    setActiveTab,
    settings: {
      workshopPath: workshopPath || '',
      serverIniPath: iniPath || ''
    },
    activeFileName,
    isSettingsOpen: settingsManager.isSettingsOpen,
    setIsSettingsOpen: settingsManager.setIsSettingsOpen,
    toggleMod,
    removeFromActive: wrappedDeactivate,
    syncMods: wrappedLoadData,
    updateSettings: saveSettings,
    ignoreConflict: modManager.handleIgnoreConflict,
    restoreConflict: modManager.handleRestoreConflict,
    refreshIssues: wrappedRefreshIssues,
    deactivateAll,
    diagnoseConflict: modManager.handleDiagnose,
    highlightedModId,
    setHighlightedModId
  }), [
    mods, serverMods, modManager.issues, modManager.loading,
    activeTab, workshopPath, iniPath, activeFileName,
    settingsManager.isSettingsOpen, toggleMod, wrappedDeactivate, wrappedLoadData,
    saveSettings, modManager.handleIgnoreConflict, wrappedRefreshIssues, deactivateAll,
    highlightedModId
  ]);

  return <ModContext.Provider value={value}>{children}</ModContext.Provider>;
};

export const useMods = () => {
  const context = useContext(ModContext);
  if (context === undefined) {
    throw new Error('useMods must be used within a ModProvider');
  }
  return context;
};
