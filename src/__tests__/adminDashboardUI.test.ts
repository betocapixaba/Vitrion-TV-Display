import './testHelper';
import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { resolveAdminSection, ADMIN_NAV_ITEMS } from '../components/admin/adminNavigation';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminHeader } from '../components/admin/AdminHeader';
import { AdminLayout } from '../components/admin/AdminLayout';
import { SectionOverview } from '../components/admin/sections/SectionOverview';
import { SectionScreens } from '../components/admin/sections/SectionScreens';
import { SectionPlaylists } from '../components/admin/sections/SectionPlaylists';
import { SectionMedia } from '../components/admin/sections/SectionMedia';
import { SectionEstablishments } from '../components/admin/sections/SectionEstablishments';
import { SectionCampaigns } from '../components/admin/sections/SectionCampaigns';
import { SectionSettings } from '../components/admin/sections/SectionSettings';

describe('Vitrion TV Display — Phase B: Administrative Dashboard UI Foundation Tests', () => {
  describe('1. Section Resolution from Hash (resolveAdminSection)', () => {
    it('deve mapear #/admin e #/admin/ para overview', () => {
      expect(resolveAdminSection('#/admin')).toBe('overview');
      expect(resolveAdminSection('#/admin/')).toBe('overview');
      expect(resolveAdminSection('')).toBe('overview');
    });

    it('deve mapear #/admin/screens para screens', () => {
      expect(resolveAdminSection('#/admin/screens')).toBe('screens');
      expect(resolveAdminSection('#/admin/screens/123')).toBe('screens');
    });

    it('deve mapear #/admin/playlists para playlists', () => {
      expect(resolveAdminSection('#/admin/playlists')).toBe('playlists');
    });

    it('deve mapear #/admin/media para media', () => {
      expect(resolveAdminSection('#/admin/media')).toBe('media');
    });

    it('deve mapear #/admin/establishments para establishments', () => {
      expect(resolveAdminSection('#/admin/establishments')).toBe('establishments');
    });

    it('deve mapear #/admin/campaigns para campaigns', () => {
      expect(resolveAdminSection('#/admin/campaigns')).toBe('campaigns');
    });

    it('deve mapear #/admin/settings para settings', () => {
      expect(resolveAdminSection('#/admin/settings')).toBe('settings');
    });

    it('deve ignorar query params na resolução da seção', () => {
      expect(resolveAdminSection('#/admin/screens?filter=online')).toBe('screens');
      expect(resolveAdminSection('#/admin/playlists?sort=desc')).toBe('playlists');
    });
  });

  describe('2. Navigation Structure & Sidebar Content', () => {
    it('deve conter todos os 7 módulos exigidos no ADMIN_NAV_ITEMS', () => {
      const ids = ADMIN_NAV_ITEMS.map((item) => item.id);
      expect(ids).toContain('overview');
      expect(ids).toContain('screens');
      expect(ids).toContain('playlists');
      expect(ids).toContain('media');
      expect(ids).toContain('establishments');
      expect(ids).toContain('campaigns');
      expect(ids).toContain('settings');
      expect(ADMIN_NAV_ITEMS.length).toBe(7);
    });

    it('deve renderizar a barra lateral com a marca VITRION e etiqueta ADMIN', () => {
      const html = renderToString(
        React.createElement(AdminSidebar, {
          currentSection: 'overview',
          onNavigate: () => {},
          onReturnToTv: () => {},
          isOpenMobile: false,
          onCloseMobile: () => {},
        })
      );

      expect(html).toContain('VITRION');
      expect(html).toContain('ADMIN');
      expect(html).toContain('Visão Geral');
      expect(html).toContain('Telas &amp; Dispositivos');
      expect(html).toContain('Playlists');
      expect(html).toContain('Biblioteca de Mídia');
      expect(html).toContain('Estabelecimentos');
      expect(html).toContain('Campanhas &amp; Anúncios');
      expect(html).toContain('Configurações');
      expect(html).toContain('Player TV');
    });

    it('deve destacar a seção ativa na barra lateral', () => {
      const html = renderToString(
        React.createElement(AdminSidebar, {
          currentSection: 'screens',
          onNavigate: () => {},
          onReturnToTv: () => {},
          isOpenMobile: false,
          onCloseMobile: () => {},
        })
      );

      // Deve ter estilo visual ativo
      expect(html).toContain('text-sky-400');
    });
  });

  describe('3. Header Rendering & Title Sync', () => {
    it('deve exibir o título correspondente à seção atual', () => {
      const htmlScreens = renderToString(
        React.createElement(AdminHeader, {
          currentSection: 'screens',
          onOpenMobileSidebar: () => {},
          onReturnToTv: () => {},
        })
      );
      expect(htmlScreens).toContain('Telas &amp; Dispositivos');

      const htmlPlaylists = renderToString(
        React.createElement(AdminHeader, {
          currentSection: 'playlists',
          onOpenMobileSidebar: () => {},
          onReturnToTv: () => {},
        })
      );
      expect(htmlPlaylists).toContain('Playlists');
    });

    it('deve renderizar o botão para alternar de volta para o Player de TV', () => {
      const html = renderToString(
        React.createElement(AdminHeader, {
          currentSection: 'overview',
          onOpenMobileSidebar: () => {},
          onReturnToTv: () => {},
        })
      );
      expect(html).toContain('Tela TV');
    });
  });

  describe('4. Dashboard Views & Individual Sections Rendering', () => {
    it('deve renderizar a tela de Visão Geral com cards dos módulos', () => {
      const html = renderToString(
        React.createElement(SectionOverview, {
          onNavigate: () => {},
        })
      );
      expect(html).toContain('Painel Administrativo Vitrion Digital Signage');
      expect(html).toContain('Módulos Administrativos do Sistema');
      expect(html).toContain('7 Módulos');
    });

    it('deve renderizar a tela de Telas & Dispositivos com preparação para Fase C', () => {
      const html = renderToString(React.createElement(SectionScreens));
      expect(html).toContain('Telas &amp; Dispositivos');
      expect(html).toContain('Módulo de Gestão de Telas');
      expect(html).toContain('Fase C');
    });

    it('deve renderizar a tela de Playlists com preparação para Fase D', () => {
      const html = renderToString(React.createElement(SectionPlaylists));
      expect(html).toContain('Playlists &amp; Grades de Exibição');
      expect(html).toContain('Módulo de Gestão de Playlists');
      expect(html).toContain('Fase D');
    });

    it('deve renderizar a tela de Mídias com preparação para Fase D', () => {
      const html = renderToString(React.createElement(SectionMedia));
      expect(html).toContain('Biblioteca de Mídia');
      expect(html).toContain('Módulo de Gestão de Mídias');
      expect(html).toContain('Fase D');
    });

    it('deve renderizar a tela de Estabelecimentos', () => {
      const html = renderToString(React.createElement(SectionEstablishments));
      expect(html).toContain('Estabelecimentos Comerciais');
      expect(html).toContain('Hierarquia de Lojas');
    });

    it('deve renderizar a tela de Campanhas & Anúncios', () => {
      const html = renderToString(React.createElement(SectionCampaigns));
      expect(html).toContain('Campanhas &amp; Anúncios');
      expect(html).toContain('Proof-of-Play (PoP)');
    });

    it('deve renderizar a tela de Configurações detalhando o isolamento de TV', () => {
      const html = renderToString(
        React.createElement(SectionSettings, {
          onReturnToTv: () => {},
        })
      );
      expect(html).toContain('Configurações do Sistema');
      expect(html).toContain('Desktop Web Administration');
      expect(html).toContain('Screen Wake Lock de TV');
      expect(html).toContain('Inativo nesta aba');
    });
  });

  describe('5. AdminDashboard Integrated Shell Routing', () => {
    it('deve renderizar a rota padrão #/admin com a Visão Geral', () => {
      const html = renderToString(
        React.createElement(AdminDashboard, {
          currentHash: '#/admin',
        })
      );
      expect(html).toContain('VITRION');
      expect(html).toContain('ADMIN');
      expect(html).toContain('Painel Administrativo Vitrion Digital Signage');
    });

    it('deve renderizar a rota #/admin/screens com a seção de Telas', () => {
      const html = renderToString(
        React.createElement(AdminDashboard, {
          currentHash: '#/admin/screens',
        })
      );
      expect(html).toContain('Telas &amp; Dispositivos');
      expect(html).toContain('Módulo de Gestão de Telas');
    });

    it('deve renderizar a rota #/admin/playlists com a seção de Playlists', () => {
      const html = renderToString(
        React.createElement(AdminDashboard, {
          currentHash: '#/admin/playlists',
        })
      );
      expect(html).toContain('Playlists &amp; Grades de Exibição');
    });

    it('deve garantir que o dashboard não contenha elementos do player de 10 pés da TV', () => {
      const html = renderToString(
        React.createElement(AdminDashboard, {
          currentHash: '#/admin',
        })
      );
      expect(html).not.toContain('Pressione MENU');
      expect(html).not.toContain('Código de Ativação da TV');
    });
  });
});
