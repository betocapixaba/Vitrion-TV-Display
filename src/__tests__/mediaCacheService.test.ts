import './testHelper';
import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test';
import { mediaCacheService } from '../core/storage/mediaCacheService';
import { idbService } from '../core/storage/indexedDb';
import { PlaylistItem } from '../types/display';

describe('Vitrion Media Cache Service — Background Queue & Blob Tests', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    await idbService.clearAllCache();
    mediaCacheService.clearQueue();
    mediaCacheService.revokeAllBlobUrls();
    mediaCacheService.resumeQueue();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const createDummyItem = (id: string, name: string, url: string): PlaylistItem => ({
    id,
    name,
    type: 'image',
    url,
    durationSeconds: 10,
    order: 1,
  });

  describe('Download & Blob Persistence', () => {
    it('deve baixar uma mídia e armazenar o Blob com sucesso no IndexedDB', async () => {
      const mockBlob = new Blob(['image payload data 12345'], { type: 'image/png' });
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(mockBlob, {
            status: 200,
            headers: { 'Content-Type': 'image/png', 'Content-Length': String(mockBlob.size) },
          })
        )
      ) as any;

      const item = createDummyItem('item-dl-1', 'Banner 1', 'https://cdn.vitrion.com/banner1.png');
      const success = await mediaCacheService.downloadAndCacheMedia(item);

      expect(success).toBe(true);
      expect(await idbService.hasCachedMedia('item-dl-1')).toBe(true);

      const retrievedBlob = await mediaCacheService.getMediaBlob('item-dl-1');
      expect(retrievedBlob).not.toBeNull();
      expect(retrievedBlob?.size).toBe(mockBlob.size);
    });

    it('deve rejeitar downloads com status HTTP 404', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(null, {
            status: 404,
            statusText: 'Not Found',
          })
        )
      ) as any;

      const item = createDummyItem('item-404', 'Inexistente', 'https://cdn.vitrion.com/notfound.png');
      const success = await mediaCacheService.downloadAndCacheMedia(item);

      expect(success).toBe(false);
      expect(await idbService.hasCachedMedia('item-404')).toBe(false);
    });

    it('deve rejeitar arquivos com Blob vazio (tamanho 0)', async () => {
      const emptyBlob = new Blob([], { type: 'image/png' });
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(emptyBlob, {
            status: 200,
          })
        )
      ) as any;

      const item = createDummyItem('item-empty', 'Vazio', 'https://cdn.vitrion.com/empty.png');
      const success = await mediaCacheService.downloadAndCacheMedia(item);

      expect(success).toBe(false);
      expect(await idbService.hasCachedMedia('item-empty')).toBe(false);
    });

    it('deve tratar falhas de rede / CORS sem travar o Player', async () => {
      globalThis.fetch = mock(() => Promise.reject(new Error('Failed to fetch (CORS)'))) as any;

      const item = createDummyItem('item-cors', 'CORS Error', 'https://cdn.vitrion.com/cors.png');
      const success = await mediaCacheService.downloadAndCacheMedia(item);

      expect(success).toBe(false);
      expect(await idbService.hasCachedMedia('item-cors')).toBe(false);
    });
  });

  describe('Blob URL Lifecycle & Memory Management', () => {
    it('deve criar uma URL blob: a partir de mídia em cache e depois revogá-la com segurança', async () => {
      const blob = new Blob(['image binary content'], { type: 'image/jpeg' });
      await idbService.cacheMedia('blob-test-1', 'https://ex.com/img.jpg', blob);

      const blobUrl = await mediaCacheService.createBlobUrl('blob-test-1');
      expect(blobUrl).not.toBeNull();
      expect(blobUrl?.startsWith('blob:')).toBe(true);

      // Revogação de URL sem erros
      expect(() => mediaCacheService.revokeBlobUrl(blobUrl)).not.toThrow();
    });

    it('deve retornar null ao tentar criar Blob URL para item não existente no cache', async () => {
      const blobUrl = await mediaCacheService.createBlobUrl('nao-existe');
      expect(blobUrl).toBeNull();
    });

    it('deve retornar false quando downloadAndCacheMedia receber item com url nula ou inválida', async () => {
      const itemInvalid = { id: 'inv', name: 'Inv', type: 'image', url: '', durationSeconds: 5, order: 1 } as any;
      const res = await mediaCacheService.downloadAndCacheMedia(itemInvalid);
      expect(res).toBe(false);
    });

    it('deve ignorar com segurança revokeBlobUrl quando chamada com url não-blob ou nula', () => {
      expect(() => mediaCacheService.revokeBlobUrl('https://example.com/img.jpg')).not.toThrow();
      expect(() => mediaCacheService.revokeBlobUrl(null)).not.toThrow();
      expect(() => mediaCacheService.revokeBlobUrl(undefined)).not.toThrow();
    });

    it('deve permitir revogar todas as URLs ativas com revokeAllBlobUrls', async () => {
      const b1 = new Blob(['1'], { type: 'image/png' });
      const b2 = new Blob(['2'], { type: 'image/png' });
      await idbService.cacheMedia('m1', 'https://ex.com/1.png', b1);
      await idbService.cacheMedia('m2', 'https://ex.com/2.png', b2);

      const url1 = await mediaCacheService.createBlobUrl('m1');
      const url2 = await mediaCacheService.createBlobUrl('m2');

      expect(url1).not.toBeNull();
      expect(url2).not.toBeNull();

      expect(() => mediaCacheService.revokeAllBlobUrls()).not.toThrow();
    });
  });

  describe('Queue Prioritization & Sequential Download', () => {
    it('deve sincronizar a playlist priorizando o item atual e próximos itens', async () => {
      const items: PlaylistItem[] = [
        createDummyItem('p1', 'Item 1', 'https://ex.com/1.jpg'),
        createDummyItem('p2', 'Item 2', 'https://ex.com/2.jpg'),
        createDummyItem('p3', 'Item 3', 'https://ex.com/3.jpg'),
        createDummyItem('p4', 'Item 4', 'https://ex.com/4.jpg'),
      ];

      // Se o currentIndex for 2 (Item 3), a fila deve priorizar p3, depois p4, p1, p2
      let downloadOrder: string[] = [];
      globalThis.fetch = mock((url: string) => {
        downloadOrder.push(url);
        return Promise.resolve(new Response(new Blob(['img']), { status: 200 }));
      }) as any;

      mediaCacheService.syncPlaylist(items, 2);

      // Aguarda processamento sequencial cooperativo
      await new Promise((r) => setTimeout(r, 1500));

      expect(downloadOrder[0]).toBe('https://ex.com/3.jpg');
      expect(downloadOrder[1]).toBe('https://ex.com/4.jpg');
    });

    it('deve pausar a fila quando pauseQueue() for chamado e retomar com resumeQueue()', async () => {
      const items: PlaylistItem[] = [
        createDummyItem('q1', 'Item Q1', 'https://ex.com/q1.jpg'),
        createDummyItem('q2', 'Item Q2', 'https://ex.com/q2.jpg'),
      ];

      let downloadedCount = 0;
      globalThis.fetch = mock(() => {
        downloadedCount++;
        return Promise.resolve(new Response(new Blob(['img']), { status: 200 }));
      }) as any;

      mediaCacheService.pauseQueue();
      mediaCacheService.syncPlaylist(items, 0);

      await new Promise((r) => setTimeout(r, 200));
      expect(downloadedCount).toBe(0); // Nenhum download deve iniciar enquanto pausado

      mediaCacheService.resumeQueue();
      await new Promise((r) => setTimeout(r, 1000));
      expect(downloadedCount).toBeGreaterThan(0);
    });

    it('deve notificar ouvintes registrados via subscribe sobre mudanças no progresso', async () => {
      let notifiedProgresses: any[] = [];
      const unsub = mediaCacheService.subscribe((progress) => {
        notifiedProgresses.push(progress);
      });

      expect(notifiedProgresses.length).toBeGreaterThan(0);
      unsub();
    });

    it('deve limpar completamente a fila com clearQueue()', () => {
      const items = [createDummyItem('cl-1', 'Clear 1', 'https://ex.com/1.jpg')];
      mediaCacheService.pauseQueue();
      mediaCacheService.syncPlaylist(items, 0);

      expect(mediaCacheService.getProgress().totalItems).toBeGreaterThan(0);
      mediaCacheService.clearQueue();
      expect(mediaCacheService.getProgress().totalItems).toBe(0);
    });

    it('deve reprioritizar a fila quando o slide do Player mudar', async () => {
      const items = [
        createDummyItem('rp-1', 'Item 1', 'https://ex.com/rp1.jpg'),
        createDummyItem('rp-2', 'Item 2', 'https://ex.com/rp2.jpg'),
        createDummyItem('rp-3', 'Item 3', 'https://ex.com/rp3.jpg'),
      ];

      mediaCacheService.pauseQueue();
      mediaCacheService.syncPlaylist(items, 0);
      expect(() => mediaCacheService.reprioritize(items, 2)).not.toThrow();
    });

    it('deve manter itens com agendamento futuro (tarde) na fila pendente ao reprioritizar itens da manhã', () => {
      // Cenário: Itens da manhã (m1, m2) e itens da tarde (t1, t2)
      const morningItem1 = createDummyItem('m1', 'Manhã 1', 'https://ex.com/m1.jpg');
      const morningItem2 = createDummyItem('m2', 'Manhã 2', 'https://ex.com/m2.jpg');
      const afternoonItem1 = createDummyItem('t1', 'Tarde 1', 'https://ex.com/t1.jpg');
      const afternoonItem2 = createDummyItem('t2', 'Tarde 2', 'https://ex.com/t2.jpg');

      const fullPlaylist = [morningItem1, morningItem2, afternoonItem1, afternoonItem2];

      mediaCacheService.pauseQueue();

      // 1. Sincronização inicial no item m1 (índice 0)
      mediaCacheService.syncPlaylist(fullPlaylist, 0);
      let queued = mediaCacheService.getQueueItems();
      expect(queued.map((i) => i.id)).toEqual(['m1', 'm2', 't1', 't2']);

      // 2. Transição de slide: m2 passa a ser exibido.
      // Calcula o índice seguro dentro da playlist completa pelo ID:
      const targetIndex = fullPlaylist.findIndex((i) => i.id === morningItem2.id);
      expect(targetIndex).toBe(1);

      mediaCacheService.reprioritize(fullPlaylist, targetIndex);

      queued = mediaCacheService.getQueueItems();
      // Deve priorizar m2 (atual), depois t1 e t2 (próximos), e por fim m1
      // NENHUM item da tarde é removido da fila pendente!
      expect(queued.map((i) => i.id)).toEqual(['m2', 't1', 't2', 'm1']);
      expect(queued.some((i) => i.id === 't1')).toBe(true);
      expect(queued.some((i) => i.id === 't2')).toBe(true);
    });

    it('deve normalizar índices negativos ou inválidos sem quebrar nem corromper a fila', () => {
      const items = [
        createDummyItem('s1', 'Safe 1', 'https://ex.com/s1.jpg'),
        createDummyItem('s2', 'Safe 2', 'https://ex.com/s2.jpg'),
      ];

      mediaCacheService.pauseQueue();

      // Teste com índice -1 (quando findIndex não encontra o item)
      expect(() => mediaCacheService.reprioritize(items, -1)).not.toThrow();
      expect(mediaCacheService.getQueueItems().map((i) => i.id)).toEqual(['s1', 's2']);

      // Teste com índice fora dos limites superiores
      expect(() => mediaCacheService.reprioritize(items, 99)).not.toThrow();
      expect(mediaCacheService.getQueueItems().map((i) => i.id)).toEqual(['s1', 's2']);

      // Teste com NaN
      expect(() => mediaCacheService.reprioritize(items, NaN as any)).not.toThrow();
      expect(mediaCacheService.getQueueItems().map((i) => i.id)).toEqual(['s1', 's2']);
    });

    it('não deve baixar novamente mídias que já estão em cache local após repriorização', async () => {
      const cachedBlob = new Blob(['already cached'], { type: 'image/jpeg' });
      await idbService.cacheMedia('c-item-1', 'https://ex.com/c1.jpg', cachedBlob);

      const requestedUrls: string[] = [];
      globalThis.fetch = mock((url: string) => {
        requestedUrls.push(url);
        return Promise.resolve(new Response(new Blob(['new img']), { status: 200 }));
      }) as any;

      const items = [
        createDummyItem('c-item-1', 'Item Já Em Cache', 'https://ex.com/c1.jpg'),
        createDummyItem('c-item-2', 'Item Pendente', 'https://ex.com/c2.jpg'),
      ];

      mediaCacheService.syncPlaylist(items, 0);

      // Aguarda processamento
      await new Promise((r) => setTimeout(r, 600));

      // c-item-1 não deve ter gerado chamada de rede fetch()
      expect(requestedUrls).not.toContain('https://ex.com/c1.jpg');
      expect(requestedUrls).toContain('https://ex.com/c2.jpg');
    });

    it('deve suportar reprioritizações rápidas contínuas durante reprodução sem travar', async () => {
      const items = [
        createDummyItem('cont-1', 'Item 1', 'https://ex.com/c1.jpg'),
        createDummyItem('cont-2', 'Item 2', 'https://ex.com/c2.jpg'),
        createDummyItem('cont-3', 'Item 3', 'https://ex.com/c3.jpg'),
      ];

      globalThis.fetch = mock(() =>
        new Promise((resolve) =>
          setTimeout(() => resolve(new Response(new Blob(['img']), { status: 200 })), 100)
        )
      ) as any;

      // Dispara múltiplas repriorizações em rápida sucessão
      mediaCacheService.syncPlaylist(items, 0);
      mediaCacheService.reprioritize(items, 1);
      mediaCacheService.reprioritize(items, 2);
      mediaCacheService.reprioritize(items, 0);

      expect(mediaCacheService.getQueueItems().length).toBeGreaterThan(0);
      expect(mediaCacheService.getProgress().totalItems).toBeGreaterThan(0);
    });

    it('deve verificar isMediaCached retornando true para itens baixados', async () => {
      const blob = new Blob(['test content'], { type: 'image/png' });
      await idbService.cacheMedia('test-cached-flag', 'https://ex.com/flag.png', blob);

      const isCached = await mediaCacheService.isMediaCached('test-cached-flag');
      expect(isCached).toBe(true);
    });

    it('deve permitir re-tentar itens que falharam com forceSyncPlaylist()', async () => {
      let attempts = 0;
      globalThis.fetch = mock(() => {
        attempts++;
        if (attempts <= 3) {
          return Promise.resolve(new Response(null, { status: 500 }));
        }
        return Promise.resolve(new Response(new Blob(['success']), { status: 200 }));
      }) as any;

      const items = [createDummyItem('retry-item', 'Retry Item', 'https://ex.com/retry.jpg')];
      mediaCacheService.syncPlaylist(items, 0);
      await new Promise((r) => setTimeout(r, 600));

      // Força nova sincronização resetando histórico de falhas
      expect(() => mediaCacheService.forceSyncPlaylist(items, 0)).not.toThrow();
    });
  });
});
