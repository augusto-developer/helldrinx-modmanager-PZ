import { useState, useCallback } from 'react';
import type { Settings } from '../types/mod_manager';
import { ipcService } from '../services/ipcService';

export const useSettings = () => {
  const [iniPath, setIniPath] = useState<string | null>(null);
  const [workshopPath, setWorkshopPath] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await ipcService.readSettings();
      if (settings.workshopPath && settings.serverIniPath) {
        setWorkshopPath(settings.workshopPath);
        setIniPath(settings.serverIniPath);
        return settings;
      }
      setIsSettingsOpen(true);
      return null;
    } catch (e) {
      console.error('Failed to load settings:', e);
      setIsSettingsOpen(true);
      return null;
    }
  }, []);

  const saveSettings = useCallback(async (settings: Settings) => {
    try {
      await ipcService.saveSettings(settings);
      setWorkshopPath(settings.workshopPath);
      setIniPath(settings.serverIniPath);
      setIsSettingsOpen(false);
      return true;
    } catch (e) {
      console.error('Failed to save settings:', e);
      return false;
    }
  }, []);

  return {
    iniPath,
    workshopPath,
    isSettingsOpen,
    setIsSettingsOpen,
    loadSettings,
    saveSettings
  };
};
