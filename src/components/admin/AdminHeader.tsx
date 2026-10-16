import React from 'react';
import { Menu, Tv, Bell, HelpCircle } from 'lucide-react';
import { AdminSection, ADMIN_NAV_ITEMS } from './adminNavigation';

interface AdminHeaderProps {
  currentSection: AdminSection;
  onOpenMobileSidebar: () => void;
  onReturnToTv: () => void;
}

export function AdminHeader({
  currentSection,
  onOpenMobileSidebar,
  onReturnToTv,
}: AdminHeaderProps) {
  const activeItem = ADMIN_NAV_ITEMS.find((item) => item.id === currentSection);
  const title = activeItem ? activeItem.label : 'Painel de Gestão';

  return (
    <header className="h-16 px-4 sm:px-6 bg-[#0d101a]/80 backdrop-blur border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Toggle mobile sidebar */}
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {title}
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Vitrion TV
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Módulo Administrativo & Operações de Sinalização Digital
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Help icon / Status indicator */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800/50 border border-slate-800 text-[11px] text-slate-400">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Fase B — Fundação Visual</span>
        </div>

        {/* TV Quick return button */}
        <button
          onClick={onReturnToTv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 border border-sky-500/30 transition-colors cursor-pointer"
          title="Alternar de volta para o Player de TV"
        >
          <Tv className="w-4 h-4" />
          <span className="hidden sm:inline">Tela TV</span>
        </button>
      </div>
    </header>
  );
}
