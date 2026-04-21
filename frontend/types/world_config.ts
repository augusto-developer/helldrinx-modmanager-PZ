import type { ReactNode } from 'react';

export type ConfigValue = string | number | boolean;

export interface ConfigField {
  id: string;
  name: string;
  value: ConfigValue;
  type?: 'textarea' | 'text' | 'number' | 'boolean';
  options?: { label: string; value: ConfigValue }[];
  tooltip?: string;
  section?: string;
}

export interface ConfigCategory {
  id: string;
  name: string;
  fields: ConfigField[];
}

export interface WorldConfigData {
  iniPath: string;
  luaPath: string;
  ini: {
    categories: ConfigCategory[];
    raw: Record<string, ConfigValue>;
  };
  sandbox: {
    categories: ConfigCategory[];
    raw: Record<string, ConfigValue>;
  };
  workshopPlaylist: WorkshopPlaylistItem[];
  mapList: string[];
}

export interface WorkshopPlaylistItem {
  workshopId: string;
  modId: string;
  name: string;
}

export interface WorldConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  iniPath: string;
  onSync?: () => void;
}

export interface TabType {
  id: string;
  name: string;
  icon: ReactNode;
}

// 📡 Electron Bridge Interface
export interface ElectronBridge {
  selectFolder: () => Promise<string | null>;
  selectFile: () => Promise<string | null>;
  readIni: (path: string) => Promise<unknown>;
  saveIni: (data: unknown) => Promise<void>;
  syncIni: (data: unknown) => Promise<void>;
  scanWorkshop: (path: string) => Promise<unknown>;
  readSettings: () => Promise<unknown>;
  saveSettings: (settings: unknown) => Promise<void>;
  getCachedMods: () => Promise<unknown>;
  getAllConflicts: (activeModIds: string[]) => Promise<unknown>;
  openFolder: (path: string) => Promise<void>;
  openUrl: (url: string) => Promise<void>;
  getServerConfig: (iniPath: string) => Promise<any>; // Keep any for result due to complex internal structure mapping
  saveSandboxVars: (data: { luaPath: string; vars: Record<string, ConfigValue> }) => Promise<void>;
  saveIniVars: (data: { iniPath: string; vars: Record<string, ConfigValue> }) => Promise<void>;
  saveWorkshopPlaylist: (data: { iniPath: string; playlist: WorkshopPlaylistItem[] }) => Promise<void>;
  saveMapList: (data: { iniPath: string; maps: string[] }) => Promise<void>;
  importIniPreset: (data: { sourcePath: string; targetPath: string; mode: 'full' | 'soft' }) => Promise<void>;
  importSandboxPreset: (data: { sourcePath: string; targetPath: string }) => Promise<void>;
  createMultiBackup: (data: { sourceDirs: string[]; zipPath: string }) => Promise<void>;
}
