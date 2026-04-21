import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import type { ConfigField, ConfigValue } from '../../types/world_config';

interface FieldsGridProps {
  filteredFields: ConfigField[];
  pendingChanges: Record<string, ConfigValue>;
  updateField: (id: string, value: ConfigValue) => void;
  setHoveredField: (field: ConfigField | null) => void;
  setMousePos: (pos: { x: number; y: number }) => void;
}

const FieldsGrid: React.FC<FieldsGridProps> = ({
  filteredFields,
  pendingChanges,
  updateField,
  setHoveredField,
  setMousePos
}) => {
  let lastSection = "";

  return (
    <div className="space-y-1">
      {filteredFields.map((field) => {
        const showHeader = field.section && field.section !== lastSection;
        if (showHeader) lastSection = field.section!;

        const currentValue = pendingChanges[field.id] !== undefined ? pendingChanges[field.id] : field.value;
        const isChanged = pendingChanges[field.id] !== undefined;

        return (
          <React.Fragment key={field.id}>
            {showHeader && (
              <div 
                id={`section-${field.section}`} 
                className="pt-16 pb-8 mb-8 flex flex-col items-center justify-center first:pt-0"
              >
                <div className="w-full flex items-center justify-center gap-6">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                  <h3 className="text-white text-[11px] font-black uppercase tracking-[0.5em] text-center drop-shadow-glow py-2">
                    {field.section}
                  </h3>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-zinc-800 to-transparent" />
                </div>
              </div>
            )}

            <div
              onMouseEnter={(e: React.MouseEvent) => {
                setHoveredField(field);
                setMousePos({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e: React.MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredField(null)}
              className={`group flex items-center gap-8 py-3 px-6 rounded-xl transition-all border border-transparent ${
                isChanged ? 'bg-amber-950/10 border-amber-900/30 shadow-xl' : 'hover:bg-zinc-900/30'
              }`}
            >
              <div className="flex-1 text-right">
                <label className={`text-[12px] transition-all block ${
                  isChanged ? 'text-amber-500 font-black tracking-widest' : 'text-zinc-400 group-hover:text-zinc-200 font-bold'
                }`}>
                  {field.name}
                </label>
              </div>

              <div className="flex-[1.5] flex items-center">
                {field.options && field.options.length > 0 ? (
                  <div className="relative w-full max-w-xs transition-transform active:scale-[0.98]">
                    <select
                      value={currentValue as string | number}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                        updateField(field.id, isNaN(parseInt(e.target.value)) ? e.target.value : parseInt(e.target.value))
                      }
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-4 h-10 text-xs text-zinc-100 outline-none focus:border-amber-500/50 appearance-none cursor-pointer font-bold shadow-2xl"
                    >
                      {field.options.map((opt) => (
                        <option key={opt.value as string | number} value={opt.value as string | number} className="bg-zinc-950 text-zinc-100">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                ) : typeof field.value === 'boolean' ? (
                  <button
                    onClick={() => updateField(field.id, !currentValue)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                      currentValue 
                        ? 'bg-zinc-950 border-zinc-800 shadow-[inset_0_0_20px_rgba(34,197,94,0.1)]' 
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {currentValue ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          className="w-7 h-7 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center justify-center text-green-500"
                        >
                          <Check size={18} strokeWidth={4} />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="w-7 h-7 border border-zinc-800 rounded-lg"
                        />
                      )}
                    </AnimatePresence>
                  </button>
                ) : (
                  <div className="w-full max-w-xs relative group/input">
                    <input
                      type="text"
                      value={currentValue as string | number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(field.id, e.target.value)}
                      spellCheck={false}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-4 h-10 text-xs text-zinc-200 outline-none focus:border-amber-500/50 transition-all font-mono font-bold shadow-2xl"
                    />
                    <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-amber-500 scale-x-0 group-focus-within/input:scale-x-100 transition-transform origin-center" />
                  </div>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default FieldsGrid;
