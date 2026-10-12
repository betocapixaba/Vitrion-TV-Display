/**
 * Vitrion TV Display — Media Cache Service
 * Serviço dedicado para download em segundo plano, fila sequencial de prioridade,
 * persistência de Blobs no IndexedDB e gestão estrita do ciclo de vida de URLs Blob.
 */

import { PlaylistItem } from '../../types/display';
import { idbService } from './indexedDb';

export interface CacheTask {
  item: PlaylistItem;
  priority: number;
  retries: number;
  addedAt: number;
}

export interface CacheProgress {
  totalItems: number;
  cachedCount: number;
  isDownloading: boolean;
  currentItemId: string | null;
  lastError: string | null;
}

export type CacheListener = (progress: CacheProgress) => void;

class MediaCacheService {
  private queue: CacheTask[] = [];
  private isProcessing = false;
  private isPaused = false;
  private currentDownloadingId: string | null = null;
  private failedAttempts = new Map<string, number>();
  private activeBlobUrls = new Map<string, string>(); // blobUrl -> itemId
  private listeners = new Set<CacheListener>();
  private cachedItemIds = new Set<string>();

  private maxRetries = 3;
  private lastError: string | null = null;

  /**
   * Adiciona um ouvinte para atualizações no progresso do cache
   */
  public subscribe(listener: CacheListener): () => void {
    this.listeners.add(listener);
    // Notifica estado inicial
    listener(this.getProgress());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const progress = this.getProgress();
    for (const listener of this.listeners) {
      try {
        listener(progress);
      } catch (err) {
        console.warn('[Vitrion MediaCache] Erro em listener de cache:', err);
      }
    }
  }

  public getProgress(): CacheProgress {
    return {
      totalItems: this.queue.length + this.cachedItemIds.size,
      cachedCount: this.cachedItemIds.size,
      isDownloading: this.isProcessing,
      currentItemId: this.currentDownloadingId,
      lastError: this.lastError,
    };
  }

  /**
   * Verifica se uma mídia já está armazenada no IndexedDB
   */
  public async isMediaCached(itemId: string): Promise<boolean> {
    const cached = await idbService.hasCachedMedia(itemId);
    if (cached) {
      this.cachedItemIds.add(itemId);
    }
    return cached;
  }

  /**
   * Recupera o Blob de uma mídia armazenada no IndexedDB
   */
  public async getMediaBlob(itemId: string): Promise<Blob | null> {
    return await idbService.getCachedMediaBlob(itemId);
  }

