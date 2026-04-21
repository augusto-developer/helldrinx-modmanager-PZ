import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Electron Bridge - Exposes native features to React
if ((window as any).require) {
  const { ipcRenderer } = (window as any).require('electron');
  (window as any).electron = {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    openFolderNative: (path: string) => ipcRenderer.invoke('open-folder-native', path),
    openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
    selectFile: () => ipcRenderer.invoke('select-file'),
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
