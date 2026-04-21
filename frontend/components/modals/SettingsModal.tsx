import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, FolderOpen, Save, X } from 'lucide-react';
import { THEME } from '../../theme/design_system';
import { ipcService } from '../../services/ipcService';

 interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { 
    workshopPath: string, 
    serverIniPath: string,
    geminiApiKey: string,
    aiInstructions: string
  }) => void;
  initialSettings: { 
    workshopPath: string, 
    serverIniPath: string,
    geminiApiKey?: string,
    aiInstructions?: string
  };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, initialSettings }) => {
  const [workshopPath, setWorkshopPath] = useState(initialSettings.workshopPath);
  const [serverIniPath, setServerIniPath] = useState(initialSettings.serverIniPath);
  const [geminiApiKey, setGeminiApiKey] = useState(initialSettings.geminiApiKey || '');
  const [aiInstructions, setAiInstructions] = useState(initialSettings.aiInstructions || '');


  const handleSelectWorkshop = async () => {
    const path = await ipcService.selectFolder();
    if (path) setWorkshopPath(path);
  };

  const handleSelectIni = async () => {
    const path = await ipcService.selectFile();
    if (path) setServerIniPath(path);
  };

  const handleSave = () => {
    onSave({ 
      workshopPath, 
      serverIniPath,
      geminiApiKey,
      aiInstructions
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`${THEME.glass.modal} ${THEME.layout.borderRadius} w-full max-w-xl overflow-hidden`}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <Settings className="text-red-500" size={20} />
            <h2 className="text-lg font-black italic tracking-tight text-zinc-100 uppercase">System Settings</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Paths Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-l-2 border-red-500 pl-3">Paths & Directories</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Workshop Directory (mods)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly
                  value={workshopPath}
                  placeholder="Ex: C:\\Program Files (x86)\\Steam\\steamapps\\workshop\\content\\108600"
                  className={`flex-1 ${THEME.glass.input} ${THEME.layout.borderRadius} px-4 py-2.5 text-xs text-zinc-300 focus:outline-none`}
                />
                <button 
                  onClick={handleSelectWorkshop}
                  className={`bg-white/5 hover:bg-white/10 text-white px-4 ${THEME.layout.borderRadius} transition-all flex items-center gap-2 border border-white/5 text-xs font-bold`}
                >
                  <FolderOpen size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Server Config (.ini)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly
                  value={serverIniPath}
                  placeholder="Ex: C:\\Users\\Name\\Zomboid\\Server\\servertest.ini"
                  className={`flex-1 ${THEME.glass.input} ${THEME.layout.borderRadius} px-4 py-2.5 text-xs text-zinc-300 focus:outline-none`}
                />
                <button 
                  onClick={handleSelectIni}
                  className={`bg-white/5 hover:bg-white/10 text-white px-4 ${THEME.layout.borderRadius} transition-all flex items-center gap-2 border border-white/5 text-xs font-bold`}
                >
                  <FolderOpen size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* AI Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-l-2 border-blue-500 pl-3 flex items-center gap-2">
              Gemini AI Integration
              <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-blue-500">BETA</span>
            </h3>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Google Gemini API Key</label>
              <input 
                type="password" 
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Paste your API key here..."
                className={`w-full ${THEME.glass.input} ${THEME.layout.borderRadius} px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all font-mono`}
              />
              <p className="text-[9px] text-zinc-500">Get your key at <span className="text-blue-500 hover:underline cursor-pointer" onClick={() => window.electron.openUrl('https://aistudio.google.com/app/apikey')}>AI Studio</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Expert Instructions (Gem Prompt)</label>
              <textarea 
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="Paste the personality/instructions from your shared Gem here..."
                rows={4}
                className={`w-full ${THEME.glass.input} ${THEME.layout.borderRadius} px-4 py-3 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all resize-none custom-scrollbar`}
              />
              <p className="text-[9px] text-zinc-500 italic">This prompt guides how the AI analyzes your conflicts. Use the style from your favorite Gem!</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 text-sm font-black text-zinc-500 hover:text-zinc-100 transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-2.5 rounded-xl transition-all flex items-center gap-2 font-black uppercase tracking-widest shadow-lg shadow-red-900/20 active:scale-95"
          >
            <Save size={18} /> Save Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
