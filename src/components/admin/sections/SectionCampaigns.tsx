import React from 'react';
import {
  Megaphone,
  Plus,
  TrendingUp,
  Target,
  BarChart3,
  Calendar,
  Sparkles,
} from 'lucide-react';

export function SectionCampaigns() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Campanhas & Anúncios</h2>
          <p className="text-xs text-slate-400 mt-1">
            Programação publicitária por cota, agendamento de slots comerciais e comprovação de veiculação.
          </p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-medium cursor-not-allowed opacity-80"
          title="Funcionalidade em desenvolvimento para a Fase E"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Campanha (Fase E)</span>
        </button>
      </div>

      <div className="rounded-xl border border-dashed border-slate-800 bg-[#0d101a]/50 p-10 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
          <Megaphone className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold text-white">Módulo de Campanhas Publicitárias</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Fase E
          </span>
        </div>
        <p className="text-xs text-slate-400 max-w-md mt-1 mb-6 leading-relaxed">
          Nesta área você programará contratos de publicidade, definirá cotas de inserções por hora
          e extrairá relatórios de auditoria de exibições realizadas pelas telas.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-medium mb-1">
              <Target className="w-3.5 h-3.5" />
              <span>Cotas & Frequência</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Controle estrito de repetições por loop ou inserções mínimas por hora.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-sky-400 font-medium mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Vigência de Contrato</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Data de início e término automático sem necessidade de intervenção manual.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-medium mb-1">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Proof-of-Play (PoP)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Auditoria de logs confirmando cada exibição efetuada nos dispositivos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
