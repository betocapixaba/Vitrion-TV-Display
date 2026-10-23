/**
 * Playback Engine Core for Vitrion TV Display
 * Handles schedule checks, seamless loop progression, failover protection,
 * and dual-buffer transitions.
 */

import { Playlist, PlaylistItem, PlaybackSchedule } from '../../types/display';
import { idbService, PlayerState } from '../storage/indexedDb';
import { DEFAULT_OFFLINE_PLAYLIST } from './defaultPlaylist';

export function isItemActiveNow(schedule?: PlaybackSchedule): boolean {
  if (!schedule || !schedule.enabled) return true;

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday...
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const hasDayRestriction = !!schedule.daysOfWeek?.length;
  const isAllowedDay = (day: number) => !hasDayRestriction || schedule.daysOfWeek!.includes(day);

  if (schedule.startTime && schedule.endTime) {
    const isOvernightWindow = schedule.startTime > schedule.endTime;
    const isInsideWindow = isOvernightWindow
      ? currentTime >= schedule.startTime || currentTime <= schedule.endTime
      : currentTime >= schedule.startTime && currentTime <= schedule.endTime;

    if (!isInsideWindow) return false;

    // For overnight windows after midnight, the schedule belongs to the previous day's start.
    if (isOvernightWindow && currentTime <= schedule.endTime) {
      const previousDay = (currentDay + 6) % 7;
      return isAllowedDay(previousDay);
    }

    return isAllowedDay(currentDay);
  }

  return isAllowedDay(currentDay);
}

export function getActivePlaylistItems(playlist: Playlist): PlaylistItem[] {
  if (!playlist || !playlist.items || playlist.items.length === 0) {
    return DEFAULT_OFFLINE_PLAYLIST.items;
  }

  const active = playlist.items.filter((item) => isItemActiveNow(item.schedule));

  // Nenhum item está programado para o momento: o Player deve entrar em standby,
  // sem exibir conteúdo fora da janela horária aprovada.
  if (active.length === 0) {
    return [];
  }

  return active.sort((a, b) => a.order - b.order);
}

/**
 * Resultado da resolução do estado de inicialização e recuperação
 */
export interface PlaybackResolution {
  /** Lista de itens ativos para o horário atual */
  activeItems: PlaylistItem[];
  /** Índice inicial seguro (restaurado ou primeiro item válido) */
  initialIndex: number;
  /** Item recuperado se a recuperação for bem-sucedida */
  recoveredItem: PlaylistItem | null;
  /** Indica se a reprodução foi retomada do estado salvo */
  isRecovered: boolean;
  /** Motivo da decisão tomada */
  reason: string;
}

/**
 * Resolve o estado inicial do Player respeitando o estado persistido e a programação horária.
 * Garante que nunca trave em tela vazia ou execute itens fora da janela horária ativa.
 */
export function resolveInitialPlaybackState(
  playlist: Playlist,
  savedState: PlayerState | null
): PlaybackResolution {
  const activeItems = getActivePlaylistItems(playlist);

  if (activeItems.length === 0) {
    return {
      activeItems: [],
      initialIndex: 0,
      recoveredItem: null,
      isRecovered: false,
      reason: 'Nenhum item está ativo no horário atual; Player em standby até a próxima janela programada.',
    };
  }

  // Se não houver estado salvo ou pertencer a outra playlist
  if (!savedState || savedState.activePlaylistId !== playlist.id) {
    return {
      activeItems,
      initialIndex: 0,
      recoveredItem: null,
      isRecovered: false,
      reason: !savedState
        ? 'Nenhum estado prévio encontrado; iniciando do primeiro item.'
        : `Estado salvo pertence a outra playlist (${savedState.activePlaylistId}); iniciando do primeiro item da playlist atual.`,
    };
  }

  // Verifica se o item salvo está na lista de itens ativos no horário atual
  // Busca prioritariamente pelo ID da mídia para segurança caso a ordem tenha sido alterada
  const activeIndex = activeItems.findIndex((item) => item.id === savedState.currentMediaId);

  if (activeIndex !== -1) {
    const item = activeItems[activeIndex];
    return {
      activeItems,
      initialIndex: activeIndex,
      recoveredItem: item,
      isRecovered: true,
      reason: `Item '${item.name}' (ID: ${item.id}) recuperado na posição ${activeIndex + 1} de ${activeItems.length}.`,
    };
  }

  // O item salvo não está mais ativo na programação horária do momento
  return {
    activeItems,
    initialIndex: 0,
    recoveredItem: null,
    isRecovered: false,
    reason: `Item salvo '${savedState.currentMediaId}' não pertence à programação ativa para o horário atual; iniciando no primeiro item ativo disponível.`,
  };
}

/**
 * Preloads image into browser memory so transitions are instantaneous
 * and flicker-free on Fire TV Silk browser / webview.
 */
export function preloadMedia(item: PlaylistItem): Promise<boolean> {
  return new Promise((resolve) => {
    if (item.type === 'image') {
      const img = new Image();
      img.src = item.url;
      img.onload = () => resolve(true);
      img.onerror = () => {
        if (item.fallbackUrl) {
          const fallback = new Image();
          fallback.src = item.fallbackUrl;
          fallback.onload = () => resolve(true);
          fallback.onerror = () => resolve(false);
        } else {
          resolve(false);
        }
      };
      // Timeout after 6 seconds so slow connections don't block rotation
      setTimeout(() => resolve(false), 6000);
    } else {
      // For video, resolve immediately as HTML5 video element handles internal buffering
      resolve(true);
    }
  });
}

/**
 * Retrieves the active playlist from IndexedDB or initializes with default fallback
 */
export async function loadActivePlaylist(playlistId?: string): Promise<Playlist> {
  try {
    if (playlistId) {
      const stored = await idbService.getPlaylist(playlistId);
      if (stored && stored.items && stored.items.length > 0) {
        return stored;
      }
    }

    // Check if active_playlist exists in config
    const activeFromConfig = await idbService.getConfig<Playlist>('active_playlist');
    if (activeFromConfig && activeFromConfig.items && activeFromConfig.items.length > 0) {
      return activeFromConfig;
    }

    // Check all stored playlists
    const all = await idbService.getAllPlaylists();
    if (all.length > 0 && all[0].items && all[0].items.length > 0) {
      return all[0];
    }
  } catch (err) {
    console.error('[Vitrion Engine] Error loading stored playlist:', err);
  }

  // Save default playlist to storage so it is persisted for future offline boots
  await idbService.savePlaylist(DEFAULT_OFFLINE_PLAYLIST);
  await idbService.setConfig('active_playlist', DEFAULT_OFFLINE_PLAYLIST);

  return DEFAULT_OFFLINE_PLAYLIST;
}
