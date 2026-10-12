import './testHelper';
import { describe, it, expect, beforeEach } from 'bun:test';
import {
  idbService,
  isValidPlayerState,
  PlayerState,
  CURRENT_PLAYER_STATE_SCHEMA_VERSION,
  STORES,
  CONFIG_KEYS,
} from '../core/storage/indexedDb';
import { Playlist, PlaylistItem } from '../types/display';

describe('Vitrion Storage Engine — IndexedDB & Persistence Tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    await idbService.clearAllCache();
    await idbService.clearPlayerState();
  });

  describe('PlayerState Validation', () => {
    it('deve validar com sucesso um PlayerState íntegro', () => {
      const validState: PlayerState = {
        schemaVersion: CURRENT_PLAYER_STATE_SCHEMA_VERSION,
        activePlaylistId: 'pl-100',
        currentItemIndex: 2,
        currentMediaId: 'media-3',
        playbackStartedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        playlistVersion: 1,
      };
      expect(isValidPlayerState(validState)).toBe(true);
    });

    it('deve rejeitar estado nulo ou indefinido', () => {
      expect(isValidPlayerState(null)).toBe(false);
      expect(isValidPlayerState(undefined)).toBe(false);
      expect(isValidPlayerState({})).toBe(false);
    });

    it('deve rejeitar estado com schemaVersion inválida', () => {
      const invalid = {
        schemaVersion: 0,
        activePlaylistId: 'pl-1',
        currentItemIndex: 0,
        currentMediaId: 'med-1',
        playbackStartedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
      };
      expect(isValidPlayerState(invalid)).toBe(false);
    });

    it('deve rejeitar estado com currentItemIndex negativo', () => {
      const invalid = {
        schemaVersion: 1,
        activePlaylistId: 'pl-1',
        currentItemIndex: -1,
        currentMediaId: 'med-1',
        playbackStartedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
      };
      expect(isValidPlayerState(invalid)).toBe(false);
    });

    it('deve rejeitar estado com activePlaylistId vazia', () => {
      const invalid = {
        schemaVersion: 1,
        activePlaylistId: '   ',
        currentItemIndex: 0,
        currentMediaId: 'med-1',
        playbackStartedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
      };
      expect(isValidPlayerState(invalid)).toBe(false);
    });

    it('deve rejeitar estado com data salva em formato inválido', () => {
      const invalid = {
        schemaVersion: 1,
        activePlaylistId: 'pl-1',
        currentItemIndex: 0,
        currentMediaId: 'med-1',
        playbackStartedAt: 'data_invalida',
        savedAt: new Date().toISOString(),
      };
      expect(isValidPlayerState(invalid)).toBe(false);
    });
  });

  describe('PlayerState Persistence & Recovery', () => {
    it('deve salvar e recuperar PlayerState com sucesso no IndexedDB', async () => {
      const now = new Date().toISOString();
      const state: PlayerState = {
        schemaVersion: CURRENT_PLAYER_STATE_SCHEMA_VERSION,
        activePlaylistId: 'pl-firetv-01',
        currentItemIndex: 1,
        currentMediaId: 'item-2',
        playbackStartedAt: now,
        savedAt: now,
        playlistVersion: 2,
      };

      await idbService.savePlayerState(state);
      const recovered = await idbService.getPlayerState();

      expect(recovered).not.toBeNull();
      expect(recovered?.activePlaylistId).toBe('pl-firetv-01');
      expect(recovered?.currentItemIndex).toBe(1);
      expect(recovered?.currentMediaId).toBe('item-2');
    });

    it('deve recuperar do fallback localStorage caso o IndexedDB falhe ou esteja vazio', async () => {
      const now = new Date().toISOString();
      const state: PlayerState = {
        schemaVersion: 1,
        activePlaylistId: 'pl-fallback-test',
        currentItemIndex: 0,
        currentMediaId: 'item-fallback',
        playbackStartedAt: now,
        savedAt: now,
      };

      // Grava no localStorage simulando perda de cache IDB
      localStorage.setItem('vitrion_player_state', JSON.stringify(state));

      const recovered = await idbService.getPlayerState();
      expect(recovered).not.toBeNull();
      expect(recovered?.activePlaylistId).toBe('pl-fallback-test');
    });

    it('deve limpar PlayerState sem apagar playlists ou outras configurações', async () => {
      const state: PlayerState = {
        schemaVersion: 1,
        activePlaylistId: 'pl-to-clear',
        currentItemIndex: 0,
        currentMediaId: 'med-to-clear',
        playbackStartedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
      };

      await idbService.savePlayerState(state);
      await idbService.setConfig('other_config', { someValue: 42 });

      await idbService.clearPlayerState();

      const recovered = await idbService.getPlayerState();
      expect(recovered).toBeNull();

      const other = await idbService.getConfig('other_config');
      expect(other).toEqual({ someValue: 42 });
    });
  });

  describe('Media Caching no IndexedDB', () => {
    it('deve armazenar um Blob de imagem e recuperar com sucesso', async () => {
      const blob = new Blob(['fake image content bytes'], { type: 'image/jpeg' });
      await idbService.cacheMedia('media-img-1', 'https://example.com/banner.jpg', blob);

      const hasCached = await idbService.hasCachedMedia('media-img-1');
      expect(hasCached).toBe(true);

      const retrievedBlob = await idbService.getCachedMediaBlob('media-img-1');
      expect(retrievedBlob).not.toBeNull();
      expect(retrievedBlob?.size).toBe(blob.size);
      expect(retrievedBlob?.type).toBe('image/jpeg');
    });

    it('deve armazenar um Blob de vídeo e recuperar metadados com getCachedMediaInfo', async () => {
      const videoBlob = new Blob(['video payload chunk 001122'], { type: 'video/mp4' });
      await idbService.cacheMedia('media-vid-1', 'https://example.com/promo.mp4', videoBlob);

      const info = await idbService.getCachedMediaInfo('media-vid-1');
      expect(info).not.toBeNull();
      expect(info?.id).toBe('media-vid-1');
      expect(info?.mimeType).toBe('video/mp4');
      expect(info?.sizeBytes).toBe(videoBlob.size);
      expect(info?.url).toBe('https://example.com/promo.mp4');
    });

    it('deve retornar false e null para mídia inexistente', async () => {
      const exists = await idbService.hasCachedMedia('non-existent-id');
      expect(exists).toBe(false);

      const blob = await idbService.getCachedMediaBlob('non-existent-id');
      expect(blob).toBeNull();

      const info = await idbService.getCachedMediaInfo('non-existent-id');
      expect(info).toBeNull();
    });

    it('deve calcular corretamente as estatísticas de armazenamento (getStorageStats)', async () => {
      const b1 = new Blob(['12345'], { type: 'image/png' }); // 5 bytes
      const b2 = new Blob(['1234567890'], { type: 'image/png' }); // 10 bytes

      await idbService.cacheMedia('m1', 'https://ex.com/1.png', b1);
      await idbService.cacheMedia('m2', 'https://ex.com/2.png', b2);

      const stats = await idbService.getStorageStats();
      expect(stats.cachedMediaCount).toBe(2);
      expect(stats.estimatedBytes).toBe(15);
    });

    it('deve limpar todo o cache de mídias com clearAllCache', async () => {
      const b = new Blob(['abc'], { type: 'image/png' });
      await idbService.cacheMedia('m-clear', 'https://ex.com/abc.png', b);

      await idbService.clearAllCache();

      const stats = await idbService.getStorageStats();
      expect(stats.cachedMediaCount).toBe(0);
      expect(stats.estimatedBytes).toBe(0);
      expect(await idbService.hasCachedMedia('m-clear')).toBe(false);
    });
  });

  describe('validatePlaybackRecovery', () => {
    it('deve validar recuperação com sucesso quando playlist e mídia existem', async () => {
      const testItem: PlaylistItem = {
        id: 'recov-item-1',
        name: 'Item Recuperável',
        type: 'image',
        url: 'https://ex.com/item1.jpg',
        durationSeconds: 10,
        order: 1,
      };

      const testPlaylist: Playlist = {
        id: 'pl-recov',
        name: 'Playlist de Recuperação',
        version: 1,
        items: [testItem],
        defaultDurationSeconds: 10,
        transition: 'fade',
        updatedAt: new Date().toISOString(),
      };

      await idbService.savePlaylist(testPlaylist);
      const blob = new Blob(['test image'], { type: 'image/jpeg' });
      await idbService.cacheMedia('recov-item-1', testItem.url, blob);

      const state: PlayerState = {
        schemaVersion: 1,
        activePlaylistId: 'pl-recov',
        currentItemIndex: 0,
        currentMediaId: 'recov-item-1',
        playbackStartedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
      };

      const result = await idbService.validatePlaybackRecovery(state);
      expect(result.isRecoverable).toBe(true);
      expect(result.playlist?.id).toBe('pl-recov');
      expect(result.currentItem?.id).toBe('recov-item-1');
      expect(result.isMediaCachedLocally).toBe(true);
    });

    it('deve apontar isRecoverable=false quando a playlist não existe no armazenamento local', async () => {
      const state: PlayerState = {
        schemaVersion: 1,
        activePlaylistId: 'playlist-inexistente',
        currentItemIndex: 0,
        currentMediaId: 'item-1',
        playbackStartedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
      };

      const result = await idbService.validatePlaybackRecovery(state);
      expect(result.isRecoverable).toBe(false);
      expect(result.reason).toContain('não encontrada');
    });

    it('deve lançar erro e rejeitar salvamento de PlayerState inválido', async () => {
      const invalid = { schemaVersion: -1 } as any;
      let errorThrown = false;
      try {
        await idbService.savePlayerState(invalid);
      } catch {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
    });

    it('deve registrar eventos de telemetria sem lançar exceções', async () => {
      await expect(
        idbService.logTelemetry({
          type: 'test_event',
          message: 'Evento de teste da suíte automatizada',
          data: { code: 200 },
        })
      ).resolves.toBeUndefined();
    });

    it('deve persistir e recuperar configurações genéricas via setConfig e getConfig', async () => {
      await idbService.setConfig('custom_setting', { brightness: 100, volume: 50 });
      const config = await idbService.getConfig<{ brightness: number; volume: number }>('custom_setting');
      expect(config).not.toBeNull();
      expect(config?.brightness).toBe(100);
      expect(config?.volume).toBe(50);
    });

    it('deve retornar null ao buscar configuração inexistente', async () => {
      const res = await idbService.getConfig('chave_que_nao_existe');
      expect(res).toBeNull();
    });
  });
});
