/**
 * IndexedDB Storage Engine for Vitrion TV Display
 * Handles offline persistence, device config survival across reboots,
 * and media asset caching for uninterrupted digital signage playback.
 */

import { Playlist, PlayerConfig, PlaylistItem } from '../../types/display';

const DB_NAME = 'vitrion_tv_display_db';
const DB_VERSION = 1;

export const STORES = {
  CONFIG: 'config',
  PLAYLISTS: 'playlists',
  MEDIA_CACHE: 'media_cache',
  TELEMETRY: 'telemetry_logs',
} as const;

export const CURRENT_PLAYER_STATE_SCHEMA_VERSION = 1;

export const CONFIG_KEYS = {
  DEVICE_PROFILE: 'device_profile',
  ACTIVE_PLAYLIST: 'active_playlist',
  PLAYER_STATE: 'player_state',
} as const;

export const LOCAL_STORAGE_KEYS = {
  PLAYER_STATE: 'vitrion_player_state',
  CFG_PREFIX: 'vitrion_cfg_',
  PLAYLIST_PREFIX: 'vitrion_playlist_',
} as const;

/**
 * Interface que representa o estado persistente do Player
 * Utilizada para recuperação rápida após reinicialização do Fire TV, queda de energia ou perda de rede.
 */
export interface PlayerState {
  /** Versão do formato do estado salvo (ex: 1) */
  schemaVersion: number;
  /** Identificador da playlist ativa */
  activePlaylistId: string;
  /** Índice do item atual na playlist */
  currentItemIndex: number;
  /** Identificador do conteúdo/mídia atual */
  currentMediaId: string;
  /** Instante em que a reprodução do item começou (ISO string) */
  playbackStartedAt: string;
  /** Instante em que o estado foi salvo (ISO string) */
  savedAt: string;
  /** Horário da última sincronização bem-sucedida, quando disponível */
  lastSyncAt?: string;
  /** Versão da playlist utilizada, quando disponível */
  playlistVersion?: number;
  /** Posição aproximada dentro de um vídeo em segundos, quando aplicável */
  playbackPositionSeconds?: number;
}

/**
 * Resultado da validação e verificação de recuperação do estado de reprodução
 */
export interface PlaybackRecoveryResult {
  /** Indica se o estado salvo pode ser recuperado com conteúdo local válido */
  isRecoverable: boolean;
  /** Playlist correspondente recuperada localmente */
  playlist: Playlist | null;
  /** Item correspondente da playlist para retomar a reprodução */
  currentItem: PlaylistItem | null;
  /** Indica se a mídia do item atual está disponível no cache local offline */
  isMediaCachedLocally?: boolean;
  /** Descrição explicativa caso a recuperação não seja recomendada */
  reason?: string;
}

/**
 * Validador estrito do formato e integridade do PlayerState
 */
export function isValidPlayerState(state: unknown): state is PlayerState {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return false;
  }

  const candidate = state as Record<string, unknown>;

  // schemaVersion: número inteiro >= 1
  if (
    typeof candidate.schemaVersion !== 'number' ||
    !Number.isFinite(candidate.schemaVersion) ||
    candidate.schemaVersion < 1
  ) {
    return false;
  }

  // activePlaylistId: string não vazia
  if (typeof candidate.activePlaylistId !== 'string' || candidate.activePlaylistId.trim().length === 0) {
    return false;
  }

  // currentItemIndex: número inteiro >= 0
  if (
    typeof candidate.currentItemIndex !== 'number' ||
    !Number.isFinite(candidate.currentItemIndex) ||
    candidate.currentItemIndex < 0 ||
    !Number.isInteger(candidate.currentItemIndex)
  ) {
    return false;
  }

  // currentMediaId: string não vazia
  if (typeof candidate.currentMediaId !== 'string' || candidate.currentMediaId.trim().length === 0) {
    return false;
  }

  // savedAt: string contendo timestamp válido
  if (typeof candidate.savedAt !== 'string' || isNaN(Date.parse(candidate.savedAt))) {
    return false;
  }

  // playbackStartedAt: string contendo timestamp válido
  if (typeof candidate.playbackStartedAt !== 'string' || isNaN(Date.parse(candidate.playbackStartedAt))) {
    return false;
  }

  // Validação de campos opcionais se presentes
  if (candidate.lastSyncAt !== undefined) {
    if (typeof candidate.lastSyncAt !== 'string' || isNaN(Date.parse(candidate.lastSyncAt))) {
      return false;
    }
  }

  if (candidate.playlistVersion !== undefined) {
    if (
      typeof candidate.playlistVersion !== 'number' ||
      !Number.isFinite(candidate.playlistVersion) ||
      candidate.playlistVersion < 0
    ) {
      return false;
    }
  }

  if (candidate.playbackPositionSeconds !== undefined) {
    if (
      typeof candidate.playbackPositionSeconds !== 'number' ||
      !Number.isFinite(candidate.playbackPositionSeconds) ||
      candidate.playbackPositionSeconds < 0
    ) {
      return false;
    }
  }

  return true;
}

