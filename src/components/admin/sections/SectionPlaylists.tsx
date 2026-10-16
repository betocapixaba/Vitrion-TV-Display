import React from 'react';
import {
  ListVideo,
  Plus,
  Clock,
  Shuffle,
  Calendar,
  Layers,
  Sparkles,
  FileVideo,
} from 'lucide-react';

export function SectionPlaylists() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Playlists & Grades de Exibição</h2>
          <p className="text-xs text-slate-400 mt-1">
            Crie, ordene e configure o tempo de reprodução de carrosséis de mídias para as TVs.
          </p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium cursor-not-allowed opacity-80"
          title="Funcionalidade em desenvolvimento para a Fase D"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Playlist (Fase D)</span>
        </button>
      </div>

      <div className="rounded-xl border border-dashed border-slate-800 bg-[#0d101a]/50 p-10 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
          <ListVideo className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold text-white">Módulo de Gestão de Playlists</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Fase D
          </span>
        </div>
        <p className="text-xs text-slate-400 max-w-md mt-1 mb-6 leading-relaxed">
          Nesta área você poderá organizar os itens da grade, definir durações por item,
          efeitos de transição e regras de agendamento por dia e horário.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-indigo-400 font-medium mb-1">
              <Shuffle className="w-3.5 h-3.5" />
              <span>Ordenação Drag-and-Drop</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Reorganização visual sequencial de banners e vídeos veiculados.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-sky-400 font-medium mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Duração & Transições</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Controle de tempo individual ou padrão global (Fade, Slide, Zoom).
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-medium mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Janelas de Horário</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Definição de dias da semana e horários de início/fim por mídia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