  /**
   * Cria uma URL temporária `blob:` para uso em <img> ou <video>
   * Registra a URL internamente para gestão de vazamento de memória.
   */
  public async createBlobUrl(itemId: string): Promise<string | null> {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return null;
    }
    try {
      const blob = await idbService.getCachedMediaBlob(itemId);
      if (!blob || blob.size === 0) {
        return null;
      }
      const blobUrl = URL.createObjectURL(blob);
      this.activeBlobUrls.set(blobUrl, itemId);
      this.cachedItemIds.add(itemId);
      return blobUrl;
    } catch (err) {
      console.warn('[Vitrion MediaCache] Falha ao criar blob URL para:', itemId, err);
      return null;
    }
  }

  /**
   * Revoga de forma segura uma URL `blob:` previamente criada, liberando memória na TV
   */
  public revokeBlobUrl(blobUrl: string | null | undefined): void {
    if (!blobUrl || !blobUrl.startsWith('blob:') || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
      return;
    }
    try {
      URL.revokeObjectURL(blobUrl);
      this.activeBlobUrls.delete(blobUrl);
    } catch (err) {
      console.warn('[Vitrion MediaCache] Erro ao revogar blob URL:', err);
    }
  }

  /**
   * Revoga todas as URLs `blob:` registradas (ex: na desmontagem do player)
   */
  public revokeAllBlobUrls(): void {
    for (const blobUrl of this.activeBlobUrls.keys()) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        // ignore
      }
    }
    this.activeBlobUrls.clear();
  }

  /**
   * Sincroniza a fila de downloads para uma playlist.
   * Prioriza:
   * 1. Item atual
   * 2. Próximos 2 itens
   * 3. Demais itens da playlist (inclusive agendados para horários futuros)
   */
  public syncPlaylist(items: PlaylistItem[], currentIndex: number = 0): void {
    if (!items || items.length === 0) return;

    // Constrói nova fila ordenada por proximidade de reprodução
    const newQueue: CacheTask[] = [];
    const len = items.length;

    // Normaliza currentIndex para índice válido dentro dos limites [0, len - 1]
    const safeIndex =
      typeof currentIndex === 'number' && currentIndex >= 0 && currentIndex < len
        ? Math.floor(currentIndex)
        : 0;

    // Ordenação por prioridade:
    // 0: item atual
    // 1: próximo item
    // 2: segundo próximo item
    // 3+: demais itens da playlist
    for (let offset = 0; offset < len; offset++) {
      const idx = (safeIndex + offset) % len;
      const item = items[idx];
      if (!item) continue;

      const retries = this.failedAttempts.get(item.id) || 0;
      if (retries >= this.maxRetries) {
        // Pula itens que excederam limite de tentativas com falha permanente
        continue;
      }

      newQueue.push({
        item,
        priority: offset,
        retries,
        addedAt: Date.now(),
      });
    }

    this.queue = newQueue;
    this.processQueue();
  }

  /**
   * Retorna os itens atualmente na fila de download (para inspeção e testes)
   */
  public getQueueItems(): PlaylistItem[] {
    return this.queue.map((t) => t.item);
  }

  /**
   * Reprioriza a fila quando o slide do Player avança
   */
  public reprioritize(items: PlaylistItem[], newIndex: number): void {
    this.syncPlaylist(items, newIndex);
  }

  /**
   * Força a sincronização/download de todos os itens da playlist,
   * resetando tentativas de falha para tentar baixar itens que falharam anteriormente.
   */
  public forceSyncPlaylist(items: PlaylistItem[], currentIndex: number = 0): void {
    this.failedAttempts.clear();
    this.syncPlaylist(items, currentIndex);
  }

  /**
   * Pausa downloads em segundo plano (ex: se dispositivo estiver offline)
   */
  public pauseQueue(): void {
    this.isPaused = true;
    this.notify();
  }

  /**
   * Retoma downloads em segundo plano
   */
  public resumeQueue(): void {
    this.isPaused = false;
    this.processQueue();
  }

  /**
   * Limpa a fila de downloads (ex: em unpair ou reset)
   */
  public clearQueue(): void {
    this.queue = [];
    this.failedAttempts.clear();
    this.cachedItemIds.clear();
    this.currentDownloadingId = null;
    this.notify();
  }

  /**
   * Processador sequencial: executa estritamente um download por vez
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.isPaused || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0 && !this.isPaused) {
        const task = this.queue.shift();
        if (!task) break;

        const { item } = task;

        // 1. Verifica se já está em cache
        const alreadyCached = await idbService.hasCachedMedia(item.id);
        if (alreadyCached) {
          this.cachedItemIds.add(item.id);
          this.notify();
          continue;
        }

        // 2. Realiza o download individual
        this.currentDownloadingId = item.id;
        this.notify();

        const success = await this.downloadAndCacheMedia(item);

        if (!success) {
          const currentRetries = (this.failedAttempts.get(item.id) || 0) + 1;
          this.failedAttempts.set(item.id, currentRetries);

          if (currentRetries < this.maxRetries) {
            // Reenfileira no final para tentar mais tarde
            this.queue.push({
              item,
              priority: 99,
              retries: currentRetries,
              addedAt: Date.now(),
            });
          }
        } else {
          this.cachedItemIds.add(item.id);
          this.failedAttempts.delete(item.id);
        }

        this.currentDownloadingId = null;
        this.notify();

        // Breve intervalo cooperativo entre downloads para não sobrecarregar a CPU da Fire TV
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } finally {
      this.isProcessing = false;
      this.currentDownloadingId = null;
      this.notify();
    }
  }

  /**
   * Executa o download HTTP/HTTPS de uma mídia individual, valida resposta e armazena no IndexedDB
   */
  public async downloadAndCacheMedia(item: PlaylistItem): Promise<boolean> {
    if (!item.url || typeof item.url !== 'string') {
      return false;
    }

    try {
      // Cria controller com timeout de 30 segundos (evita travar a fila em conexões instáveis)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(item.url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Validação de resposta HTTP
      if (!response.ok) {
        this.lastError = `HTTP ${response.status} ao baixar ${item.name || item.id}`;
        console.warn(`[Vitrion MediaCache] Resposta inválida (${response.status}) para:`, item.url);
        return false;
      }

      // Validação de Content-Length quando disponível
      const contentLengthHeader = response.headers.get('content-length');
      const declaredSize = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;

      const blob = await response.blob();

      // Validação de integridade básica (Blob não vazio)
      if (!blob || blob.size === 0) {
        this.lastError = `Arquivo vazio recebido para ${item.name || item.id}`;
        console.warn('[Vitrion MediaCache] Arquivo recebido está vazio:', item.url);
        return false;
      }

      // Se Content-Length foi declarado e difere significativamente do tamanho recebido
      if (declaredSize !== null && declaredSize > 0 && Math.abs(blob.size - declaredSize) > 1024) {
        console.warn(`[Vitrion MediaCache] Tamanho do blob (${blob.size}) difere do Content-Length (${declaredSize}) para:`, item.url);
      }

      // 3. Persistência no IndexedDB
      await idbService.cacheMedia(item.id, item.url, blob);

      this.lastError = null;
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.lastError = `Timeout no download de ${item.name || item.id}`;
      } else if (err.name === 'QuotaExceededError') {
        this.lastError = `Cota de armazenamento excedida ao salvar ${item.name || item.id}`;
        console.error('[Vitrion MediaCache] QuotaExceededError no IndexedDB:', err);
        // Pausa downloads para não continuar forçando armazenamento cheio
        this.pauseQueue();
      } else {
        // Erro de rede ou CORS
        this.lastError = `Falha de rede/CORS ao baixar ${item.name || item.id}: ${err.message || String(err)}`;
        console.warn('[Vitrion MediaCache] Erro de rede/CORS no download:', item.url, err);
      }
      return false;
    }
  }
}

export const mediaCacheService = new MediaCacheService();
