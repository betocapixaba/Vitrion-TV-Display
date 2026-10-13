import React, { useState } from 'react';
import { Tv, Wifi, WifiOff, HardDrive, RefreshCw, Play, CheckCircle2, Monitor } from 'lucide-react';
import { DisplayDevice } from '../../types/display';

interface ActivationScreenProps {
  device: DisplayDevice;
  isOnline: boolean;
  onActivate: (customName?: string) => Promise<void>;
  onRegenerateCode: () => void;
  onOpenDiagnostics: () => void;
}

export const ActivationScreen: React.FC<ActivationScreenProps> = ({
  device,
  isOnline,
  onActivate,
  onRegenerateCode,
  onOpenDiagnostics,
}) => {
  const [isActivating, setIsActivating] = useState(false);
  const [customName, setCustomName] = useState(device.name || 'TV Salão Principal');

  const handleActivateClick = async () => {
    setIsActivating(true);
    try {
      await onActivate(customName);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="relative w-full min-h-full bg-[#07090e] text-slate-100 flex flex-col justify-between p-8 sm:p-14 select-none font-sans">
      {/* Background glow ambiance */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Tv className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">VITRION</h1>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                TV Display
              </span>
            </div>
            <p className="text-xs text-slate-400">Player de Sinalização Digital Contínua</p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center space-x-3 text-sm">
          <div
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md transition-colors ${
              isOnline
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
            }`}
          >
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span className="text-xs font-medium">{isOnline ? 'Rede Conectada' : 'Modo Offline Ativo'}</span>
          </div>

          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300">
            <HardDrive className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-medium">Cache IndexedDB Pronto</span>
          </div>
        </div>
      </header>

      {/* Main Activation Card */}
      <main className="relative z-10 max-w-4xl mx-auto w-full my-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs tracking-wider uppercase mb-6">
          <Monitor className="w-3.5 h-3.5 text-sky-400" />
          <span>Configuração Inicial do Dispositivo</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight max-w-2xl leading-tight">
          Conecte esta TV ao seu painel Vitrion
        </h2>
        <p className="text-slate-400 text-base sm:text-lg mt-3 max-w-xl">
          Para vincular esta televisão à sua conta e começar a exibir playlists e campanhas, utilize o código abaixo:
        </p>

        {/* Large 10ft TV Activation Code Box */}
        <div className="mt-8 mb-6 p-1.5 rounded-2xl bg-gradient-to-r from-sky-500/40 via-blue-500/20 to-indigo-500/40 backdrop-blur-xl border border-sky-400/30 shadow-2xl shadow-sky-950/50">
          <div className="px-10 py-6 rounded-xl bg-slate-950/90 flex flex-col items-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1">
              Código de Ativação da TV
            </span>
            <div className="text-5xl sm:text-6xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-white to-sky-200 tracking-widest py-1">
              {device.pairingCode}
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Aguardando autorização da central...</span>
            </div>
          </div>
        </div>

        {/* Steps Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mt-2 text-left">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-sm mb-2.5">
              1
            </div>
            <h4 className="text-sm font-semibold text-white">Acesse o Painel</h4>
            <p className="text-xs text-slate-400 mt-1">
              Pelo computador ou celular, abra seu gerenciador de telas Vitrion.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-sm mb-2.5">
              2
            </div>
            <h4 className="text-sm font-semibold text-white">Insira o Código</h4>
            <p className="text-xs text-slate-400 mt-1">
              Digite <span className="text-sky-300 font-mono font-semibold">{device.pairingCode}</span> na aba "Nova Tela".
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-sm mb-2.5">
              3
            </div>
            <h4 className="text-sm font-semibold text-white">Reprodução Automática</h4>
            <p className="text-xs text-slate-400 mt-1">
              O conteúdo será baixado no cache local e começará em loop contínuo.
            </p>
          </div>
        </div>

        {/* Fast Action Buttons for Fire TV Testing */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <button
            onClick={handleActivateClick}
            disabled={isActivating}
            className="flex items-center space-x-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-sky-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-4 focus:ring-sky-500/50"
          >
            {isActivating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>Ativar & Iniciar Player (Demonstração)</span>
          </button>

          <button
            onClick={onRegenerateCode}
            className="flex items-center space-x-2 px-4 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-medium text-sm transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Gerar Novo Código</span>
          </button>

          <button
            onClick={onOpenDiagnostics}
            className="flex items-center space-x-2 px-4 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium text-sm transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <Monitor className="w-4 h-4 text-sky-400" />
            <span>Diagnóstico do Player</span>
          </button>
        </div>
      </main>

      {/* Footer Info / Hardware metadata */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between text-xs text-slate-500 border-t border-slate-800/60 pt-4 mt-6">
        <div className="flex items-center space-x-4">
          <span>
            Dispositivo:{' '}
            <strong className="text-slate-400 uppercase">{device.platform}</strong>
          </span>
          <span>•</span>
          <span>
            ID do Hardware: <span className="font-mono text-slate-400">{device.id.slice(0, 16)}...</span>
          </span>
          <span>•</span>
          <span>
            Resolução: <span className="text-slate-400">{device.resolution.width}x{device.resolution.height}</span>
          </span>
        </div>

        <div className="flex items-center space-x-2 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Vitrion TV Display v1.0.0 • Fire TV Ready</span>
        </div>
      </footer>
    </div>
  );
};
