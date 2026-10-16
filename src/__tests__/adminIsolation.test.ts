import './testHelper';
import { describe, it, expect, beforeEach } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { isAdminRoute } from '../App';
import { AdminPlaceholder } from '../components/admin/AdminPlaceholder';
import fs from 'fs';
import path from 'path';

describe('Vitrion TV Display — Phase A1: Admin Entry Point Isolation Tests', () => {
  describe('1. Hash Route Detection (isAdminRoute)', () => {
    it('deve identificar a rota raiz administrativa #/admin como rota de admin', () => {
      expect(isAdminRoute('#/admin')).toBe(true);
    });

    it('deve identificar sub-rotas como #/admin/ e #/admin/devices como rota de admin', () => {
      expect(isAdminRoute('#/admin/')).toBe(true);
      expect(isAdminRoute('#/admin/devices')).toBe(true);
      expect(isAdminRoute('#/admin/playlists/edit/123')).toBe(true);
    });

    it('deve identificar rotas com query params como #/admin?tab=overview', () => {
      expect(isAdminRoute('#/admin?tab=overview')).toBe(true);
    });

    it('não deve identificar hash vazio, # ou #/ como rota de admin', () => {
      expect(isAdminRoute('')).toBe(false);
      expect(isAdminRoute('#')).toBe(false);
      expect(isAdminRoute('#/')).toBe(false);
    });

    it('não deve identificar rotas de TV ou ativação como admin', () => {
      expect(isAdminRoute('#/player')).toBe(false);
      expect(isAdminRoute('#/activation')).toBe(false);
      expect(isAdminRoute('#/diagnostics')).toBe(false);
    });

    it('não deve identificar palavras semelhantes sem delimitador (#/administrador)', () => {
      expect(isAdminRoute('#/administrador')).toBe(false);
    });
  });

  describe('2. AdminPlaceholder Component Rendering', () => {
    it('deve renderizar o cabeçalho e título da Área Administrativa de forma isolada', () => {
      const html = renderToString(React.createElement(AdminPlaceholder));

      expect(html).toContain('VITRION');
      expect(html).toContain('Área Administrativa');
      expect(html).toContain('Painel de Gestão e Operações de Sinalização Digital');
      expect(html).toContain('Fase A1 Concluída');
      expect(html).toContain('Ponto de Entrada Administrativo Isolado');
    });

    it('deve renderizar o botão para retorno ao Player de TV', () => {
      const html = renderToString(React.createElement(AdminPlaceholder));

      expect(html).toContain('Voltar para o Player TV');
      expect(html).toContain('Ir para Tela da TV');
    });

    it('deve descrever explicitamente que os efeitos colaterais de TV estão inativos', () => {
      const html = renderToString(React.createElement(AdminPlaceholder));

      expect(html).toContain('getOrCreateDeviceProfile');
      expect(html).toContain('requestScreenWakeLock');
      expect(html).toContain('initCursorAutoHider');
      expect(html).toContain('Garantias de Isolamento Ativas');
    });

    it('não deve conter elementos de ativação de TV nem overlay de diagnóstico de 10 pés', () => {
      const html = renderToString(React.createElement(AdminPlaceholder));

      expect(html).not.toContain('Código de Ativação da TV');
      expect(html).not.toContain('Pressione MENU');
      expect(html).not.toContain('10-foot');
    });
  });

  describe('3. Code Inspection of TV Side Effects Isolation in App.tsx', () => {
    const appSource = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');

    it('deve verificar que o listener de hashchange está configurado em App.tsx', () => {
      expect(appSource).toContain("window.addEventListener('hashchange', handleHashChange)");
      expect(appSource).toContain("window.removeEventListener('hashchange', handleHashChange)");
    });

    it('deve verificar que isAdmin é computado a partir de isAdminRoute', () => {
      expect(appSource).toContain('const isAdmin = isAdminRoute(currentHash)');
    });

    it('deve garantir que Effect 1 (Boot & WakeLock) é interrompido imediatamente se isAdmin for true', () => {
      expect(appSource).toContain('// If administrative route is active, do not run TV side-effects or boot logic');
      expect(appSource).toContain('if (isAdmin) {\n      return;\n    }');
    });

    it('deve garantir que o wake lock, cursor auto-hider e bootPlayer estão dentro do bloco protegido por isAdmin', () => {
      const effect1Start = appSource.indexOf('// 1. Initial Device Boot & Storage Hydration');
      const effect1End = appSource.indexOf('// 2. Playback Item Advance Logic');
      const effect1Block = appSource.slice(effect1Start, effect1End);

      expect(effect1Block).toContain('if (isAdmin) {');
      expect(effect1Block).toContain('requestScreenWakeLock()');
      expect(effect1Block).toContain('initCursorAutoHider()');
      expect(effect1Block).toContain('bootPlayer()');
      expect(effect1Block).toContain('[isAdmin]');
    });

    it('deve garantir que Effect 2b (telemetria e persistência) não executa sob rota admin', () => {
      expect(appSource).toContain('if (isAdmin || activeItems.length === 0 || !playlist) return;');
    });

    it('deve garantir que Effect 3 (timer de reprodução) não executa sob rota admin', () => {
      expect(appSource).toContain('if (isAdmin || !device?.isActivated || activeItems.length === 0) return;');
    });

    it('deve garantir que Effect 4 (controle remoto e teclado TV) não escuta teclas sob rota admin', () => {
      const effect4Start = appSource.indexOf('// 4. Remote Control & D-pad Keyboard Navigation');
      const effect4End = appSource.indexOf('// 5. Uptime & Heartbeat Periodic Loop');
      const effect4Block = appSource.slice(effect4Start, effect4End);

      expect(effect4Block).toContain('if (isAdmin) return;');
      expect(effect4Block).toContain('[isDiagnosticOpen, advanceToNextItem, isAdmin]');
    });

    it('deve garantir que Effect 5 (heartbeat periódico) não inicia o setInterval sob rota admin', () => {
      const effect5Start = appSource.indexOf('// 5. Uptime & Heartbeat Periodic Loop');
      const effect5End = appSource.indexOf('// 6. Action Handlers');
      const effect5Block = appSource.slice(effect5Start, effect5End);

      expect(effect5Block).toContain('if (isAdmin) return;');
      expect(effect5Block).toContain('[isAdmin]');
    });

    it('deve garantir que AdminPlaceholder é renderizado antes de qualquer tela de TV', () => {
      const adminRenderIdx = appSource.indexOf('if (isAdmin)');
      const deviceCheckIdx = appSource.indexOf('if (!device)');
      const tvReturnIdx = appSource.indexOf('return (\n    <div\n      className=');

      expect(adminRenderIdx).toBeGreaterThan(0);
      expect(deviceCheckIdx).toBeGreaterThan(adminRenderIdx);
      expect(tvReturnIdx).toBeGreaterThan(deviceCheckIdx);
    });
  });

  describe('4. Preservation of TV Player & Activation Screen', () => {
    const appSource = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8');

    it('deve preservar as classes da tela de ativação com scroll vertical em App.tsx', () => {
      expect(appSource).toContain("'relative w-full h-screen overflow-y-auto bg-[#07090e] text-white'");
    });

    it('deve preservar as classes da tela do player em fullscreen com overflow-hidden em App.tsx', () => {
      expect(appSource).toContain("'relative w-screen h-screen overflow-hidden bg-black text-white'");
    });

    it('deve manter a renderização de ActivationScreen, DisplayScreen e DiagnosticOverlay', () => {
      expect(appSource).toContain('<ActivationScreen');
      expect(appSource).toContain('<DisplayScreen');
      expect(appSource).toContain('<DiagnosticOverlay');
      expect(appSource).toContain('<StatusBar');
    });
  });

  describe('5. Dynamic Route Switching Verification', () => {
    it('deve alternar corretamente o estado de rota com mudanças no hash', () => {
      let currentHash = '';
      const getIsAdmin = () => isAdminRoute(currentHash);

      // 1. Inicializa na raiz (Player TV)
      expect(getIsAdmin()).toBe(false);

      // 2. Navega para a área administrativa
      currentHash = '#/admin';
      expect(getIsAdmin()).toBe(true);

      // 3. Navega para subrota administrativa
      currentHash = '#/admin/devices';
      expect(getIsAdmin()).toBe(true);

      // 4. Retorna para o player de TV
      currentHash = '#/';
      expect(getIsAdmin()).toBe(false);

      // 5. Hash vazio
      currentHash = '';
      expect(getIsAdmin()).toBe(false);
    });
  });
});
