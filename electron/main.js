import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let pythonProcess;

// IPC handlers for selecting native files/folders
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

ipcMain.handle('open-folder-native', async (event, folderPath) => {
    try {
        await shell.openPath(folderPath);
        return true;
    } catch (e) {
        console.error('Failed to open path:', e);
        return false;
    }
});

ipcMain.handle('open-external-url', async (event, url) => {
    try {
        await shell.openExternal(url);
        return true;
    } catch (e) {
        console.error('Failed to open external URL:', e);
        return false;
    }
});

ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Configuration Files', extensions: ['ini'] }
        ]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    icon: path.join(__dirname, '../build/helldrinx.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    backgroundColor: '#0f172a',
    show: false, // Don't show until ready-to-show
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startPythonBackend() {
  const isDev = process.env.NODE_ENV === 'development';
  let pythonPath;
  let scriptPath;

  if (app.isPackaged) {
    // Production: Use the bundled executable
    pythonPath = path.join(process.resourcesPath, 'backend', 'ModManagerEngine.exe');
    scriptPath = ''; // No script needed for the compiled EXE
  } else {
    // Development: Use the virtual environment
    pythonPath = path.join(__dirname, '../.venv/Scripts/python.exe');
    scriptPath = path.join(__dirname, '../src/backend_api.py');
  }
  
  console.log(`Starting Python backend: ${pythonPath} ${scriptPath}`);
  
  const args = scriptPath ? [scriptPath] : [];
  pythonProcess = spawn(pythonPath, args, {
    cwd: app.isPackaged ? path.join(process.resourcesPath, 'backend') : path.join(__dirname, '..'),
    env: { ...process.env, PYTHONPATH: path.join(__dirname, '..') }
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Error: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process closed with code ${code}`);
  });
}

app.whenReady().then(() => {
  createWindow();
  startPythonBackend();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});



function killPythonProcess() {
  if (pythonProcess) {
    console.log('Attemping to kill Python process tree...');
    if (process.platform === 'win32') {
      // Force kill the entire process tree on Windows
      exec(`taskkill /F /T /PID ${pythonProcess.pid}`, (err) => {
        if (err) {
          console.error('Failed to kill python process tree with taskkill:', err);
          pythonProcess.kill();
        }
      });
    } else {
      pythonProcess.kill();
    }
    pythonProcess = null;
  }
}

app.on('window-all-closed', () => {
  killPythonProcess();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  killPythonProcess();
});

app.on('before-quit', () => {
  killPythonProcess();
});
