import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ActivationScreen } from '../components/activation/ActivationScreen';
import { DisplayScreen } from '../components/player/DisplayScreen';
import { DisplayDevice, PlaylistItem } from '../types/display';
import fs from 'fs';
import path from 'path';

describe('Vitrion TV Display — Responsive Layout & Vertical Scroll Verification', () => {
  const mockDevice: DisplayDevice = {
    id: 'test-device-uuid-1234',
    name: 'TV Recepção Teste',
    pairingCode: 'VT-9999',
    isActivated: false,
    platform: 'browser',
    userAgent: 'Mozilla/5.0 Chrome/120',
    registeredAt: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString(),
    resolution: { width: 1920, height: 1080, pixelRatio: 1 },
    orientation: 'landscape',
  };

  const mockItem: PlaylistItem = {
    id: 'item-1',
    name: 'Slide Promocional',
    type: 'image',
    url: 'https://cdn.vitrion.com/promo.jpg',
    durationSeconds: 10,
    order: 0,
    fitMode: 'cover',
  };

  it('deve permitir rolagem vertical na tela de ativação/gestão sem travas de overflow-hidden ou h-screen rígido', () => {
    const html = renderToString(
      React.createElement(ActivationScreen, {
        device: mockDevice,
        isOnline: true,
        onActivate: async () => {},
        onRegenerateCode: () => {},
        onOpenDiagnostics: () => {},
      })
    );

    // O container raiz da tela de ativação deve ter min-h-screen para permitir expansão e rolagem vertical
    expect(html).toContain('min-h-screen');

    // Não deve possuir overflow-hidden no container principal que corte os botões ou o rodapé
    expect(html).not.toMatch(/class="[^"]*h-screen[^"]*overflow-hidden/);

    // Deve conter os botões e informações de rodapé acessíveis
    expect(html).toContain('Código de Ativação da TV');
    expect(html).toContain('VT-9999');
    expect(html).toContain('Ativar &amp; Iniciar Player');
    expect(html).toContain('Diagnóstico do Player');
    expect(html).toContain('Dispositivo:');
  });

  it('deve manter a tela de exibição do player estritamente full-screen com overflow-hidden para sinalização digital', () => {
    const html = renderToString(
      React.createElement(DisplayScreen, {
        currentItem: mockItem,
        nextItem: null,
        transition: 'fade',
        onItemEnded: () => {},
        onItemError: () => {},
      })
    );

    // O player de sinalização digital precisa manter overflow-hidden para evitar qualquer barra de rolagem no kiosk mode
    expect(html).toContain('overflow-hidden');
    expect(html).toContain('w-full h-full bg-black overflow-hidden');
  });

  it('deve garantir que o index.html não bloqueie globalmente o scroll do navegador com overflow-hidden no html ou body', () => {
    const indexHtmlPath = path.resolve(import.meta.dir, '../../index.html');
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

    // Verifica que html e body não têm overflow-hidden
    const htmlTagMatch = indexHtml.match(/<html[^>]*class="([^"]*)"/);
    const bodyTagMatch = indexHtml.match(/<body[^>]*class="([^"]*)"/);

    expect(htmlTagMatch).toBeTruthy();
    expect(htmlTagMatch![1]).not.toContain('overflow-hidden');

    expect(bodyTagMatch).toBeTruthy();
    expect(bodyTagMatch![1]).not.toContain('overflow-hidden');

    // Deve conter classes de altura mínima
    expect(htmlTagMatch![1]).toContain('min-h-full');
    expect(bodyTagMatch![1]).toContain('min-h-full');
  });

  it('deve aplicar dinamicamente classes corretas no container de App.tsx baseado no estado de ativação', () => {
    const appTsxPath = path.resolve(import.meta.dir, '../App.tsx');
    const appTsx = fs.readFileSync(appTsxPath, 'utf8');

    // Deve checar que o ternário existe para diferenciar a tela de ativação da tela de reprodução
    expect(appTsx).toContain('!device.isActivated');
    expect(appTsx).toContain('overflow-y-auto');
    expect(appTsx).toContain('relative w-screen h-screen overflow-hidden bg-black text-white');
  });
});
