import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowRight } from 'lucide-react';
import type { TabType, ConfigCategory } from '../../types/world_config';

interface ConfigSidebarProps {
  activeCategory: string;
  setActiveCategory: (id: string) => void;
  isIniFolderOpen: boolean;
  setIsIniFolderOpen: (open: boolean) => void;
  isSandboxFolderOpen: boolean;
  setIsSandboxFolderOpen: (open: boolean) => void;
  iniCategories: ConfigCategory[];
  sandboxCategories: ConfigCategory[];
  searchQuery: string;
  getMatchCount: (catId: string) => number;
  mainTabs: TabType[];
}

const ConfigSidebar: React.FC<ConfigSidebarProps> = ({
  activeCategory,
  setActiveCategory,
  isIniFolderOpen,
  setIsIniFolderOpen,
  isSandboxFolderOpen,
  setIsSandboxFolderOpen,
  iniCategories,
  sandboxCategories,
  searchQuery,
  getMatchCount,
  mainTabs
}) => {
  const renderCategoryItem = (cat: ConfigCategory, layoutId: string) => {
    const isActive = activeCategory === cat.id;
    const matchCount = getMatchCount(cat.id);
    const isHighlighted = searchQuery && matchCount > 0;

    // Get unique sections for this category to render sub-items
    const sections = Array.from(new Set(
      (cat.fields || [])
        .map(f => f.section)
        .filter(Boolean) as string[]
    ));

    return (
      <div key={cat.id} className="space-y-1">
        <button
          onClick={() => setActiveCategory(cat.id)}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-left transition-all relative overflow-hidden group ${isActive
            ? 'bg-zinc-800 text-amber-500'
            : isHighlighted
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }`}
        >
          <span className={`text-[11px] font-bold truncate ${isHighlighted ? 'underline underline-offset-4 decoration-amber-500/50' : ''}`}>
            {cat.name}
          </span>
          <div className="flex items-center gap-2">
            {isHighlighted && !isActive && (
              <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 rounded-full animate-pulse shadow-glow whitespace-nowrap">
                {matchCount}
              </span>
            )}
            {isActive && (
              <motion.div layoutId={layoutId}>
                <ArrowRight size={14} />
              </motion.div>
            )}
            {cat.id === 'SandboxMods' && sections.length > 0 && (
              <ChevronDown 
                size={12} 
                className={`transition-transform opacity-30 ${isActive ? 'rotate-0' : '-rotate-90'}`}
              />
            )}
          </div>
        </button>

        {/* Sub-sections navigation */}
        <AnimatePresence>
          {isActive && cat.id === 'SandboxMods' && sections.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="ml-4 pl-4 border-l border-zinc-800/50 mb-4 space-y-1 py-1 overflow-hidden"
            >
              {sections.map(section => (
                <button
                  key={section}
                  onClick={(e) => {
                    e.stopPropagation();
                    const element = document.getElementById(`section-${section}`);
                    if (element) {
                      const container = element.closest('.overflow-y-auto');
                      if (container) {
                        const topPos = element.offsetTop;
                        container.scrollTo({
                          top: topPos - 40,
                          behavior: 'smooth'
                        });
                      }
                    }
                  }}
                  className="w-full text-left py-1.5 px-3 text-[10px] font-bold text-zinc-600 hover:text-zinc-300 transition-colors truncate"
                >
                  {section}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="w-80 bg-zinc-900/50 border-r border-zinc-800/50 flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Main Sections */}
        {mainTabs.length > 0 && (
          <div className="space-y-1">
            {mainTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${activeCategory === tab.id
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {tab.icon}
                  <span className="text-[11px] font-black uppercase tracking-widest">{tab.name}</span>
                </div>
                {activeCategory === tab.id && (
                  <motion.div layoutId="arrow-main">
                    <ArrowRight size={14} />
                  </motion.div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Categories: INI */}
        <div className="space-y-4">
          <button
            onClick={() => setIsIniFolderOpen(!isIniFolderOpen)}
            className="w-full flex items-center justify-between px-2 group"
          >
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] group-hover:text-amber-500 transition-colors">Engine Core (INI)</h3>
            <motion.div animate={{ rotate: isIniFolderOpen ? 0 : -90 }} className="text-zinc-600">
              <ChevronDown size={14} />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {isIniFolderOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-1"
              >
                {iniCategories.map(cat => renderCategoryItem(cat, 'arrow-ini'))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Categories: Sandbox */}
        <div className="space-y-4">
          <button
            onClick={() => setIsSandboxFolderOpen(!isSandboxFolderOpen)}
            className="w-full flex items-center justify-between px-2 group"
          >
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] group-hover:text-amber-500 transition-colors">Server Mechanics (Sandbox)</h3>
            <motion.div animate={{ rotate: isSandboxFolderOpen ? 0 : -90 }} className="text-zinc-600">
              <ChevronDown size={14} />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {isSandboxFolderOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-1"
              >
                {sandboxCategories.map(cat => renderCategoryItem(cat, 'arrow-sandbox'))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ConfigSidebar;
