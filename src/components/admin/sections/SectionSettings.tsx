import React from 'react';
import {
  Settings,
  Shield,
  Clock,
  HardDrive,
  Sliders,
  CheckCircle2,
  Tv,
} from 'lucide-react';

interface SectionSettingsProps {
  onReturnToTv: () => void;
}

export function SectionSettings({ onReturnToTv }: SectionSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Configurações do Sistema</h2>
          <p className="text-xs text-slate-400 mt-1">
            Parâmetros operacionais do display, políticas de cache local e identificação de ambiente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Environment Info */}
        <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-5 space-y-4">
          <div className="flex items-center gap-2.5 text-slate-100 font-semibold text-sm">
            <Shield className="w-4 h-4 text-sky-400" />
            <span>Isolamento e Segurança</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Contexto Ativo:</span>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Desktop Web Administration
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Screen Wake Lock de TV:</span>
              <span className="text-slate-400 font-mono">Inativo nesta aba</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Auto-ocultação de Cursor:</span>
              <span className="text-slate-400 font-mono">Inativo nesta aba</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Atalhos D-pad / Teclado TV:</span>
              <span className="text-slate-400 font-mono">Inativo nesta aba</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400">Rota Atual:</span>
              <span className="font-mono text-sky-400 bg-slate-900 px-2 py-0.5 rounded">
                /#/admin/settings
              </span>
            </div>
          </div>
        </div>

        {/* Global Player Defaults */}
        <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-5 space-y-4">
          <div className="flex items-center gap-2.5 text-slate-100 font-semibold text-sm">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Padrões de Sinalização</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Duração Padrão por Imagem:</span>
              <span className="text-slate-200 font-medium">10 segundos</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Avanço de Vídeo:</span>
              <span className="text-slate-200 font-medium">Evento nativo &apos;ended&apos;</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Transição Padrão:</span>
              <span className="text-slate-200 font-medium">Fade cruzado (0.7s)</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400">Resiliência Anti-Black-Screen:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ativa
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Switch to TV CTA */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 to-[#0e121e] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Visualizar Experiência do Player de TV</h3>
            <p className="text-xs text-slate-400">
              Abra a tela de exibição em tela cheia com player multimídia e tela de ativação.
            </p>
          </div>
        </div>
        <button
          onClick={onReturnToTv}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer"
        >
          Ir para Player TV
        </button>
      </div>
    </div>
  );
}
