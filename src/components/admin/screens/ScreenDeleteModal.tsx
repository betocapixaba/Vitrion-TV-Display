import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { AdminScreenRecord } from '../../../types/admin';

export interface ScreenDeleteModalProps {
  isOpen: boolean;
  screen: AdminScreenRecord | null;
  onClose: () => void;
  onConfirm: (screenId: string) => void;
}

export function ScreenDeleteModal({
  isOpen,
  screen,
  onClose,
  onConfirm,
}: ScreenDeleteModalProps) {
  if (!isOpen || !screen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md bg-[#0f131f] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 id="delete-modal-title" className="text-base font-semibold text-white">
              Remover Tela do Painel?
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Você está prestes a remover o registro administrativo da tela:
            </p>
            <div className="mt-3 p-3 rounded-lg bg-[#090b11] border border-slate-800 text-xs space-y-1">
              <div className="font-semibold text-white">{screen.name}</div>
              <div className="text-slate-400">
                Código:{' '}
                <span className="font-mono text-sky-400">{screen.pairingCode}</span>
              </div>
              <div className="text-slate-400">
                Estabelecimento:{' '}
                <span className="text-slate-300">{screen.establishmentName}</span>
              </div>
            </div>
            <p className="text-[11px] text-amber-400/90 mt-3 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              Aviso: Esta ação remove apenas os metadados do painel administrativo deste navegador
              (<code>vitrion_admin_screens_v1</code>). A TV física e suas mídias offline não serão afetadas.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(screen.id);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Confirmar Remoção</span>
          </button>
        </div>
      </div>
    </div>
  );
}
