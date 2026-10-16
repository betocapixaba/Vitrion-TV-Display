import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminSection } from './adminNavigation';

interface AdminLayoutProps {
  currentSection: AdminSection;
  onNavigate: (section: AdminSection, hash: string) => void;
  onReturnToTv: () => void;
  children: React.ReactNode;
}

export function AdminLayout({
  currentSection,
  onNavigate,
  onReturnToTv,
  children,
}: AdminLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-[#090b11] text-slate-200 flex flex-row font-sans select-text">
      {/* Persistent Desktop / Responsive Mobile Sidebar */}
      <AdminSidebar
        currentSection={currentSection}
        onNavigate={onNavigate}
        onReturnToTv={onReturnToTv}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          currentSection={currentSection}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onReturnToTv={onReturnToTv}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>

        <footer className="h-12 px-6 border-t border-slate-800/60 bg-[#0d101a]/50 flex items-center justify-between text-[11px] text-slate-400">
          <div>Vitrion TV Display & Digital Signage — Painel Administrativo</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Fase B — Fundação Visual</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
