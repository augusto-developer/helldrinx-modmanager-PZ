import React from 'react';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: React.ReactNode;
  onOpenSettings: () => void;
  onOpenAudit: () => void;
  onOpenWorldConfig: () => void;
  onOpenPresets: () => void;
  onOpenGlobalBackup: () => void;
}

/**
 * 🏰 HellDrinx Main Layout
 * The master frame of the application.
 * Handles sidebar, footer, and a cinematic background layer.
 */
export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  onOpenSettings,
  onOpenAudit,
  onOpenWorldConfig,
  onOpenPresets,
  onOpenGlobalBackup
}) => {
  return (
    <div className="h-screen w-screen bg-[#0a0a0b] text-white flex flex-col overflow-hidden font-sans selection:bg-red-500/30">
      
      {/* Primary Layout Structure */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Sidebar Component */}
        <Sidebar 
          onOpenSettings={onOpenSettings}
          onOpenAudit={onOpenAudit}
          onOpenWorldConfig={onOpenWorldConfig}
          onOpenPresets={onOpenPresets}
          onOpenGlobalBackup={onOpenGlobalBackup}
        />

        {/* Dynamic Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden h-full">
          {/* Dynamic Background Layer (Cinematic) - Constrained to Main area */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img 
              src="assets/background.png" 
              className="w-full h-full object-fill" 
              alt="Atmospheric Background"
            />
          </div>

          <div className="relative z-10 flex flex-col h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Global Status Footer */}
      <Footer />
    </div>
  );
};
