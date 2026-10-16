import React from 'react';
import {
  LayoutDashboard,
  Tv2,
  ListVideo,
  Film,
  Building2,
  Megaphone,
  Settings,
  Shield,
  Tv,
  X,
  ExternalLink,
} from 'lucide-react';
import { AdminSection, ADMIN_NAV_ITEMS } from './adminNavigation';

interface AdminSidebarProps {
  currentSection: AdminSection;
  onNavigate: (section: AdminSection, hash: string) => void;
  onReturnToTv: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const SECTION_ICONS: Record<AdminSection, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  screens: Tv2,
  playlists: ListVideo,
  media: Film,
  establishments: Building2,
  campaigns: Megaphone,
  settings: Settings,
};

export function AdminSidebar({
  currentSection,
  onNavigate,
  onReturnToTv,
  isOpenMobile,
  onCloseMobile,
}: AdminSidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0d101a] border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">VITRION</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">Painel de Gestão</p>
            </div>
          </div>

          {/* Close mobile button */}
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
            Navegação Principal
          </div>
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = SECTION_ICONS[item.id] || LayoutDashboard;
            const isActive = currentSection === item.id;
            return (
              <a
                key={item.id}
                href={item.hash}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.id, item.hash);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-sky-600/15 text-sky-400 border border-sky-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Bottom Actions / Return to TV */}
        <div className="p-3 border-t border-slate-800/80 space-y-2 bg-[#090b11]/50">
          <div className="px-2 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ambiente: Desktop Web</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Efeitos de TV isolados</p>
          </div>

          <button
            onClick={onReturnToTv}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer group"
            title="Voltar para a exibição de TV"
          >
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
              <span>Player TV</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300" />
          </button>
        </div>
      </aside>
    </>
  );
}
