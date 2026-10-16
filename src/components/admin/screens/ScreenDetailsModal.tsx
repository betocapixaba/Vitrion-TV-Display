import React from 'react';
import {
  X,
  Tv2,
  Calendar,
  Building2,
  MapPin,
  Monitor,
  Edit2,
  Info,
  CheckCircle,
  Clock,
  Radio,
} from 'lucide-react';
import { AdminScreenRecord } from '../../../types/admin';

export interface ScreenDetailsModalProps {
  isOpen: boolean;
  screen: AdminScreenRecord | null;
  onClose: () => void;
  onEdit: (screen: AdminScreenRecord) => void;
}

export function ScreenDetailsModal({
  isOpen,
  screen,
  onClose,
  onEdit,
}: ScreenDetailsModalProps) {
  if (!isOpen || !screen) return null;

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('pt-BR');
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = () => {
    switch (screen.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ativa (Pronta)
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Pendente de Pareamento
          </span>
        );
      case 'offline_demo':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Demonstração Offline
          </span>
        );
    }
  };

  const getRecordTypeBadge = () => {
    switch (screen.recordType) {
      case 'current_device':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Monitor className="w-3.5 h-3.5" />
            Este Navegador (TV Local)
          </span>
        );
      case 'demo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Demonstração / Exemplo
          </span>
        );
      case 'custom_local':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30">
            Local Administrativo
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="details-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-xl bg-[#0f131f] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#141927]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Tv2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="details-modal-title" className="text-base font-semibold text-white">
                {screen.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                ID: {screen.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status & Type Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {getStatusBadge()}
            {getRecordTypeBadge()}
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-[#090b11] border border-slate-800/80">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Código de Pareamento
              </span>
              <div className="mt-1 font-mono text-base font-bold text-sky-400 tracking-wide">
                {screen.pairingCode}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090b11] border border-slate-800/80">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Estabelecimento
              </span>
              <div className="mt-1 text-sm font-semibold text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>{screen.establishmentName}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090b11] border border-slate-800/80">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Localização Física
              </span>
              <div className="mt-1 text-xs text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>{screen.locationNotes || 'Não especificada'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090b11] border border-slate-800/80">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Especificações de Exibição
              </span>
              <div className="mt-1 text-xs text-slate-300">
                {screen.resolution || '1920x1080'} •{' '}
                {screen.orientation === 'portrait' ? 'Vertical' : 'Horizontal'} •{' '}
                {screen.platform || 'browser'}
              </div>
            </div>
          </div>

          {/* Telemetry transparency notice */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-sky-400 font-medium">
              <Radio className="w-4 h-4" />
              <span>Status de Telemetria e Sincronização</span>
            </div>
            <p className="text-slate-300 text-xs">
              {screen.telemetryNotice}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              * Nesta versão, a telemetria não recebe dados ao vivo de rede ou CPU da TV física.
              Todos os parâmetros são salvos de forma isolada em <code>vitrion_admin_screens_v1</code>.
            </p>
          </div>

          {/* Timestamps */}
          <div className="text-[11px] text-slate-400 flex flex-col sm:flex-row gap-2 sm:gap-6 pt-2 border-t border-slate-800/60">
            <div>Cadastrado em: {formatDate(screen.createdAt)}</div>
            <div>Última alteração: {formatDate(screen.updatedAt)}</div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#141927] border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(screen);
            }}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            <span>Editar Tela</span>
          </button>
        </div>
      </div>
    </div>
  );
}
