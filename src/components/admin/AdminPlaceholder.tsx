import React from 'react';
import { Shield, Tv, ArrowLeft, CheckCircle2, Construction, Layers, Monitor, HardDrive } from 'lucide-react';

export interface AdminPlaceholderProps {
  onNavigateToTv?: () => void;
}

export function AdminPlaceholder({ onNavigateToTv }: AdminPlaceholderProps) {
  const handleReturnToTv = () => {
    if (onNavigateToTv) {
      onNavigateToTv();
    } else {
      window.location.hash = '';
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090b11] text-slate-200 flex flex-col font-sans select-text">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-[#0d101a]/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">VITRION</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium">
                Área Administrativa
              </span>
            </div>
            <p className="text-xs text-slate-400">Painel de Gestão e Operações de Sinalização Digital</p>
          </div>
        </div>

        <button
          onClick={handleReturnToTv}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
          title="Alternar de volta para o Player de TV"
        >
          <Tv className="w-4 h-4 text-sky-400" />
          <span>Voltar para o Player TV</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
        {/* Status Banner */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 mt-0.5">
              <Construction className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">
                  Ponto de Entrada Administrativo Isolado
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Fase A1 Concluída
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Esta rota (<code className="text-sky-300 font-mono text-xs bg-slate-900 px-1.5 py-0.5 rounded">/#/admin</code>)
                opera de forma completamente desacoplada do runtime da Smart TV. Todos os efeitos colaterais de TV
                (wake-lock, ocultação de cursor, persistência de player e loops de reprodução) permanecem inativos aqui.
              </p>
            </div>
          </div>
        </div>

        {/* Isolation Verification Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800 bg-[#0e121e]/60 p-5">
            <div className="flex items-center gap-2.5 mb-3 text-slate-100 font-medium text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Garantias de Isolamento Ativas</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Sem mutação ou criação de identidade de dispositivo TV (<code className="text-slate-400">getOrCreateDeviceProfile</code> ignorado)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Sem ativação de Screen Wake Lock de TV (<code className="text-slate-400">requestScreenWakeLock</code> não disparado)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Cursor do mouse livre para desktop (<code className="text-slate-400">initCursorAutoHider</code> inativo)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Teclado e atalhos de controle remoto desligados (tecla M, Espaço, Seta)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Loops de reprodução e telemetria desativados (sem heartbeat de TV)</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0e121e]/60 p-5">
            <div className="flex items-center gap-2.5 mb-3 text-slate-100 font-medium text-sm">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Próximas Fases da Administração</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-sky-400 font-mono text-[10px]">FASE B:</span>
                <span>Estrutura de layout e navegação do dashboard (Sidebar, Topbar, Tabs).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-400 font-mono text-[10px]">FASE C:</span>
                <span>Módulo de Gestão de Telas & Pareamento de Dispositivos.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-400 font-mono text-[10px]">FASE D:</span>
                <span>Módulo de Gestão de Playlists, Biblioteca de Mídias e Agendamentos.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-400 font-mono text-[10px]">FASE E:</span>
                <span>Campanhas de Anúncios e Relatórios de Veiculação.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Quick Navigation Action */}
        <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-slate-800/80 text-slate-300">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Visualizar Player TV</h3>
              <p className="text-xs text-slate-400">
                Acesse a experiência padrão de exibição e ativação de sinalização digital.
              </p>
            </div>
          </div>
          <button
            onClick={handleReturnToTv}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ir para Tela da TV</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-500">
        Vitrion TV Display & Digital Signage — Módulo Administrativo Isolado (Fase A1)
      </footer>
    </div>
  );
}
