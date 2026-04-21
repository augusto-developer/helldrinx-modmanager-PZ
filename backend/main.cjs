const { app, BrowserWindow, ipcMain, dialog, protocol, net, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');
const CACHE_PATH = path.join(app.getPath('userData'), 'mod_cache.json');

let mainWindow;
let scannedMods = []; // Global cache for sync logic
let masterOrder = []; // Legacy priority list

// Ensure userData directory exists
const userDataPath = app.getPath('userData');
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

// Register privileged schemes before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-image', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true // Re-enabling safety as we use a protocol now
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  // Local image protocol for rendering mod.info posters
  protocol.handle('local-image', async (request) => {
    try {
      const urlObj = new URL(request.url);
      // Remove protocol and leading slashes
      // URL: local-image://c/path -> urlObj.host: c, urlObj.pathname: /path
      // URL: local-image:///C:/path -> urlObj.host: (empty), urlObj.pathname: /C:/path

      let rawPath = '';
      if (urlObj.host && urlObj.host.length === 1) {
        // Handle format: local-image://c/path
        rawPath = `${urlObj.host}:${urlObj.pathname}`;
      } else {
        // Handle format: local-image:///C:/path
        rawPath = urlObj.pathname;
      }

      // 1. Safe Decode
      let decodedPath;
      try {
        decodedPath = decodeURIComponent(rawPath);
      } catch (e) {
        // Fallback: manually replace common URL entities but leave % intact if malformed
        decodedPath = rawPath.replace(/%20/g, ' ').replace(/%5C/g, '\\');
      }

      // 2. Clean Windows path (remove leading slashes like /C:/)
      let cleanedPath = decodedPath.replace(/^\/+/, '');

      // 3. Normalize to system path
      const absolutePath = path.normalize(cleanedPath);

      console.log(`[Protocol] ${request.url} -> ${absolutePath}`);

      if (!fs.existsSync(absolutePath)) {
        console.error(`[Protocol] NOT FOUND: ${absolutePath}`);
        return new Response('File not found', { status: 404 });
      }

      return net.fetch(`file:///${absolutePath.replace(/\\/g, '/')}`);
    } catch (e) {
      console.error('[Protocol] Critical Error:', e);
      return new Response('Error', { status: 500 });
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- SERVICES ---
const configService = require('./services/world_config.cjs');
const workshopService = require('./services/workshop.cjs');
const { GeminiService } = require('./services/ai.cjs');

// INITIALIZATION
const legacyMasterOrderPath = path.join(process.env.APPDATA, 'HellDrinxModManager', 'master_order.json');
if (fs.existsSync(legacyMasterOrderPath)) {
  try {
    const order = JSON.parse(fs.readFileSync(legacyMasterOrderPath, 'utf8'));
    workshopService.setMasterOrder(order);
  } catch (e) {
    console.error('[Init] Failed to load legacy master order:', e);
  }
}
workshopService.loadSortingRules(process.env.APPDATA);

// Load mod cache on startup
if (fs.existsSync(CACHE_PATH)) {
  try {
    workshopService.scannedMods = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch (e) { }
}

// Load ignored conflicts on startup
if (fs.existsSync(SETTINGS_PATH)) {
  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    if (settings.ignoredConflicts) workshopService.setIgnoredFingerprints(settings.ignoredConflicts);
  } catch (e) { }
}

// IPC ENDPOINTS

// --- MOD & WORKSHOP HANDLERS ---
ipcMain.handle('scan-workshop', async (event, path) => workshopService.scanWorkshop(path, CACHE_PATH));
ipcMain.handle('get-cached-mods', () => workshopService.scannedMods);
ipcMain.handle('get-all-conflicts', async (event, activeModIds) => workshopService.getAllConflicts(activeModIds));
ipcMain.handle('diagnose-conflict', async (event, { fingerprint, activeModIds, filePath }) => {
  try {
    return await workshopService.diagnoseConflict(fingerprint, activeModIds, filePath);
  } catch (e) {
    console.error('IPC Diagnosis Error:', e);
    return { error: e.message };
  }
});

ipcMain.handle('ignore-conflict-fingerprint', async (event, fingerprint) => {
  try {
    let settings = {};
    if (fs.existsSync(SETTINGS_PATH)) settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    if (!settings.ignoredConflicts) settings.ignoredConflicts = [];
    if (!settings.ignoredConflicts.includes(fingerprint)) settings.ignoredConflicts.push(fingerprint);
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
    workshopService.setIgnoredFingerprints(settings.ignoredConflicts);
    return { success: true };
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('unignore-conflict-fingerprint', async (event, fingerprint) => {
  try {
    let settings = {};
    if (fs.existsSync(SETTINGS_PATH)) settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    if (settings.ignoredConflicts) {
      settings.ignoredConflicts = settings.ignoredConflicts.filter(f => f !== fingerprint);
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
      workshopService.setIgnoredFingerprints(settings.ignoredConflicts);
    }
    return { success: true };
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('read-ini', async (event, iniPath) => {
  try {
    if (!fs.existsSync(iniPath)) return { error: 'File not found' };
    const content = fs.readFileSync(iniPath, 'utf8');
    const modsMatch = content.match(/^Mods=(.*)$/m);
    const wsMatch = content.match(/^WorkshopItems=(.*)$/m);

    const rawMods = modsMatch ? modsMatch[1].split(';').map(s => s.trim()).filter(Boolean) : [];
    const workshopItems = wsMatch ? wsMatch[1].split(';').map(s => s.trim()).filter(Boolean) : [];

    const mods = rawMods.map(mid => {
      const norm = workshopService.normalizeId(mid);
      const mod = workshopService.scannedMods.find(m => workshopService.normalizeId(m.id) === norm);
      return mod ? mod.id : mid;
    });

    return { mods, workshopItems };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('sync-ini', async (event, { iniPath, modIds }) => {
  try {
    if (!fs.existsSync(iniPath)) return { error: 'File not found' };
    let content = fs.readFileSync(iniPath, 'utf8');

    const canonicalIds = modIds.map(mid => {
      const norm = workshopService.normalizeId(mid);
      const mod = workshopService.scannedMods.find(m => workshopService.normalizeId(m.id) === norm);
      return mod ? mod.id : mid;
    });

    const sortedIds = workshopService.sortModIds(canonicalIds);
    const workshopIds = new Set();
    const mapFolders = [];

    for (const mid of sortedIds) {
      const normMid = workshopService.normalizeId(mid);
      const modInfo = workshopService.scannedMods.find(m => workshopService.normalizeId(m.id) === normMid);
      if (modInfo) {
        if (modInfo.workshop_id) workshopIds.add(modInfo.workshop_id);
        if (modInfo.maps && Array.isArray(modInfo.maps)) {
          modInfo.maps.forEach(mapName => {
            if (!mapFolders.includes(mapName)) mapFolders.push(mapName);
          });
        }
      }
    }

    if (mapFolders.includes('Muldraugh, KY')) {
      const filtered = mapFolders.filter(m => m !== 'Muldraugh, KY');
      filtered.push('Muldraugh, KY');
      mapFolders.length = 0;
      mapFolders.push(...filtered);
    } else {
      mapFolders.push('Muldraugh, KY');
    }

    const updates = {
      Mods: sortedIds.join(';'),
      WorkshopItems: Array.from(workshopIds).join(';'),
      Map: mapFolders.join(';')
    };

    for (const [key, val] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const line = `${key}=${val}`;
      if (content.match(regex)) content = content.replace(regex, line);
      else content += `\n${line}`;
    }

    fs.writeFileSync(iniPath, content, 'utf8');
    return { success: true, sortedMods: sortedIds };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('save-ini', async (event, { iniPath, mods, workshopItems }) => {
  try {
    if (!fs.existsSync(iniPath)) return { error: 'File not found' };
    let content = fs.readFileSync(iniPath, 'utf8');
    const updates = { Mods: mods.join(';'), WorkshopItems: workshopItems.join(';') };
    for (const [key, val] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const line = `${key}=${val}`;
      if (content.match(regex)) content = content.replace(regex, line);
      else content += `\n${line}`;
    }
    fs.writeFileSync(iniPath, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
});

// --- WORLD CONFIGURATION HANDLERS ---
ipcMain.handle('get-server-config', async (event, iniPath) => {
  try {
    const baseName = path.basename(iniPath).replace('.ini', '');
    const luaPath = path.join(path.dirname(iniPath), `${baseName}_SandboxVars.lua`);
    const sandbox = configService.readSandboxVars(luaPath);
    const ini = configService.readIniVars(iniPath);
    if (sandbox.error) return { error: `Sandbox Error: ${sandbox.error}` };
    if (ini.error) return { error: `INI Error: ${ini.error}` };
    const mapList = configService.buildMapList(ini.raw || {});
    const workshopPlaylist = configService.buildWorkshopPlaylist(ini.raw || {}, workshopService.scannedMods);
    return { sandbox, ini, mapList, workshopPlaylist, luaPath, iniPath };
  } catch (e) {
    console.error('get-server-config failed:', e);
    return { error: e.message };
  }
});

ipcMain.handle('save-workshop-playlist', async (event, { iniPath, playlist }) => {
  const wsLine = playlist.map((item) => item.workshopId).join(';');
  const modLine = playlist.map((item) => item.modId).join(';');
  return configService.saveIniVars(iniPath, { WorkshopItems: wsLine, Mods: modLine });
});

ipcMain.handle('save-map-list', async (event, { iniPath, maps }) => {
  return configService.saveIniVars(iniPath, { Map: maps.join(';') });
});

ipcMain.handle('save-sandbox-vars', async (event, { luaPath, vars }) => configService.saveSandboxVars(luaPath, vars));
ipcMain.handle('save-ini-vars', async (event, { iniPath, vars }) => configService.saveIniVars(iniPath, vars));
ipcMain.handle('import-ini-preset', async (event, { sourcePath, targetPath, mode }) => configService.importIniPreset(sourcePath, targetPath, mode));
ipcMain.handle('import-sandbox-preset', async (event, { sourcePath, targetPath }) => configService.importSandboxPreset(sourcePath, targetPath));
ipcMain.handle('create-server-backup', async (event, { sourceDir, zipPath }) => configService.createMultiBackup([sourceDir], zipPath));
ipcMain.handle('create-multi-backup', async (event, { sourceDirs, zipPath }) => configService.createMultiBackup(sourceDirs, zipPath));

// --- UTILITY HANDLERS ---
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'INI Files', extensions: ['ini'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('read-settings', () => {
  if (!fs.existsSync(SETTINGS_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')); } catch (e) { return {}; }
});

ipcMain.handle('save-settings', (event, settings) => {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
    return { success: true };
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('open-folder', async (event, path) => {
  try { if (path && fs.existsSync(path)) { await shell.openPath(path); return true; } } catch (e) { }
  return false;
});

ipcMain.handle('show-item-in-folder', async (event, path) => {
  try { 
    if (path && fs.existsSync(path)) { 
      shell.showItemInFolder(path); 
      return true; 
    } else {
      console.log('[Electron] Path not found for locate:', path);
    }
  } catch (e) { console.error('[Electron] Locate Error:', e); }
  return false;
});

ipcMain.handle('open-url', async (event, url) => {
  try { if (url) { await shell.openExternal(url); return true; } } catch (e) { }
  return false;
});

ipcMain.handle('ai-generate-diagnosis', async (event, { context }) => {
  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    const apiKey = settings.geminiApiKey;
    const instructions = settings.aiInstructions;
    
    if (!apiKey) throw new Error('GEMINI_API_KEY_MISSING');
    
    const aiService = new GeminiService(apiKey);
    return await aiService.generateDiagnosis(instructions, context);
  } catch (e) {
    console.error('[Electron] AI Error:', e);
    return { error: e.message };
  }
});
