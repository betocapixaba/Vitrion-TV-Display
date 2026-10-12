import React, { useState, useEffect } from 'react';
import {
  X,
  Tv,
  Wifi,
  WifiOff,
  HardDrive,
  Activity,
  RotateCcw,
  SkipForward,
  Maximize2,
  Trash2,
  ShieldCheck,
  Clock,
  Layers,
  Cpu,
  Download,
  CheckCircle2,
  CloudDownload,
  AlertCircle,
} from 'lucide-react';
import { DisplayDevice, Playlist, TelemetryState } from '../../types/display';
import { idbService } from '../../core/storage/indexedDb';
import { mediaCacheService, CacheProgress } from '../../core/storage/mediaCacheService';
import { toggleFullscreen } from '../../core/device/screenLock';

interface DiagnosticOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  device: DisplayDevice;
  activePlaylist: Playlist | null;
  telemetry: TelemetryState;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  onForceNextItem: () => void;
  onReloadFromCache: () => Promise<void>;
  onUnpair: () => Promise<void>;
}

export const DiagnosticOverlay: React.FC<DiagnosticOverlayProps> = ({
  isOpen,
  onClose,
  device,
  activePlaylist,
  telemetry,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  onForceNextItem,
  onReloadFromCache,
  onUnpair,
}) => {
  const [cacheStats, setCacheStats] = useState<{ cachedMediaCount: number; estimatedBytes: number }>({
    cachedMediaCount: 0,
    estimatedBytes: 0,
  });
  const [cacheProgress, setCacheProgress] = useState<CacheProgress>(mediaCacheService.getProgress());
  const [cachedItemsMap, setCachedItemsMap] = useState<Record<string, { sizeBytes: number; cachedAt: string }>>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'status' | 'storage' | 'remote'>('status');

  useEffect(() => {
    if (!isOpen) return;
    const unsub = mediaCacheService.subscribe((progress) => {
      setCacheProgress(progress);
    });
    return unsub;
  }, [isOpen]);

  const refreshStorageDetails = async () => {
    const stats = await idbService.getStorageStats();
    setCacheStats(stats);

    if (activePlaylist?.items) {
      const map: Record<string, { sizeBytes: number; cachedAt: string }> = {};
      for (const item of activePlaylist.items) {
        const info = await idbService.getCachedMediaInfo(item.id);
        if (info) {
          map[item.id] = { sizeBytes: info.sizeBytes, cachedAt: info.cachedAt };
        }
      }
      setCachedItemsMap(map);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStorageDetails();
    }
  }, [isOpen, activePlaylist, cacheProgress.cachedCount]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>Vitrion TV Display • Diagnóstico do Player</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  {device.platform}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Pressione 'M' ou toque em Fechar para ocultar</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              activeTab === 'status'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Status do Sistema
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              activeTab === 'storage'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Cache Local IndexedDB
          </button>
          <button
            onClick={() => setActiveTab('remote')}
            className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              activeTab === 'remote'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Controles & Testes Fire TV
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {activeTab === 'status' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Device Profile Card */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-sky-400 font-semibold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Identidade do Dispositivo</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Nome:</span>
                    <span className="font-medium text-white">{device.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Código de Pareamento:</span>
                    <span className="font-mono font-bold text-sky-400 text-sm">{device.pairingCode}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Status de Ativação:</span>
                    <span className={`font-semibold ${device.isActivated ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {device.isActivated ? 'Ativado & Operacional' : 'Aguardando Pareamento'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">ID Único (UUID):</span>
                    <span className="font-mono text-slate-300 text-[11px] truncate max-w-[200px]" title={device.id}>
                      {device.id}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Resolução do Display:</span>
                    <span className="text-slate-300">
                      {device.resolution.width} x {device.resolution.height} (DPR: {device.resolution.pixelRatio})
                    </span>
                  </div>
                </div>
              </div>

              {/* Playback & Heartbeat State */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-sky-400 font-semibold text-xs uppercase tracking-wider">
                  <Activity className="w-4 h-4" />
                  <span>Métricas de Reprodução & Heartbeat</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Status de Conectividade:</span>
                    <span
                      className={`inline-flex items-center space-x-1.5 font-semibold ${
                        telemetry.isOnline ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {telemetry.isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                      <span>{telemetry.isOnline ? 'Online (Pronto para Sync)' : 'Offline (Modo Cache Seguro)'}</span>
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Tempo Ativo (Uptime):</span>
                    <span className="font-mono text-white font-medium">{formatUptime(telemetry.uptimeSeconds)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Último Heartbeat:</span>
                    <span className="text-slate-300">
                      {telemetry.lastHeartbeatSent ? new Date(telemetry.lastHeartbeatSent).toLocaleTimeString() : 'Nenhum'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Item em Exibição:</span>
                    <span className="font-medium text-sky-300 truncate max-w-[200px]">
                      {activePlaylist?.items[telemetry.currentItemIndex]?.name || 'N/A'} (Índice {telemetry.currentItemIndex + 1}/{activePlaylist?.items.length || 0})
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Total de Ciclos / Loops:</span>
                    <span className="text-emerald-400 font-bold">{telemetry.totalPlayCount}</span>
                  </div>
                </div>
              </div>

              {/* Active Playlist Card */}
              <div className="md:col-span-2 p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sky-400 font-semibold text-xs uppercase tracking-wider">
                    <Layers className="w-4 h-4" />
                    <span>Playlist Ativa na Memória</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Total de Itens: <strong className="text-white">{activePlaylist?.items.length || 0}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {activePlaylist?.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-colors ${
                        idx === telemetry.currentItemIndex
                          ? 'bg-sky-950/40 border-sky-500/60 shadow-md shadow-sky-950/50'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-300">#{item.order}</span>
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.type}
                        </span>
                      </div>
                      <span className="font-medium text-white truncate mb-1">{item.name}</span>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{item.durationSeconds}s</span>
                        </span>
                        {idx === telemetry.currentItemIndex && (
                          <span className="text-sky-400 font-bold animate-pulse text-[10px]">TOCANDO AGORA</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-sky-400" />
                    <span>Banco de Dados Local (IndexedDB) & Cache Offline</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Garante funcionamento 100% offline e reprodução imediata de imagens e vídeos baixados localmente.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Espaço Utilizado:</span>
                  <p className="text-base font-bold text-sky-400 font-mono">{formatBytes(cacheStats.estimatedBytes)}</p>
                </div>
              </div>

              {/* Status da Fila de Downloads */}
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${cacheProgress.isDownloading ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {cacheProgress.isDownloading ? <CloudDownload className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {cacheProgress.isDownloading
                        ? `Baixando mídias em segundo plano (Item: ${cacheProgress.currentItemId || '...'})`
                        : cacheStats.cachedMediaCount > 0
                        ? 'Fila de download ociosa — Mídias salvas localmente'
                        : 'Aguardando download de mídias para funcionamento offline'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {cacheProgress.lastError ? (
                        <span className="text-rose-400">Aviso: {cacheProgress.lastError}</span>
                      ) : (
                        `Fila: ${cacheProgress.totalItems} tarefas • Concluídos: ${cacheStats.cachedMediaCount}`
                      )}
                    </div>
                  </div>
                </div>

                {activePlaylist?.items && (
                  <button
                    disabled={isSyncing}
                    onClick={async () => {
                      setIsSyncing(true);
                      mediaCacheService.forceSyncPlaylist(activePlaylist.items, telemetry.currentItemIndex);
                      setTimeout(async () => {
                        await refreshStorageDetails();
                        setIsSyncing(false);
                      }, 1000);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isSyncing ? 'Iniciando...' : 'Baixar Mídias Agora'}</span>
                  </button>
                )}
              </div>

              {/* Métricas do Cache */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="text-xs text-slate-400">Itens em Cache Offline</span>
                  <p className="text-2xl font-bold text-white mt-1">{cacheStats.cachedMediaCount}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="text-xs text-slate-400">Status do Banco IndexedDB</span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">Ativo (v1)</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="text-xs text-slate-400">Proteção Anti-Tela Branca</span>
                  <p className="text-2xl font-bold text-sky-400 mt-1">Ativada</p>
                </div>
              </div>

              {/* Lista Detalhada de Mídias e Status no Cache */}
              {activePlaylist?.items && activePlaylist.items.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Mídias da Playlist & Armazenamento Local</span>
                    <span className="text-slate-400 normal-case font-normal text-[11px]">
                      {Object.keys(cachedItemsMap).length} de {activePlaylist.items.length} armazenados
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {activePlaylist.items.map((item) => {
                      const cachedInfo = cachedItemsMap[item.id];
                      const isCached = !!cachedInfo;
                      const isCurrentlyDownloading = cacheProgress.currentItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center space-x-2.5 truncate max-w-[65%]">
                            <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 font-bold text-slate-300">
                              {item.type}
                            </span>
                            <span className="font-medium text-white truncate" title={item.name}>
                              {item.name}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {isCurrentlyDownloading ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                <CloudDownload className="w-3 h-3" />
                                <span>Baixando...</span>
                              </span>
                            ) : isCached ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Cache Local ({formatBytes(cachedInfo.sizeBytes)})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                <AlertCircle className="w-3 h-3" />
                                <span>Pendente / Remoto</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botões de Ação de Manutenção */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={async () => {
                    await onReloadFromCache();
                    await refreshStorageDetails();
                  }}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-sky-400" />
                  <span>Recarregar do IndexedDB</span>
                </button>

                <button
                  onClick={async () => {
                    await idbService.clearAllCache();
                    mediaCacheService.clearQueue();
                    await refreshStorageDetails();
                  }}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Limpar Cache de Mídias</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'remote' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-4">
                <h4 className="font-bold text-white flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span>Simulador de Condições Fire TV</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Permite validar em bancada ou diretamente no Fire TV como o Player reage à perda de conexão,
                  quedas de energia e comandos remotos.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Offline Simulation Toggle */}
                  <button
                    onClick={onToggleSimulatedOffline}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      isSimulatedOffline
                        ? 'bg-amber-950/50 border-amber-600/80 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {isSimulatedOffline ? (
                        <WifiOff className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Wifi className="w-4 h-4 text-emerald-400" />
                      )}
                      <div className="text-left">
                        <div className="font-bold">
                          {isSimulatedOffline ? 'Modo Offline: ATIVO' : 'Modo Offline: DESATIVADO'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {isSimulatedOffline ? 'Simulando perda de internet' : 'Internet normal'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300">
                      Alternar
                    </span>
                  </button>

                  {/* Skip Slide Button */}
                  <button
                    onClick={onForceNextItem}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <SkipForward className="w-4 h-4 text-sky-400" />
                      <div className="text-left">
                        <div className="font-bold">Pular para Próximo Item</div>
                        <div className="text-[11px] text-slate-400">Avança o loop imediatamente</div>
                      </div>
                    </div>
                  </button>

                  {/* Fullscreen Toggle */}
                  <button
                    onClick={() => toggleFullscreen()}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Maximize2 className="w-4 h-4 text-emerald-400" />
                      <div className="text-left">
                        <div className="font-bold">Alternar Tela Cheia</div>
                        <div className="text-[11px] text-slate-400">Ideal para TV Kiosk Mode</div>
                      </div>
                    </div>
                  </button>

                  {/* Unpair Device */}
                  <button
                    onClick={onUnpair}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 hover:bg-rose-900/40 text-rose-200 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <RotateCcw className="w-4 h-4 text-rose-400" />
                      <div className="text-left">
                        <div className="font-bold">Desparelhar TV</div>
                        <div className="text-[11px] text-rose-400/80">Retorna à tela com código de pareamento</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Fire TV Remote Keyboard Navigation Guide */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                  Atalhos de Controle Remoto / Teclado
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-sky-400">M</kbd> ou <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-sky-400">Menu</kbd>
                    <p className="text-[11px] text-slate-400 mt-1">Abre/Fecha Diagnóstico</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-sky-400">Espaço</kbd> ou <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-sky-400">→</kbd>
                    <p className="text-[11px] text-slate-400 mt-1">Avançar Mídia</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-sky-400">F</kbd>
                    <p className="text-[11px] text-slate-400 mt-1">Tela Cheia (Fullscreen)</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-sky-400">Esc</kbd>
                    <p className="text-[11px] text-slate-400 mt-1">Fechar Diálogo</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Pressione qualquer tecla ou clique fora para continuar reproduzindo</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer transition-colors"
          >
            Voltar ao Player
          </button>
        </div>
      </div>
    </div>
  );
};
