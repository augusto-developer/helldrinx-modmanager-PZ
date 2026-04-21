import type { Mod, Issue, Settings, IniData, SyncResult, SaveResult, DiagnosisReport } from '../types/mod_manager';

/**
 * 📡 HellDrinx IPC Service
 * Centralizes all communication between the React Frontend and the Electron/Python Backend.
 */

// Safe access to the electron bridge
const electron = (window as any).electron;

export const ipcService = {
  // --- Mod Management ---
  scanWorkshop: (path: string): Promise<Mod[] | { error: string }> =>
    electron.scanWorkshop(path),

  getCachedMods: (): Promise<Mod[]> =>
    electron.getCachedMods(),

  syncIni: (data: { iniPath: string, modIds: string[] }): Promise<SyncResult> =>
    electron.syncIni(data),

  readIni: (path: string): Promise<IniData | { error: string }> =>
    electron.readIni(path),

  // --- Settings & Files ---
  readSettings: (): Promise<Settings> =>
    electron.readSettings(),

  saveSettings: (settings: Settings): Promise<SaveResult> =>
    electron.saveSettings(settings),

  selectFolder: (): Promise<string | null> =>
    electron.selectFolder(),

  selectFile: (): Promise<string | null> =>
    electron.selectFile(),

  openFolder: (path: string): Promise<boolean> =>
    electron.openFolder(path),

  openUrl: (url: string): Promise<boolean> =>
    electron.openUrl(url),

  // --- Conflict Audit ---
  getAllConflicts: (activeModIds: string[]): Promise<{ active: Issue[], ignored: Issue[] }> =>
    electron.getAllConflicts(activeModIds),

  ignoreConflictFingerprint: (fingerprint: string): Promise<SaveResult> =>
    electron.ignoreConflictFingerprint(fingerprint),

  unignoreConflictFingerprint: (fingerprint: string): Promise<SaveResult> =>
    electron.unignoreConflictFingerprint(fingerprint),

  diagnoseConflict: (data: { fingerprint: string, activeModIds: string[], filePath?: string }): Promise<DiagnosisReport> =>
    electron.diagnoseConflict(data),

  // --- World Config & Sandbox ---
  getServerConfig: (iniPath: string): Promise<any> =>
    electron.getServerConfig(iniPath),

  saveSandboxVars: (data: { luaPath: string, vars: any }): Promise<SaveResult> =>
    electron.saveSandboxVars(data),

  saveIniVars: (data: { iniPath: string, vars: any }): Promise<SaveResult> =>
    electron.saveIniVars(data),

  saveWorkshopPlaylist: (data: { iniPath: string, playlist: any[] }): Promise<SaveResult> =>
    electron.saveWorkshopPlaylist(data),

  saveMapList: (data: { iniPath: string, maps: string[] }): Promise<SaveResult> =>
    electron.saveMapList(data),

  // --- Presets & Backups ---
  importIniPreset: (data: { sourcePath: string, targetPath: string, mode: 'full' | 'soft' }): Promise<SaveResult> =>
    electron.importIniPreset(data),

  importSandboxPreset: (data: { sourcePath: string, targetPath: string }): Promise<SaveResult> =>
    electron.importSandboxPreset(data),

  createMultiBackup: (data: { sourceDirs: string[], zipPath: string }): Promise<SaveResult> =>
    electron.createMultiBackup(data),
};