export interface MediaCacheRecord {
  id: string;
  url: string;
  blob?: Blob;
  mimeType: string;
  sizeBytes: number;
  cachedAt: string;
  lastAccessedAt: string;
}

class IndexedDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isAvailable: boolean = true;

  constructor() {
    this.checkAvailability();
  }

  private checkAvailability() {
    try {
      const hasIdb =
        (typeof window !== 'undefined' && 'indexedDB' in window && !!window.indexedDB) ||
        (typeof indexedDB !== 'undefined' && !!indexedDB);
      if (!hasIdb) {
        this.isAvailable = false;
        console.warn('[Vitrion IDB] IndexedDB not available, falling back to localStorage');
      } else {
        this.isAvailable = true;
      }
    } catch {
      this.isAvailable = false;
    }
  }

  public getDb(): Promise<IDBDatabase> {
    this.checkAvailability();
    if (!this.isAvailable) {
      return Promise.reject(new Error('IndexedDB not supported in this environment'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        try {
          const idbFactory =
            typeof window !== 'undefined' && window.indexedDB ? window.indexedDB : indexedDB;
          const request = idbFactory.open(DB_NAME, DB_VERSION);

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(STORES.CONFIG)) {
              db.createObjectStore(STORES.CONFIG, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(STORES.PLAYLISTS)) {
              db.createObjectStore(STORES.PLAYLISTS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.MEDIA_CACHE)) {
              const mediaStore = db.createObjectStore(STORES.MEDIA_CACHE, { keyPath: 'id' });
              mediaStore.createIndex('url', 'url', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORES.TELEMETRY)) {
              const teleStore = db.createObjectStore(STORES.TELEMETRY, { autoIncrement: true });
              teleStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
          };

          request.onsuccess = () => {
            resolve(request.result);
          };

          request.onerror = () => {
            console.error('[Vitrion IDB] Failed to open IndexedDB:', request.error);
            this.isAvailable = false;
            reject(request.error);
          };

          request.onblocked = () => {
            console.warn('[Vitrion IDB] Database open blocked. Please close other tabs.');
          };
        } catch (err) {
          this.isAvailable = false;
          reject(err);
        }
      });
    }

    return this.dbPromise;
  }

  // --- Generic Config Store ---
  public async setConfig<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.CONFIG, 'readwrite');
        const store = tx.objectStore(STORES.CONFIG);
        const req = store.put({ key, value, updatedAt: new Date().toISOString() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback to localStorage for bulletproof reboot recovery
      try {
        localStorage.setItem(`vitrion_cfg_${key}`, JSON.stringify(value));
      } catch (e) {
        console.error('[Vitrion IDB] LocalStorage fallback write failed:', e);
      }
    }
  }

  public async getConfig<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.CONFIG, 'readonly');
        const store = tx.objectStore(STORES.CONFIG);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result && req.result.value !== undefined) {
            resolve(req.result.value as T);
          } else {
            resolve(this.getFallbackLocalStorage<T>(key));
          }
        };
        req.onerror = () => {
          resolve(this.getFallbackLocalStorage<T>(key));
        };
      });
    } catch {
      return this.getFallbackLocalStorage<T>(key);
    }
  }

  private getFallbackLocalStorage<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`vitrion_cfg_${key}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  // --- Playlists Store ---
  public async savePlaylist(playlist: Playlist): Promise<void> {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.PLAYLISTS, 'readwrite');
        const store = tx.objectStore(STORES.PLAYLISTS);
        const req = store.put(playlist);
        req.onsuccess = () => {
          // Backup active playlist ID to fast storage
          this.setConfig('active_playlist', playlist);
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      localStorage.setItem(`vitrion_playlist_${playlist.id}`, JSON.stringify(playlist));
    }
  }

  public async getPlaylist(id: string): Promise<Playlist | null> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.PLAYLISTS, 'readonly');
        const store = tx.objectStore(STORES.PLAYLISTS);
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result) {
            resolve(req.result as Playlist);
          } else {
            const fallback = localStorage.getItem(`vitrion_playlist_${id}`);
            resolve(fallback ? JSON.parse(fallback) : null);
          }
        };
        req.onerror = () => {
          const fallback = localStorage.getItem(`vitrion_playlist_${id}`);
          resolve(fallback ? JSON.parse(fallback) : null);
        };
      });
    } catch {
      const fallback = localStorage.getItem(`vitrion_playlist_${id}`);
      return fallback ? JSON.parse(fallback) : null;
    }
  }

  public async getAllPlaylists(): Promise<Playlist[]> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.PLAYLISTS, 'readonly');
        const store = tx.objectStore(STORES.PLAYLISTS);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as Playlist[]) || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  // --- Media Cache Store ---
  public async cacheMedia(id: string, url: string, blob: Blob): Promise<void> {
    try {
      const db = await this.getDb();
      const record: MediaCacheRecord = {
        id,
        url,
        blob,
        mimeType: blob.type,
        sizeBytes: blob.size,
        cachedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
        const store = tx.objectStore(STORES.MEDIA_CACHE);
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[Vitrion IDB] Media cache skipped for:', id, e);
    }
  }

  public async getCachedMediaBlob(id: string): Promise<Blob | null> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
        const store = tx.objectStore(STORES.MEDIA_CACHE);
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result && req.result.blob) {
            resolve(req.result.blob);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  // --- Telemetry & Logs ---
  public async logTelemetry(entry: { type: string; message: string; data?: any }): Promise<void> {
    try {
      const db = await this.getDb();
      const tx = db.transaction(STORES.TELEMETRY, 'readwrite');
      const store = tx.objectStore(STORES.TELEMETRY);
      store.add({
        ...entry,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Ignore telemetry storage errors
    }
  }

  // --- Cache Diagnostics ---
  public async getStorageStats(): Promise<{ cachedMediaCount: number; estimatedBytes: number }> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
        const store = tx.objectStore(STORES.MEDIA_CACHE);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result as MediaCacheRecord[]) || [];
          const totalBytes = items.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
          resolve({
            cachedMediaCount: items.length,
            estimatedBytes: totalBytes,
          });
        };
        req.onerror = () => resolve({ cachedMediaCount: 0, estimatedBytes: 0 });
      });
    } catch {
      return { cachedMediaCount: 0, estimatedBytes: 0 };
    }
  }

  public async clearAllCache(): Promise<void> {
    try {
      const db = await this.getDb();
      const tx = db.transaction([STORES.MEDIA_CACHE, STORES.TELEMETRY], 'readwrite');
      tx.objectStore(STORES.MEDIA_CACHE).clear();
      tx.objectStore(STORES.TELEMETRY).clear();
    } catch (e) {
      console.error('[Vitrion IDB] Failed to clear cache:', e);
    }
  }

  // ==========================================
  // --- Player State & Recovery Management ---
  // ==========================================

  /**
   * Salva o estado atual de reprodução do Player de maneira persistente.
   * Utiliza IndexedDB como armazenamento principal e localStorage como fallback redundante.
   * Valida os dados antes de persistir para garantir que um estado válido nunca seja corrompido.
   */
  public async savePlayerState(state: PlayerState): Promise<void> {
    if (!isValidPlayerState(state)) {
      console.warn('[Vitrion IDB] Tentativa de salvar PlayerState inválido ou incompleto rejeitada:', state);
      this.logTelemetry({
        type: 'player_state_invalid_rejected',
        message: 'Tentativa de salvar PlayerState inválido foi rejeitada para proteger o estado persistido',
        data: { candidate: typeof state === 'object' ? state : String(state) },
      }).catch(() => {});
      throw new Error('PlayerState inválido: campos obrigatórios ausentes ou de tipo incompatível');
    }

    // 1. Armazenamento redundante no localStorage para sobrevivência a reinicializações
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(LOCAL_STORAGE_KEYS.PLAYER_STATE, serialized);
      localStorage.setItem(`${LOCAL_STORAGE_KEYS.CFG_PREFIX}${CONFIG_KEYS.PLAYER_STATE}`, serialized);
    } catch (e) {
      console.warn('[Vitrion IDB] Falha ao gravar fallback de PlayerState no localStorage:', e);
    }

    // 2. Armazenamento principal no IndexedDB
    try {
      await this.setConfig<PlayerState>(CONFIG_KEYS.PLAYER_STATE, state);

      // Registra evento de persistência na telemetria de forma segura
      this.logTelemetry({
        type: 'player_state_saved',
        message: `Estado do player salvo: playlist=${state.activePlaylistId}, item=${state.currentItemIndex}, media=${state.currentMediaId}`,
        data: {
          activePlaylistId: state.activePlaylistId,
          currentItemIndex: state.currentItemIndex,
          currentMediaId: state.currentMediaId,
          savedAt: state.savedAt,
          schemaVersion: state.schemaVersion,
        },
      }).catch(() => {});
    } catch (err) {
      console.error('[Vitrion IDB] Erro ao gravar PlayerState no IndexedDB (mantido no localStorage fallback):', err);
      // Mesmo com falha no IDB, o estado foi preservado no localStorage fallback
    }
  }

  /**
   * Recupera o último estado válido do Player.
   * Retorna null se não houver estado recuperável ou se os dados estiverem corrompidos.
   */
  public async getPlayerState(): Promise<PlayerState | null> {
    let rawState: unknown = null;

    // 1. Tenta recuperar do IndexedDB
    try {
      const db = await this.getDb();
      rawState = await new Promise<unknown>((resolve) => {
        const tx = db.transaction(STORES.CONFIG, 'readonly');
        const store = tx.objectStore(STORES.CONFIG);
        const req = store.get(CONFIG_KEYS.PLAYER_STATE);
        req.onsuccess = () => {
          if (req.result && req.result.value !== undefined) {
            resolve(req.result.value);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      rawState = null;
    }

    // 2. Fallback para localStorage caso IndexedDB não possua ou falhe
    if (!rawState) {
      try {
        const item =
          localStorage.getItem(LOCAL_STORAGE_KEYS.PLAYER_STATE) ||
          localStorage.getItem(`${LOCAL_STORAGE_KEYS.CFG_PREFIX}${CONFIG_KEYS.PLAYER_STATE}`);
        if (item) {
          rawState = JSON.parse(item);
        }
      } catch (e) {
        console.warn('[Vitrion IDB] Falha na leitura do fallback do localStorage para PlayerState:', e);
      }
    }

    // 3. Validação do estado recuperado
    if (!rawState) {
      return null;
    }

    if (isValidPlayerState(rawState)) {
      return rawState;
    }

    // Estado recuperado é inválido ou corrompido
    console.warn('[Vitrion IDB] Estado do player encontrado porém inválido/incompatível:', rawState);
    this.logTelemetry({
      type: 'player_state_corrupted',
      message: 'Estado do Player no armazenamento foi descartado por validação de integridade ou versão',
      data: { rawState },
    }).catch(() => {});

    return null;
  }

  /**
   * Remove exclusivamente o estado de reprodução salvo.
   * Não apaga playlists, configurações do dispositivo, telemetria ou mídias em cache.
   */
  public async clearPlayerState(): Promise<void> {
    // 1. Limpa do fallback do localStorage
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.PLAYER_STATE);
      localStorage.removeItem(`${LOCAL_STORAGE_KEYS.CFG_PREFIX}${CONFIG_KEYS.PLAYER_STATE}`);
    } catch (e) {
      console.warn('[Vitrion IDB] Falha ao limpar PlayerState do localStorage:', e);
    }

    // 2. Limpa do IndexedDB
    try {
      const db = await this.getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.CONFIG, 'readwrite');
        const store = tx.objectStore(STORES.CONFIG);
        const req = store.delete(CONFIG_KEYS.PLAYER_STATE);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[Vitrion IDB] Falha ao remover PlayerState do IndexedDB:', err);
    }

    this.logTelemetry({
      type: 'player_state_cleared',
      message: 'Estado persistente do Player foi removido com sucesso',
    }).catch(() => {});
  }

  /**
   * Valida se um estado recuperado pode ser restabelecido localmente de forma segura.
   * Verifica se a playlist e o conteúdo ainda existem localmente e se a mídia está em cache.
   */
  public async validatePlaybackRecovery(state: PlayerState): Promise<PlaybackRecoveryResult> {
    if (!isValidPlayerState(state)) {
      return {
        isRecoverable: false,
        playlist: null,
        currentItem: null,
        reason: 'Estrutura do estado salvo é inválida ou incompatível',
      };
    }

    // Verifica se a playlist está disponível no cache local
    const playlist = await this.getPlaylist(state.activePlaylistId);
    if (!playlist || !playlist.items || playlist.items.length === 0) {
      return {
        isRecoverable: false,
        playlist: null,
        currentItem: null,
        reason: `Playlist '${state.activePlaylistId}' não encontrada no armazenamento local`,
      };
    }

    // Localiza o item de mídia na playlist
    let currentItem: PlaylistItem | null = null;
    if (
      state.currentItemIndex >= 0 &&
      state.currentItemIndex < playlist.items.length &&
      playlist.items[state.currentItemIndex].id === state.currentMediaId
    ) {
      currentItem = playlist.items[state.currentItemIndex];
    } else {
      currentItem = playlist.items.find((item) => item.id === state.currentMediaId) || null;
    }

    if (!currentItem) {
      return {
        isRecoverable: false,
        playlist,
        currentItem: null,
        reason: `Mídia '${state.currentMediaId}' não existe mais na playlist local`,
      };
    }

    // Verifica se o arquivo de mídia existe no cache offline
    const isMediaCachedLocally = await this.hasCachedMedia(currentItem.id);

    return {
      isRecoverable: true,
      playlist,
      currentItem,
      isMediaCachedLocally,
    };
  }

  /**
   * Verifica se uma mídia específica existe e possui blob ou url no MEDIA_CACHE local.
   */
  public async hasCachedMedia(id: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
        const store = tx.objectStore(STORES.MEDIA_CACHE);
        const req = store.get(id);
        req.onsuccess = () => {
          const res = req.result;
          resolve(!!(res && (res.blob || res.url)));
        };
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Obtém metadados de uma mídia em cache sem carregar o Blob completo na memória.
   */
  public async getCachedMediaInfo(id: string): Promise<{
    id: string;
    url: string;
    sizeBytes: number;
    mimeType: string;
    cachedAt: string;
  } | null> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
        const store = tx.objectStore(STORES.MEDIA_CACHE);
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result) {
            const { id: recId, url, sizeBytes, mimeType, cachedAt } = req.result as MediaCacheRecord;
            resolve({ id: recId, url, sizeBytes, mimeType, cachedAt });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }
}

export const idbService = new IndexedDbService();
