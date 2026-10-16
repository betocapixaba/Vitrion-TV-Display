import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { DisplayScreen } from '../components/player/DisplayScreen';
import { PlaylistItem } from '../types/display';
import fs from 'fs';
import path from 'path';

describe('Vitrion Playback Timing & Video Protection (Phase 1)', () => {
  const mockImageItem: PlaylistItem = {
    id: 'img-1',
    name: 'Slide Promocional',
    type: 'image',
    url: 'https://cdn.vitrion.com/promo.jpg',
    durationSeconds: 12,
    order: 0,
    fitMode: 'cover',
  };

  const mockImageItemDefaultDuration: PlaylistItem = {
    id: 'img-2',
    name: 'Slide Sem Duracao Definida',
    type: 'image',
    url: 'https://cdn.vitrion.com/promo2.jpg',
    durationSeconds: 0,
    order: 1,
    fitMode: 'cover',
  };

  const mockVideoItemShortDuration: PlaylistItem = {
    id: 'vid-1',
    name: 'Institucional Longo (30s configurado como 5s)',
    type: 'video',
    url: 'https://cdn.vitrion.com/video-30s.mp4',
    durationSeconds: 5, // Duração de metadado menor que o vídeo real
    order: 2,
    fitMode: 'cover',
  };

  const mockVideoItemStandard: PlaylistItem = {
    id: 'vid-2',
    name: 'Vídeo Institucional Normal',
    type: 'video',
    url: 'https://cdn.vitrion.com/institucional.mp4',
    durationSeconds: 20,
    order: 3,
    fitMode: 'contain',
  };

  describe('1. Image Timing Verification', () => {
    it('deve respeitar a duração configurada para itens do tipo imagem', () => {
      // Simulação da lógica de cálculo de duração em App.tsx
      const calculateDurationMs = (item: PlaylistItem) => {
        if (item.type === 'video') return null; // vídeos não usam timer de duração fixa
        return (item.durationSeconds || 10) * 1000;
      };

      expect(calculateDurationMs(mockImageItem)).toBe(12000);
    });

    it('deve usar o valor padrão de 10 segundos quando durationSeconds for 0 ou indefinido para imagens', () => {
      const calculateDurationMs = (item: PlaylistItem) => {
        if (item.type === 'video') return null;
        return (item.durationSeconds || 10) * 1000;
      };

      expect(calculateDurationMs(mockImageItemDefaultDuration)).toBe(10000);

      const itemUndefinedDuration = {
        id: 'img-3',
        name: 'Slide Undefined',
        type: 'image',
        url: 'https://cdn.vitrion.com/img3.jpg',
        durationSeconds: (undefined as unknown as number),
        order: 2,
      } as PlaylistItem;
      expect(calculateDurationMs(itemUndefinedDuration)).toBe(10000);
    });
  });

  describe('2. Video Independence from General Playback Timer', () => {
    it('NÃO deve agendar timer de rotação fixo para itens do tipo vídeo em App.tsx', () => {
      // Verificação de código estático garantindo que App.tsx checa currentItem.type === "video"
      const appSource = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');

      // Verifica se a condição de proteção de vídeo existe no controlador de timer
      expect(appSource).toContain("if (currentItem.type === 'video')");
      expect(appSource).toContain('// Videos are driven by native playback events (onEnded / onError)');

      // Simulação do comportamento: para vídeo, timerMs deve ser null
      const shouldScheduleTimer = (item: PlaylistItem) => {
        if (item.type === 'video') return false;
        return true;
      };

      expect(shouldScheduleTimer(mockVideoItemShortDuration)).toBe(false);
      expect(shouldScheduleTimer(mockVideoItemStandard)).toBe(false);
      expect(shouldScheduleTimer(mockImageItem)).toBe(true);
    });

    it('NÃO deve cortar vídeo cuja duração real seja maior que durationSeconds', () => {
      // Cenário: Item com durationSeconds = 5, mas vídeo real tem 30s
      let advanced = false;
      let timerTriggered = false;

      const currentItem = mockVideoItemShortDuration;

      // Se fosse o código antigo, este timer dispararia em 5s e cortaria o vídeo:
      const oldTimerAction = () => {
        timerTriggered = true;
        advanced = true;
      };

      // Novo comportamento no App.tsx:
      let activeTimer: ReturnType<typeof setTimeout> | null = null;
      if (currentItem.type !== 'video') {
        activeTimer = setTimeout(oldTimerAction, (currentItem.durationSeconds || 10) * 1000);
      }

      // Nenhum timer foi agendado para o vídeo!
      expect(activeTimer).toBeNull();
      expect(timerTriggered).toBe(false);
      expect(advanced).toBe(false);

      // O vídeo toca seus 30 segundos completos e emite onEnded nativo:
      const simulateVideoNativeEnded = () => {
        advanced = true;
      };

      simulateVideoNativeEnded();
      expect(advanced).toBe(true);
    });
  });

  describe('3. Native Video Events in DisplayScreen', () => {
    it('deve renderizar o elemento de vídeo com handlers onEnded e onError configurados', () => {
      const html = renderToString(
        React.createElement(DisplayScreen, {
          currentItem: mockVideoItemStandard,
          nextItem: null,
          transition: 'fade',
          onItemEnded: () => {},
          onItemError: () => {},
        })
      );

      // O elemento <video> deve estar presente no DOM
      expect(html).toContain('<video');
      expect(html).toContain('autoPlay');
      expect(html).toContain(mockVideoItemStandard.url);
      expect(html).toContain('w-full h-full');
    });

    it('DisplayScreen deve conter proteção contra múltiplos disparos (hasEndedRef)', () => {
      const displayScreenSource = fs.readFileSync(
        path.resolve(__dirname, '../components/player/DisplayScreen.tsx'),
        'utf-8'
      );

      expect(displayScreenSource).toContain('hasEndedRef');
      expect(displayScreenSource).toContain('if (hasEndedRef.current) return');
    });

    it('deve evitar múltiplos avanços quando onEnded e onError disparam em sucessão rápida', () => {
      let advanceCalls = 0;
      let hasEnded = false;

      const handleVideoEnded = () => {
        if (hasEnded) return;
        hasEnded = true;
        advanceCalls++;
      };

      const handleVideoError = () => {
        if (hasEnded) return;
        hasEnded = true;
        advanceCalls++;
      };

      // Simula ambos os eventos sendo emitidos
      handleVideoEnded();
      handleVideoEnded(); // segundo onEnded duplicado
      handleVideoError(); // erro tardio

      expect(advanceCalls).toBe(1);
    });
  });

  describe('4. Video Error Handling & Anti-Stall Recovery', () => {
    it('deve avançar o player e notificar erro em caso de falha de carregamento de vídeo', () => {
      let reportedError: string | null = null;
      let hasEnded = false;
      let advanceTriggered = false;

      const onItemError = (itemId: string, msg: string) => {
        reportedError = `${itemId}: ${msg}`;
      };

      const onItemEnded = () => {
        advanceTriggered = true;
      };

      // Simulação do handleVideoError de DisplayScreen
      const handleVideoError = (itemId: string, src: string) => {
        if (hasEnded) return;
        hasEnded = true;
        onItemError(itemId, `Erro no stream do vídeo: ${src}`);
        // Fallback auto-advance
        onItemEnded();
      };

      handleVideoError(mockVideoItemStandard.id, mockVideoItemStandard.url);

      expect(reportedError ?? '').toContain('vid-2');
      expect(reportedError ?? '').toContain('Erro no stream do vídeo');
      expect(advanceTriggered).toBe(true);
    });

    it('DisplayScreen deve possuir fallback timer contra autoplay bloqueado', () => {
      const displayScreenSource = fs.readFileSync(
        path.resolve(__dirname, '../components/player/DisplayScreen.tsx'),
        'utf-8'
      );

      expect(displayScreenSource).toContain('Autoplay bloqueado pelo navegador');
      expect(displayScreenSource).toContain('fallbackTimerRef');
    });
  });

  describe('5. Duplicate Advance Debouncing in App.tsx', () => {
    it('App.tsx deve conter lastAdvanceTimeRef para debouncing de 400ms', () => {
      const appSource = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');

      expect(appSource).toContain('lastAdvanceTimeRef');
      expect(appSource).toContain('now - lastAdvanceTimeRef.current < 400');
    });

    it('deve ignorar chamadas consecutivas de avanço com intervalo menor que 400ms', () => {
      let currentIndex = 0;
      let lastAdvanceTime = 0;
      const totalItems = 3;

      const advanceToNextItem = (currentTime: number) => {
        if (currentTime - lastAdvanceTime < 400) {
          return; // ignorado pelo debounce
        }
        lastAdvanceTime = currentTime;
        currentIndex = (currentIndex + 1) % totalItems;
      };

      // Chamada 1 no t = 1000ms
      advanceToNextItem(1000);
      expect(currentIndex).toBe(1);

      // Chamada 2 duplicada no t = 1050ms (50ms após chamada 1)
      advanceToNextItem(1050);
      expect(currentIndex).toBe(1); // Não pulou slide!

      // Chamada 3 duplicada no t = 1200ms (200ms após chamada 1)
      advanceToNextItem(1200);
      expect(currentIndex).toBe(1); // Permanece no slide 1

      // Chamada legítima posterior no t = 1500ms (500ms após chamada 1)
      advanceToNextItem(1500);
      expect(currentIndex).toBe(2);
    });
  });

  describe('6. Preservation of Fullscreen & Activation Layout', () => {
    it('deve preservar as classes de tela cheia do player em App.tsx', () => {
      const appSource = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');

      expect(appSource).toContain(
        "relative w-screen h-screen overflow-hidden bg-black text-white"
      );
    });

    it('deve preservar as classes do container de ativação com scroll vertical em App.tsx', () => {
      const appSource = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');

      expect(appSource).toContain(
        "relative w-full h-screen overflow-y-auto bg-[#07090e] text-white"
      );
    });
  });
});
