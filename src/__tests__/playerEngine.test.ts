import './testHelper';
import { describe, it, expect, beforeEach } from 'bun:test';
import {
  isItemActiveNow,
  getActivePlaylistItems,
  resolveInitialPlaybackState,
  loadActivePlaylist,
} from '../core/player/playerEngine';
import { DEFAULT_OFFLINE_PLAYLIST } from '../core/player/defaultPlaylist';
import { Playlist, PlaylistItem, PlaybackSchedule } from '../types/display';
import { PlayerState, idbService, STORES } from '../core/storage/indexedDb';

describe('Vitrion Playback Engine — Schedule, Failovers & Recovery Tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    await idbService.clearAllCache();
    await idbService.clearPlayerState();
    try {
      const db = await idbService.getDb();
      const tx = db.transaction([STORES.PLAYLISTS, STORES.CONFIG], 'readwrite');
      tx.objectStore(STORES.PLAYLISTS).clear();
      tx.objectStore(STORES.CONFIG).clear();
      await new Promise<void>((r) => {
        tx.oncomplete = () => r();
        tx.onerror = () => r();
      });
    } catch {
      // ignore
    }
  });

  describe('isItemActiveNow Schedule Checking', () => {
    it('deve retornar true quando o schedule for indefinido ou desativado', () => {
      expect(isItemActiveNow(undefined)).toBe(true);
      expect(isItemActiveNow({ enabled: false, daysOfWeek: [], startTime: '', endTime: '' })).toBe(true);
    });

    it('deve respeitar os dias da semana permitidos', () => {
      const today = new Date().getDay();
      const yesterday = (today + 6) % 7;

      const scheduleToday: PlaybackSchedule = {
        enabled: true,
        daysOfWeek: [today],
        startTime: '00:00',
        endTime: '23:59',
      };
      expect(isItemActiveNow(scheduleToday)).toBe(true);

      const scheduleYesterday: PlaybackSchedule = {
        enabled: true,
        daysOfWeek: [yesterday],
        startTime: '00:00',
        endTime: '23:59',
      };
      expect(isItemActiveNow(scheduleYesterday)).toBe(false);
    });

    it('deve validar horários startTime e endTime', () => {
      const scheduleAllday: PlaybackSchedule = {
        enabled: true,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startTime: '00:00',
        endTime: '23:59',
      };
      expect(isItemActiveNow(scheduleAllday)).toBe(true);
    });

    it('deve retornar true quando múltiplos dias da semana incluem o dia de hoje', () => {
      const today = new Date().getDay();
      const sched: PlaybackSchedule = {
        enabled: true,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6].filter((d) => d === today || d === (today + 1) % 7),
        startTime: '00:00',
        endTime: '23:59',
      };
      expect(isItemActiveNow(sched)).toBe(true);
    });

    it('deve retornar false quando o horário atual estiver fora do intervalo programado', () => {
      const schedExpired: PlaybackSchedule = {
        enabled: true,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startTime: '01:00',
        endTime: '01:01',
      };
      // Apenas se agora não for exatamente 01:00..01:01
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const cur = `${currentHours}:${currentMinutes}`;
      if (cur < '01:00' || cur > '01:01') {
        expect(isItemActiveNow(schedExpired)).toBe(false);
      }
    });
  });

  describe('getActivePlaylistItems & Anti-Black-Screen Failover', () => {
    it('deve retornar os itens da playlist padrão se a playlist estiver vazia', () => {
      const emptyPlaylist: Playlist = {
        id: 'pl-empty',
        name: 'Vazia',
        version: 1,
        items: [],
        defaultDurationSeconds: 10,
        transition: 'fade',
        updatedAt: new Date().toISOString(),
      };
      const items = getActivePlaylistItems(emptyPlaylist);
      expect(items.length).toBe(DEFAULT_OFFLINE_PLAYLIST.items.length);
    });

    it('deve filtrar itens inativos pelo horário', () => {
      const today = new Date().getDay();
      const otherDay = (today + 3) % 7;

      const playlist: Playlist = {
        id: 'pl-sched',
        name: 'Horários',
        version: 1,
        defaultDurationSeconds: 10,
        transition: 'fade',
        items: [
          {
            id: 'it-1',
            name: 'Ativo Hoje',
            type: 'image',
            url: 'https://ex.com/1.jpg',
            durationSeconds: 10,
            order: 1,
            schedule: { enabled: true, daysOfWeek: [today], startTime: '00:00', endTime: '23:59' },
          },
          {
            id: 'it-2',
            name: 'Inativo Hoje',
            type: 'image',
            url: 'https://ex.com/2.jpg',
            durationSeconds: 10,
            order: 2,
            schedule: { enabled: true, daysOfWeek: [otherDay], startTime: '00:00', endTime: '23:59' },
          },
        ],
        updatedAt: new Date().toISOString(),
      };

      const active = getActivePlaylistItems(playlist);
      expect(active.length).toBe(1);
      expect(active[0].id).toBe('it-1');
    });

    it('MECANISMO DE SEGURANÇA: se TODOS os itens estiverem fora do horário, deve exibir todos os itens em vez de tela preta', () => {
      const otherDay = (new Date().getDay() + 3) % 7;

      const playlistAllInactive: Playlist = {
        id: 'pl-all-inactive',
        name: 'Todos Inativos',
        version: 1,
        defaultDurationSeconds: 10,
        transition: 'fade',
        items: [
          {
            id: 'it-out-1',
            name: 'Fora do Horário 1',
            type: 'image',
            url: 'https://ex.com/1.jpg',
            durationSeconds: 10,
            order: 1,
            schedule: { enabled: true, daysOfWeek: [otherDay], startTime: '00:00', endTime: '23:59' },
          },
          {
            id: 'it-out-2',
            name: 'Fora do Horário 2',
            type: 'image',
            url: 'https://ex.com/2.jpg',
            durationSeconds: 10,
            order: 2,
            schedule: { enabled: true, daysOfWeek: [otherDay], startTime: '00:00', endTime: '23:59' },
          },
        ],
        updatedAt: new Date().toISOString(),
      };

      const items = getActivePlaylistItems(playlistAllInactive);
      // Proteção failover garante que nenhum display fique em tela vazia
      expect(items.length).toBe(2);
    });
  });

  describe('resolveInitialPlaybackState', () => {
    it('deve retomar exatamente no item salvo quando este for válido', () => {
      const playlist: Playlist = {
        id: 'pl-resume',
        name: 'Resume Test',
        version: 1,
        defaultDurationSeconds: 10,
        transition: 'fade',
        items: [
          { id: 'i1', name: 'Item 1', type: 'image', url: 'https://ex.com/1.jpg', durationSeconds: 5, order: 1 },
          { id: 'i2', name: 'Item 2', type: 'image', url: 'https://ex.com/2.jpg', durationSeconds: 5, order: 2 },
          { id: 'i3', name: 'Item 3', type: 'image', url: 'https://ex.com/3.jpg', durationSeconds: 5, order: 3 },
        ],
        updatedAt: new Date().toISOString(),
      };

      const savedState: PlayerState = {
        schemaVersion: 1,
        activePlaylistId: 'pl-resume',
        currentItemIndex: 1,
        currentMediaId: 'i2',
        playbackStartedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
      };

      const resolution = resolveInitialPlaybackState(playlist, savedState);
      expect(resolution.isRecovered).toBe(true);
      expect(resolution.initialIndex).toBe(1);
      expect(resolution.recoveredItem?.id).toBe('i2');
    });

    it('deve iniciar do índice 0 quando não houver estado salvo', () => {
      const playlist = DEFAULT_OFFLINE_PLAYLIST;
      const resolution = resolveInitialPlaybackState(playlist, null);
      expect(resolution.isRecovered).toBe(false);
      expect(resolution.initialIndex).toBe(0);
    });

    it('deve usar o primeiro item se o estado salvo pertencer a outra playlist', () => {
      const playlist = DEFAULT_OFFLINE_PLAYLIST;
      const otherState: PlayerState = {
        schemaVersion: 1,
        activePlaylistId: 'outra-playlist-qualquer',
        currentItemIndex: 2,
        currentMediaId: 'outro-item',
        playbackStartedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
      };
      const res = resolveInitialPlaybackState(playlist, otherState);
      expect(res.isRecovered).toBe(false);
      expect(res.initialIndex).toBe(0);
      expect(res.reason).toContain('outra playlist');
    });

    it('deve usar o primeiro item ativo se o item salvo estiver fora da janela de horário', () => {
      const otherDay = (new Date().getDay() + 3) % 7;
      const playlist: Playlist = {
        id: 'pl-window-test',
        name: 'Window Test',
        version: 1,
        defaultDurationSeconds: 10,
        transition: 'fade',
        items: [
          { id: 'w1', name: 'W1', type: 'image', url: 'https://ex.com/1.jpg', durationSeconds: 5, order: 1 },
          {
            id: 'w2-sched',
            name: 'W2 Inativo',
            type: 'image',
            url: 'https://ex.com/2.jpg',
            durationSeconds: 5,
            order: 2,
            schedule: { enabled: true, daysOfWeek: [otherDay], startTime: '00:00', endTime: '23:59' },
          },
        ],
        updatedAt: new Date().toISOString(),
      };

      const savedState: PlayerState = {
        schemaVersion: 1,
        activePlaylistId: 'pl-window-test',
        currentItemIndex: 1,
        currentMediaId: 'w2-sched',
        playbackStartedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
      };

      const res = resolveInitialPlaybackState(playlist, savedState);
      expect(res.isRecovered).toBe(false);
      expect(res.initialIndex).toBe(0);
      expect(res.reason).toContain('não pertence à programação ativa');
    });
  });

  describe('Ordenação e Pré-carregamento', () => {
    it('deve ordenar os itens ativos de acordo com a propriedade order', () => {
      const pl: Playlist = {
        id: 'pl-sort',
        name: 'Sort Test',
        version: 1,
        defaultDurationSeconds: 10,
        transition: 'fade',
        items: [
          { id: 's3', name: 'Item 3', type: 'image', url: 'https://ex.com/3.jpg', durationSeconds: 5, order: 3 },
          { id: 's1', name: 'Item 1', type: 'image', url: 'https://ex.com/1.jpg', durationSeconds: 5, order: 1 },
          { id: 's2', name: 'Item 2', type: 'image', url: 'https://ex.com/2.jpg', durationSeconds: 5, order: 2 },
        ],
        updatedAt: new Date().toISOString(),
      };

      const items = getActivePlaylistItems(pl);
      expect(items[0].id).toBe('s1');
      expect(items[1].id).toBe('s2');
      expect(items[2].id).toBe('s3');
    });
  });

  describe('loadActivePlaylist', () => {
    it('deve carregar a playlist gravada em idbService', async () => {
      const customPl: Playlist = {
        id: 'pl-custom-boot',
        name: 'Custom Playlist',
        version: 1,
        defaultDurationSeconds: 10,
        transition: 'fade',
        items: [
          { id: 'c1', name: 'Custom 1', type: 'image', url: 'https://ex.com/c1.jpg', durationSeconds: 10, order: 1 },
        ],
        updatedAt: new Date().toISOString(),
      };

      await idbService.savePlaylist(customPl);
      const loaded = await loadActivePlaylist('pl-custom-boot');
      expect(loaded.id).toBe('pl-custom-boot');
    });

    it('deve retornar DEFAULT_OFFLINE_PLAYLIST quando nenhuma playlist for encontrada', async () => {
      const loaded = await loadActivePlaylist('nao-existe-id');
      expect(loaded.id).toBe(DEFAULT_OFFLINE_PLAYLIST.id);
    });
  });
});
