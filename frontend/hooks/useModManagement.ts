import { useState, useCallback, useMemo } from 'react';
import type { Mod, Issue, Settings } from '../types/mod_manager';
import { ipcService } from '../services/ipcService';

export type LoadingState = 'none' | 'full' | 'mini';

export const useModManagement = () => {
  const [mods, setMods] = useState<Mod[]>([]);
  const [serverMods, setServerMods] = useState<string[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [ignoredIssues, setIgnoredIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<LoadingState>('none');
  const [lastSync, setLastSync] = useState<number>(Date.now());

  const handleLoadData = useCallback(async (wsPath: string, configPath: string, currentModCount: number) => {
    const shouldShowFullOverlay = currentModCount === 0;
    if (shouldShowFullOverlay) setLoading('full');

    try {
      const wsData = await ipcService.scanWorkshop(wsPath);
      if (Array.isArray(wsData)) {
        setMods(wsData);
      }

      const iniData = await ipcService.readIni(configPath);
      if (iniData && 'mods' in iniData) {
        setServerMods(iniData.mods || []);
      }
      setLastSync(Date.now());
    } catch (e) {
      console.error('Failed to load mod data:', e);
    } finally {
      if (shouldShowFullOverlay) {
        setTimeout(() => setLoading('none'), 500);
      }
    }
  }, []);

  const refreshIssues = useCallback(async (activeIds: string[]) => {
    try {
      const result = await ipcService.getAllConflicts(activeIds);
      // New format is { active: Issue[], ignored: Issue[] }
      if (result && 'active' in result) {
        setIssues(result.active);
        setIgnoredIssues(result.ignored);
      } else {
        setIssues(result as any);
      }
    } catch (e) {
      console.error('Audit failed:', e);
    }
  }, []);

  const handleActivate = useCallback(async (iniPath: string, id: string) => {
    if (!iniPath) return;
    setLoading('mini');
    try {
      const newServerMods = [...serverMods, id];
      const result = await ipcService.syncIni({ iniPath, modIds: newServerMods });
      if (result.success && result.sortedMods) {
        setServerMods(result.sortedMods);
        setLastSync(Date.now());
      }
    } finally {
      setLoading('none');
    }
  }, [serverMods]);

  const handleDeactivate = useCallback(async (iniPath: string, id: string) => {
    if (!iniPath) return;
    setLoading('mini');
    try {
      const newServerMods = serverMods.filter(mId => mId !== id);
      const result = await ipcService.syncIni({ iniPath, modIds: newServerMods });
      if (result.success && result.sortedMods) {
        setServerMods(result.sortedMods);
        setLastSync(Date.now());
      }
    } finally {
      setLoading('none');
    }
  }, [serverMods]);

  const handleSyncAll = useCallback(async (iniPath: string, modIds: string[]) => {
    if (!iniPath) return;
    setLoading('full');
    try {
      const result = await ipcService.syncIni({ iniPath, modIds });
      if (result.success && result.sortedMods) {
        setServerMods(result.sortedMods);
        setLastSync(Date.now());
      }
    } finally {
      setLoading('none');
    }
  }, []);

  const handleIgnoreConflict = useCallback(async (fingerprint: string) => {
    try {
      await ipcService.ignoreConflictFingerprint(fingerprint);
      refreshIssues(serverMods);
    } catch (e) {
      console.error('Failed to ignore conflict:', e);
    }
  }, [serverMods, refreshIssues]);

  const handleRestoreConflict = useCallback(async (fingerprint: string) => {
    try {
      await ipcService.unignoreConflictFingerprint(fingerprint);
      refreshIssues(serverMods);
    } catch (e) {
      console.error('Failed to restore conflict:', e);
    }
  }, [serverMods, refreshIssues]);

  const handleDiagnose = useCallback(async (fingerprint: string, filePath?: string) => {
    try {
      return await ipcService.diagnoseConflict({ 
        fingerprint, 
        activeModIds: serverMods,
        filePath 
      });
    } catch (e) {
      console.error('Diagnosis failed:', e);
      return null;
    }
  }, [serverMods]);

  return {
    mods,
    serverMods,
    issues,
    ignoredIssues,
    loading,
    lastSync,
    setMods,
    setServerMods,
    handleLoadData,
    refreshIssues,
    handleActivate,
    handleDeactivate,
    handleSyncAll,
    handleIgnoreConflict,
    handleRestoreConflict,
    handleDiagnose
  };
};
