const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  readIni: (path) => ipcRenderer.invoke('read-ini', path),
  saveIni: (data) => ipcRenderer.invoke('save-ini', data),
  syncIni: (data) => ipcRenderer.invoke('sync-ini', data),
  scanWorkshop: (path) => ipcRenderer.invoke('scan-workshop', path),
  readSettings: () => ipcRenderer.invoke('read-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getCachedMods: () => ipcRenderer.invoke('get-cached-mods'),
  getAllConflicts: (activeModIds) => ipcRenderer.invoke('get-all-conflicts', activeModIds),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  ignoreConflictFingerprint: (fingerprint) => ipcRenderer.invoke('ignore-conflict-fingerprint', fingerprint),
  unignoreConflictFingerprint: (fingerprint) => ipcRenderer.invoke('unignore-conflict-fingerprint', fingerprint),
  getServerConfig: (iniPath) => ipcRenderer.invoke('get-server-config', iniPath),
  saveSandboxVars: (data) => ipcRenderer.invoke('save-sandbox-vars', data),
  saveIniVars: (data) => ipcRenderer.invoke('save-ini-vars', data),
  saveWorkshopPlaylist: (data) => ipcRenderer.invoke('save-workshop-playlist', data),
  saveMapList: (data) => ipcRenderer.invoke('save-map-list', data),
  importIniPreset: (data) => ipcRenderer.invoke('import-ini-preset', data),
  importSandboxPreset: (data) => ipcRenderer.invoke('import-sandbox-preset', data),
  createMultiBackup: (data) => ipcRenderer.invoke('create-multi-backup', data),
  diagnoseConflict: (data) => ipcRenderer.invoke('diagnose-conflict', data),
  showItemInFolder: (path) => ipcRenderer.invoke('show-item-in-folder', path),
  generateAiDiagnosis: (context) => ipcRenderer.invoke('ai-generate-diagnosis', { context })
});
