export interface Mod {
  id: string;
  name: string;
  workshop_id: string;
  poster?: string;
  poster_url?: string;
  require: string[];
  incompatible?: string[];
  media_files?: string[];
  absolute_path?: string;
  category?: string;
}

export interface Issue {
  modId: string;
  modName: string;
  type: 'missing' | 'conflict';
  subType?: 'rule' | 'file' | 'logic';
  detail: string;
  file?: string;
  conflictingWith?: string[];
  targetModId?: string;
  fingerprint?: string;
}

export interface DiagnosisReport {
  issue: Issue;
  mods: Array<{
    id: string;
    name: string;
    path: string;
    workshopId: string;
  }>;
  snippets: { [modId: string]: string };
  aiContext: string;
  error?: string;
}

export interface Settings {
  workshopPath: string;
  serverIniPath: string;
}

export interface IniData {
  mods: string[];
  workshopItems: string[];
}

export interface SyncResult {
  success: boolean;
  sortedMods?: string[];
  error?: string;
}

export interface SaveResult {
  success?: boolean;
  error?: string;
}

declare global {
  interface Window {
    electron: {
      selectFolder: () => Promise<string | null>;
      selectFile: () => Promise<string | null>;
      readIni: (path: string) => Promise<IniData | { error: string }>;
      saveIni: (data: { iniPath: string } & IniData) => Promise<SaveResult>;
      syncIni: (data: { iniPath: string, modIds: string[] }) => Promise<SyncResult>;
      scanWorkshop: (path: string) => Promise<Mod[] | { error: string }>;
      readSettings: () => Promise<Settings>;
      saveSettings: (settings: Settings) => Promise<SaveResult>;
      getCachedMods: () => Promise<Mod[]>;
      getAllConflicts: (activeModIds: string[]) => Promise<{ active: Issue[], ignored: Issue[] }>;
      openFolder: (path: string) => Promise<boolean>;
      openUrl: (url: string) => Promise<boolean>;
      getServerConfig: (iniPath: string) => Promise<any>;
      saveSandboxVars: (data: { luaPath: string, vars: any }) => Promise<SaveResult>;
      saveIniVars: (data: { iniPath: string, vars: any }) => Promise<SaveResult>;
      saveWorkshopPlaylist: (data: { iniPath: string, playlist: any[] }) => Promise<SaveResult>;
      saveMapList: (data: { iniPath: string, maps: string[] }) => Promise<SaveResult>;
      importIniPreset: (data: { sourcePath: string, targetPath: string, mode: 'full' | 'soft' }) => Promise<SaveResult>;
      importSandboxPreset: (data: { sourcePath: string, targetPath: string }) => Promise<SaveResult>;
      createMultiBackup: (data: { sourceDirs: string[], zipPath: string }) => Promise<SaveResult>;
      ignoreConflictFingerprint: (fingerprint: string) => Promise<SaveResult>;
      unignoreConflictFingerprint: (fingerprint: string) => Promise<SaveResult>;
      diagnoseConflict: (data: { fingerprint: string, activeModIds: string[], filePath?: string }) => Promise<DiagnosisReport>;
      showItemInFolder: (path: string) => Promise<boolean>;
      generateAiDiagnosis: (context: string) => Promise<string | { error: string }>;
    };
  }
}
