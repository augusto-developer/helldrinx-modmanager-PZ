import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck } from 'lucide-react';
import { CustomLoading } from '../../../components/common/CustomLoading';

interface StatusOverlayProps {
  show: boolean;
  message: string;
}

export const StatusOverlay: React.FC<StatusOverlayProps> = ({ show, message }) => {
  return (
    <AnimatePresence>
      {show && <CustomLoading message={message} />}
    </AnimatePresence>
  );
};

interface SuccessModalProps {
  show: boolean;
  onClose: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ show, onClose }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-950 border border-green-500/20 rounded-[2rem] p-12 max-w-sm w-full text-center shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
          >
            <div className="w-24 h-24 mx-auto mb-8 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-green-500/25 blur-3xl rounded-full" />
              <img
                src="assets/backup_completed.png"
                alt="Success"
                className="w-20 h-20 object-contain relative z-10 brightness-125 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]"
              />
            </div>
            <h3 className="text-white text-3xl font-black mb-4 tracking-tighter uppercase">Backup Created !</h3>
            <p className="text-zinc-400 text-xs leading-relaxed mb-10 font-bold uppercase tracking-widest">
              Configuration presets have been <b className="text-green-500">successfully deployed</b> to the server core.
            </p>
            <button
              onClick={onClose}
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl text-lg font-black uppercase tracking-tighter transition-all shadow-lg shadow-green-900/20 active:scale-95"
            >
              Mission Accomplished
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
