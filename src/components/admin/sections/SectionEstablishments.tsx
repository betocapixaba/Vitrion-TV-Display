import React from 'react';
import {
  Building2,
  Plus,
  MapPin,
  Tv2,
  Store,
  Layers,
  Sparkles,
} from 'lucide-react';

export function SectionEstablishments() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Estabelecimentos Comerciais</h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre locais físicos, lojas, franquias e relacione quais TVs operam em cada ponto.
          </p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium cursor-not-allowed opacity-80"
          title="Funcionalidade em desenvolvimento"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Estabelecimento</span>
        </button>
      </div>

      <div className="rounded-xl border border-dashed border-slate-800 bg-[#0d101a]/50 p-10 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
          <Building2 className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold text-white">Módulo de Gestão de Estabelecimentos</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Fase B Estruturada
          </span>
        </div>
        <p className="text-xs text-slate-400 max-w-md mt-1 mb-6 leading-relaxed">
          Estrutura multi-local para gerenciar redes de franquias, agrupar telas por cidade ou loja,
          e direcionar campanhas publicitárias hiperlocais.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-medium mb-1">
              <Store className="w-3.5 h-3.5" />
              <span>Hierarquia de Lojas</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Associação de unidades de negócio, endereços e identificação visual.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-sky-400 font-medium mb-1">
              <Tv2 className="w-3.5 h-3.5" />
              <span>Vínculo de Telas</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Distribuição de telas instaladas no ponto de venda (vitrine, caixa, espera).
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-medium mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Segmentação Regional</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Direcionamento de anúncios específicos conforme a praça de veiculação.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
