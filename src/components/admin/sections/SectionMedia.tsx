import React from 'react';
import {
  Film,
  UploadCloud,
  CheckCircle2,
  HardDrive,
  FileImage,
  FileVideo,
  Sparkles,
} from 'lucide-react';

export function SectionMedia() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Biblioteca de Mídia</h2>
          <p className="text-xs text-slate-400 mt-1">
            Repositório de ativos visuais (imagens, vídeos MP4/WebM) distribuídos para as TVs.
          </p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-medium cursor-not-allowed opacity-80"
          title="Funcionalidade em desenvolvimento para a Fase D"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Enviar Mídias (Fase D)</span>
        </button>
      </div>

      <div className="rounded-xl border border-dashed border-slate-800 bg-[#0d101a]/50 p-10 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
          <Film className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold text-white">Módulo de Gestão de Mídias</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Fase D
          </span>
        </div>
        <p className="text-xs text-slate-400 max-w-md mt-1 mb-6 leading-relaxed">
          Nesta área você gerenciará uploads de vídeos e imagens, verificará compatibilidade de codecs
          e auditará o consumo de cache offline das telas.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-cyan-400 font-medium mb-1">
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload e Validação</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Suporte a imagens (JPG, PNG, WebP) e vídeos (MP4 h.264 para Fire TV).
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-sky-400 font-medium mb-1">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Auditoria de Cache</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Acompanhamento de blobs armazenados no IndexedDB das TVs participantes.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-medium mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Controle de Versão</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Geração de checksums e invalidação automática de cache em edições.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
