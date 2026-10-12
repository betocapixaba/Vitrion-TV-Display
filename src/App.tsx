/**
 * Vitrion TV Display - Main Application
 * Digital Signage Player for Amazon Fire TV & Smart TVs.
 * Built with React, TypeScript, IndexedDB offline cache, and modular cloud sync.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DisplayDevice, Playlist, PlaylistItem, TelemetryState } from './types/display';
import { getOrCreateDeviceProfile, saveDeviceProfile, generatePairingCode } from './core/device/deviceId';
import {
  loadActivePlaylist,
  getActivePlaylistItems,
  preloadMedia,
  resolveInitialPlaybackState,
} from './core/player/playerEngine';
import {
  idbService,
  PlayerState,
  CURRENT_PLAYER_STATE_SCHEMA_VERSION,
} from './core/storage/indexedDb';
import { mediaCacheService } from './core/storage/mediaCacheService';
import { syncAdapter, HeartbeatPayload } from './core/sync/syncAdapter';
import { requestScreenWakeLock, releaseScreenWakeLock, initCursorAutoHider, toggleFullscreen } from './core/device/screenLock';
import { ActivationScreen } from './components/activation/ActivationScreen';
import { DisplayScreen } from './components/player/DisplayScreen';
import { DiagnosticOverlay } from './components/hud/DiagnosticOverlay';
import { StatusBar } from './components/hud/StatusBar';

export default function App() {
  const [device, setDevice] = useState<DisplayDevice | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [activeItems, setActiveItems] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isRealOnline, setIsRealOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [telemetry, setTelemetry] = useState<TelemetryState>({
    isOnline: true,
    uptimeSeconds: 0,
    currentItemIndex: 0,
    currentItemId: '',
    totalPlayCount: 0,
    errorsCount: 0,
    lastError: null,
    lastHeartbeatSent: null,
    lastSyncAttempt: null,
    cachedItemsCount: 0,
    storageUsageBytes: 0,
  });

  const timerRef = useRef<number | null>(null);
  const isOnlineComputed = !isSimulatedOffline && isRealOnline;

  // Ref para controle de persistência de estado (evita gravações redundantes ou loops)
  const lastSavedStateRef = useRef<{ playlistId: string; itemId: string; index: number } | null>(null);

  // Track latest reactive values in ref to avoid re-creating intervals or loops
  const stateRef = useRef({
    device,
    playlist,
    activeItems,
    currentIndex,
    isOnlineComputed,
  });
  stateRef.current = {
    device,
    playlist,
    activeItems,
    currentIndex,
    isOnlineComputed,
  };

  // 1. Initial Device Boot & Storage Hydration
  useEffect(() => {
    // Acquire TV wake lock
    requestScreenWakeLock();
    const cleanupCursor = initCursorAutoHider();

    // Re-acquire wake lock on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestScreenWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Network listeners
    const handleOnline = () => {
      setIsRealOnline(true);
      mediaCacheService.resumeQueue();
    };
    const handleOffline = () => {
      setIsRealOnline(false);
      mediaCacheService.pauseQueue();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Boot device profile and playlist with state recovery
    const bootPlayer = async () => {
      try {
        // 1. Recupera ou cria perfil da TV
        const loadedDevice = await getOrCreateDeviceProfile();
        setDevice(loadedDevice);

        // 2. Consulta estado persistente previamente salvo
        const savedPlayerState = await idbService.getPlayerState();

        // 3. Carrega a playlist aplicável (usando activePlaylistId do estado salvo quando disponível)
        // Correção Tarefa 1: Não usa loadedDevice.id como playlistId
        const targetPlaylistId = savedPlayerState?.activePlaylistId;
        const loadedPlaylist = await loadActivePlaylist(targetPlaylistId);
        setPlaylist(loadedPlaylist);

        // 4. Resolve o estado de reprodução inicial (Tarefas 2 e 4: validação e programação horária)
        const resolution = resolveInitialPlaybackState(loadedPlaylist, savedPlayerState);
        setActiveItems(resolution.activeItems);
        setCurrentIndex(resolution.initialIndex);

        // Preload do item inicial resolvido
        if (resolution.activeItems.length > 0 && resolution.activeItems[resolution.initialIndex]) {
          preloadMedia(resolution.activeItems[resolution.initialIndex]);
        }

        // 5. Inicia fila sequencial de download de mídias em segundo plano sem bloquear a reprodução.
        // Usa a lista completa da playlist para cobrir mídias futuras e calcula o índice pelo item inicial.
        const initialActiveItem = resolution.activeItems[resolution.initialIndex];
        const initialPlaylistIdx = initialActiveItem
          ? loadedPlaylist.items.findIndex((item) => item.id === initialActiveItem.id)
          : 0;
        mediaCacheService.syncPlaylist(
          loadedPlaylist.items,
          initialPlaylistIdx >= 0 ? initialPlaylistIdx : 0
        );

        if (savedPlayerState) {
          console.log('[Vitrion App] Inicialização do Player com recuperação:', resolution.reason);
        }
      } catch (err) {
        console.error('[Vitrion App] Boot error:', err);
        // Fallback seguro em caso de exceção inesperada
        const fallbackPlaylist = await loadActivePlaylist();
        setPlaylist(fallbackPlaylist);
        const fallbackItems = getActivePlaylistItems(fallbackPlaylist);
        setActiveItems(fallbackItems);
        setCurrentIndex(0);
        mediaCacheService.syncPlaylist(fallbackPlaylist.items, 0);
      }
    };

    bootPlayer();

    return () => {
      releaseScreenWakeLock();
      cleanupCursor();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Playback Item Advance Logic (Pure index increment)
  const advanceToNextItem = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      const items = stateRef.current.activeItems;
      if (items.length === 0) return 0;
      return (prevIndex + 1) % items.length;
    });
  }, []);

  // 2b. Sync Telemetry, Save Player State & Preload Buffer on Item Change
  useEffect(() => {
    if (activeItems.length === 0 || !playlist) return;
    const cur = activeItems[currentIndex];
    if (!cur) return;

    // 1. Atualização segura da telemetria
    setTelemetry((prev) => {
      if (prev.currentItemIndex === currentIndex && prev.currentItemId === cur.id) {
        return prev;
      }
      return {
        ...prev,
        currentItemIndex: currentIndex,
        currentItemId: cur.id,
        totalPlayCount: currentIndex === 0 && prev.uptimeSeconds > 5 ? prev.totalPlayCount + 1 : prev.totalPlayCount,
      };
    });

    // 2. Persistência de mudança efetiva de item de reprodução (Tarefa 3)
    // Evita gravações excessivas ou redundantes caso já tenha sido salvo para este item e playlist
    if (
      device?.isActivated &&
      (lastSavedStateRef.current?.itemId !== cur.id ||
        lastSavedStateRef.current?.index !== currentIndex ||
        lastSavedStateRef.current?.playlistId !== playlist.id)
    ) {
      const now = new Date().toISOString();
      lastSavedStateRef.current = {
        playlistId: playlist.id,
        itemId: cur.id,
        index: currentIndex,
      };

      const stateToPersist: PlayerState = {
        schemaVersion: CURRENT_PLAYER_STATE_SCHEMA_VERSION,
        activePlaylistId: playlist.id,
        currentItemIndex: currentIndex,
        currentMediaId: cur.id,
        playbackStartedAt: now,
        savedAt: now,
        playlistVersion: playlist.version,
      };

      idbService.savePlayerState(stateToPersist).catch((err) => {
        console.warn('[Vitrion App] Falha não impeditiva ao persistir estado do Player:', err);
      });
    }

    // 3. Pré-carregamento do buffer do próximo item
    const nextIdx = (currentIndex + 1) % activeItems.length;
    if (activeItems[nextIdx]) {
      preloadMedia(activeItems[nextIdx]);
    }

    // 4. Reprioriza fila de download para focar no item atual e próximos,
    // mantendo TODOS os itens da playlist completa (inclusive agendados para horários futuros)
    const allPlaylistItems = playlist?.items || [];
    if (allPlaylistItems.length > 0) {
      const currentActiveItem = activeItems[currentIndex];
      let playlistIndex = 0;
      if (currentActiveItem) {
        const foundIdx = allPlaylistItems.findIndex((it) => it.id === currentActiveItem.id);
        if (foundIdx >= 0) {
          playlistIndex = foundIdx;
        }
      }
      mediaCacheService.reprioritize(allPlaylistItems, playlistIndex);
    }
  }, [currentIndex, activeItems, playlist, device?.isActivated]);

  // 3. Playback Timer Controller
  useEffect(() => {
    if (!device?.isActivated || activeItems.length === 0) return;

    const currentItem = activeItems[currentIndex];
    if (!currentItem) return;

    // Clear any pending transition timer
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Advance automatically based on item duration
    const durationMs = (currentItem.durationSeconds || 10) * 1000;

    timerRef.current = window.setTimeout(() => {
      advanceToNextItem();
    }, durationMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [device?.isActivated, activeItems, currentIndex, advanceToNextItem]);

  // 4. Remote Control & D-pad Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Menu / Info key on TV remotes or 'm' on keyboard
      if (e.key === 'm' || e.key === 'M' || e.key === 'ContextMenu') {
        e.preventDefault();
        setIsDiagnosticOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsDiagnosticOpen(false);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if ((e.key === ' ' || e.key === 'ArrowRight') && !isDiagnosticOpen) {
        // Skip slide on remote right arrow
        advanceToNextItem();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDiagnosticOpen, advanceToNextItem]);

  // 5. Uptime & Heartbeat Periodic Loop (Decoupled, zero state thrashing)
  useEffect(() => {
    let uptimeTicks = 0;

    const interval = window.setInterval(() => {
      uptimeTicks += 1;
      const { device: curDev, playlist: curPl, activeItems: curItems, currentIndex: curIdx, isOnlineComputed: curOnline } = stateRef.current;

      setTelemetry((prev) => ({
        ...prev,
        uptimeSeconds: prev.uptimeSeconds + 1,
        isOnline: curOnline,
      }));

      // Emit heartbeat every 30 seconds and update storage telemetry
      if (curDev && uptimeTicks % 30 === 0) {
        idbService.getStorageStats().then((stats) => {
          setTelemetry((t) => ({
            ...t,
            cachedItemsCount: stats.cachedMediaCount,
            storageUsageBytes: stats.estimatedBytes,
          }));
        });

        const payload: HeartbeatPayload = {
          deviceId: curDev.id,
          pairingCode: curDev.pairingCode,
          name: curDev.name,
          isActivated: curDev.isActivated,
          platform: curDev.platform,
          timestamp: new Date().toISOString(),
          uptimeSeconds: uptimeTicks,
          currentPlaylistId: curPl?.id || 'none',
          currentItemId: curItems[curIdx]?.id || 'none',
          currentItemIndex: curIdx,
          isOnline: curOnline,
          screenResolution: `${window.innerWidth}x${window.innerHeight}`,
        };

        syncAdapter.sendHeartbeat(payload).then((success) => {
          if (success) {
            setTelemetry((t) => ({ ...t, lastHeartbeatSent: new Date().toISOString() }));
          }
        });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  // 6. Action Handlers
  const handleActivate = async (customName?: string) => {
    if (!device) return;
    await syncAdapter.activateDevice(device.id, device.pairingCode, customName);
    const updatedDevice: DisplayDevice = {
      ...device,
      name: customName || device.name,
      isActivated: true,
    };
    await saveDeviceProfile(updatedDevice);
    setDevice(updatedDevice);
  };

  const handleRegenerateCode = async () => {
    if (!device) return;
    const newCode = generatePairingCode();
    const updated = { ...device, pairingCode: newCode };
    await saveDeviceProfile(updated);
    setDevice(updated);
  };

  const handleUnpair = async () => {
    if (!device) return;
    await syncAdapter.unpairDevice(device.id);
    await idbService.clearPlayerState();
    lastSavedStateRef.current = null;
    const updated = { ...device, isActivated: false };
    await saveDeviceProfile(updated);
    setDevice(updated);
    setIsDiagnosticOpen(false);
  };

  const handleReloadFromCache = async () => {
    if (!device) return;
    const savedState = await idbService.getPlayerState();
    const targetPlaylistId = savedState?.activePlaylistId || playlist?.id;
    const reloadedPlaylist = await loadActivePlaylist(targetPlaylistId);
    setPlaylist(reloadedPlaylist);
    const resolution = resolveInitialPlaybackState(reloadedPlaylist, savedState);
    setActiveItems(resolution.activeItems);
    setCurrentIndex(resolution.initialIndex);
  };

  const handleItemError = useCallback((itemId: string, errorMsg: string) => {
    console.warn(`[Vitrion Player] Item error on ${itemId}:`, errorMsg);
    setTelemetry((prev) => {
      if (prev.lastError === errorMsg) return prev;
      return {
        ...prev,
        errorsCount: prev.errorsCount + 1,
        lastError: `${new Date().toLocaleTimeString()}: ${errorMsg}`,
      };
    });
  }, []);

  if (!device) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#07090e] text-slate-300">
        <div className="w-12 h-12 rounded-full border-2 border-sky-500 border-t-transparent animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-tight text-white">VITRION TV DISPLAY</h2>
        <p className="text-xs text-slate-400 mt-1">Inicializando armazenamento local IndexedDB...</p>
      </div>
    );
  }

  const currentItem = activeItems[currentIndex] || null;
  const nextItem = activeItems[(currentIndex + 1) % activeItems.length] || null;

  return (
    <div
      className={
        !device.isActivated
          ? 'relative w-full min-h-screen overflow-y-auto bg-[#07090e] text-white'
          : 'relative w-screen h-screen overflow-hidden bg-black text-white'
      }
    >
      {/* If TV is not yet paired/activated, show the TV activation interface */}
      {!device.isActivated ? (
        <ActivationScreen
          device={device}
          isOnline={isOnlineComputed}
          onActivate={handleActivate}
          onRegenerateCode={handleRegenerateCode}
          onOpenDiagnostics={() => setIsDiagnosticOpen(true)}
        />
      ) : (
        /* Once activated, show continuous digital signage loop */
        <div className="relative w-full h-full">
          <DisplayScreen
            currentItem={currentItem}
            nextItem={nextItem}
            transition={playlist?.transition || 'fade'}
            showClock={true}
            clockFormat="24h"
            onItemEnded={advanceToNextItem}
            onItemError={handleItemError}
          />

          <StatusBar
            isOnline={isOnlineComputed}
            totalItems={activeItems.length}
            currentIndex={currentIndex}
            onOpenDiagnostics={() => setIsDiagnosticOpen(true)}
          />
        </div>
      )}

      {/* 10-foot TV Diagnostic HUD */}
      <DiagnosticOverlay
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        device={device}
        activePlaylist={playlist}
        telemetry={telemetry}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={() => setIsSimulatedOffline((prev) => !prev)}
        onForceNextItem={advanceToNextItem}
        onReloadFromCache={handleReloadFromCache}
        onUnpair={handleUnpair}
      />
    </div>
  );
}
