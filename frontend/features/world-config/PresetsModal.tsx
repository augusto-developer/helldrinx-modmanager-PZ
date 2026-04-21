import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap } from 'lucide-react';

// Modular Components
import PresetsPanel from './PresetsPanel';
import BackupPrompt from './Overlays/BackupPrompt';
import { SuccessModal } from './Overlays/StatusFeedback';
import { CustomLoading } from '../../components/common/CustomLoading';
import type { ElectronBridge } from '../../types/world_config';
import { ipcService } from '../../services/ipcService';

// (Removed direct electron access in favor of ipcService)

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  iniPath: string;
  onSync?: () => void;
}

const PresetsModal: React.FC<PresetsModalProps> = ({ isOpen, onClose, iniPath, onSync }) => {
  // Preset Import State
  const [selectedIniPreset, setSelectedIniPreset] = useState<string | null>(null);
  const [selectedLuaPreset, setSelectedLuaPreset] = useState<string | null>(null);
  const [iniImportMode, setIniImportMode] = useState<'full' | 'soft'>('soft');
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [importing, setImporting] = useState(false);
  const [customBackupName, setCustomBackupName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleImportPresets = async (doBackup: boolean) => {
    setImporting(true);
    setShowBackupPrompt(false);
    try {
      if (doBackup) {
        setStatusMessage('INITIALIZING SAFETY BACKUP...');
        const destDir = await ipcService.selectFolder();
        if (destDir) {
          setStatusMessage('COMPRESSING .SERVER ARCHIVE...');
          const cleanName = customBackupName.replace(/[\\/:*?"<>|]/g, '_').trim() || 'SERVER_BACKUP';
          const zipName = cleanName.toLowerCase().endsWith('.zip') ? cleanName : `${cleanName}.zip`;
          const zipPath = `${destDir}\\${zipName}`;
          const serverDir = iniPath.substring(0, iniPath.lastIndexOf('\\'));
          await ipcService.createMultiBackup({ sourceDirs: [serverDir], zipPath });
        } else {
          setImporting(false);
          return;
        }
      }

      setStatusMessage('DEPLOYING SYSTEM PRESETS...');
      if (selectedIniPreset) {
        await ipcService.importIniPreset({
          sourcePath: selectedIniPreset,
          targetPath: iniPath,
          mode: iniImportMode
        });
      }
      if (selectedLuaPreset) {
        const baseName = iniPath.replace('.ini', '');
        const targetLuaPath = `${baseName}_SandboxVars.lua`;
        await ipcService.importSandboxPreset({
          sourcePath: selectedLuaPreset,
          targetPath: targetLuaPath
        });
      }

      setSelectedIniPreset(null);
      setSelectedLuaPreset(null);

      if (onSync) onSync();

      setImporting(false);
      setTimeout(() => setShowSuccess(true), 500);

    } catch (err: unknown) {
      console.error('Import failed:', err);
      setImporting(false);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Import failed: ${msg}`);
    } finally {
      setStatusMessage('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 10 }}
        className="w-full max-w-4xl bg-zinc-950 border border-zinc-800/50 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]"
      >
        {/* Header with Branded Image Background */}
        <div className="relative h-24 border-b border-zinc-800/50 bg-zinc-900/40 flex items-center px-8 overflow-hidden">
          {/* Left Wingman Cat */}
          <div 
            className="absolute inset-y-0 left-6 w-72 pointer-events-none"
            style={{
              backgroundImage: `url(/assets/config_preset.png)`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'left center',
              maskImage: 'linear-gradient(to right, black 25%, transparent 85%)',
              WebkitMaskImage: 'linear-gradient(to right, black 25%, transparent 85%)',
              zIndex: 0
            }}
          />

          {/* Right Wingman Cat (Mirrored) */}
          <div 
            className="absolute inset-y-0 right-6 w-72 pointer-events-none transform scale-x-[-1]"
            style={{
              backgroundImage: `url(/assets/config_preset.png)`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'left center',
              maskImage: 'linear-gradient(to right, black 25%, transparent 85%)',
              WebkitMaskImage: 'linear-gradient(to right, black 25%, transparent 85%)',
              zIndex: 0
            }}
          />

          {/* Absolutely Centered Text Block */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center text-center w-full max-w-sm">
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none drop-shadow-lg whitespace-nowrap">
              Configuration Presets
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <div className="h-px w-6 bg-gradient-to-r from-transparent to-emerald-500/30" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400">
                System Architecture & Templates
              </span>
              <div className="h-px w-6 bg-gradient-to-l from-transparent to-emerald-500/30" />
            </div>
          </div>

          <div className="ml-auto relative z-20">
            <button 
              onClick={onClose} 
              className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-95"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-zinc-950">
          <div className="max-w-2xl mx-auto">
            <PresetsPanel
              selectedIniPreset={selectedIniPreset}
              setSelectedIniPreset={setSelectedIniPreset}
              selectedLuaPreset={selectedLuaPreset}
              setSelectedLuaPreset={setSelectedLuaPreset}
              iniImportMode={iniImportMode}
              setIniImportMode={setIniImportMode}
              importing={importing}
              setCustomBackupName={setCustomBackupName}
              setShowBackupPrompt={setShowBackupPrompt}
            />
          </div>
        </div>

      </motion.div>

      {/* Context Overlays */}
      <BackupPrompt
        show={showBackupPrompt}
        onClose={() => setShowBackupPrompt(false)}
        customBackupName={customBackupName}
        setCustomBackupName={setCustomBackupName}
        onConfirm={handleImportPresets}
      />

      {importing && <CustomLoading message={statusMessage} />}
      <SuccessModal show={showSuccess} onClose={() => {
        setShowSuccess(false);
        onClose();
      }} />
    </motion.div>
  );
};

export default PresetsModal;
