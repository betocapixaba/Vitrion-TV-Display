import './testHelper';
import { describe, it, expect, beforeEach } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SectionScreens } from '../components/admin/sections/SectionScreens';
import { ScreenModal } from '../components/admin/screens/ScreenModal';
import { ScreenDeleteModal } from '../components/admin/screens/ScreenDeleteModal';
import { ScreenDetailsModal } from '../components/admin/screens/ScreenDetailsModal';
import {
  adminScreensStorage,
  ADMIN_SCREENS_STORAGE_KEY,
} from '../components/admin/adminScreensStorage';
import { AdminScreenRecord } from '../types/admin';

describe('Vitrion TV Display — Phase C2: Administrative Screens & Devices UI Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  describe('1. SectionScreens Layout & Metric Badges', () => {
    it('deve renderizar o cabeçalho com título e identificador de módulo', () => {
      const html = renderToString(React.createElement(SectionScreens));
      expect(html).toContain('Telas &amp; Dispositivos');
      expect(html).toContain('Módulo de Gestão de Telas — Fase C');
      expect(html).toContain('Vincular Nova Tela');
    });

    it('deve exibir os 4 cartões de indicadores (Total, Ativas, Pendentes, Demonstração)', () => {
      const html = renderToString(React.createElement(SectionScreens));
      expect(html).toContain('Total de Telas');
      expect(html).toContain('Ativas / Prontas');
      expect(html).toContain('Pendentes');
      expect(html).toContain('Demonstração');
      expect(html).toContain('Cadastradas localmente');
    });

    it('deve exibir o aviso transparente de arquitetura e armazenamento local', () => {
      const html = renderToString(React.createElement(SectionScreens));
      expect(html).toContain('Aviso de Arquitetura &amp; Isolamento Local');
      expect(html).toContain(ADMIN_SCREENS_STORAGE_KEY);
      expect(html).toContain('sem telemetria remota ativa');
    });

    it('deve renderizar os controles de busca e os seletores de filtros', () => {
      const html = renderToString(React.createElement(SectionScreens));
      expect(html).toContain('Buscar por nome, código (VTR-XXXX)');
      expect(html).toContain('Todos os Status');
      expect(html).toContain('Todos os Estabelecimentos');
      expect(html).toContain('Todos os Tipos');
    });
  });

  describe('2. Rendering Screen Cards with Honest Badges', () => {
    it('deve renderizar as telas padrão com códigos formatados e badges de tipo', () => {
      const html = renderToString(React.createElement(SectionScreens));
      
      // Default seed screens include VTR-7K9A, VTR-3M8P, VTR-9X2L
      expect(html).toContain('VTR-7K9A');
      expect(html).toContain('VTR-3M8P');
      expect(html).toContain('VTR-9X2L');
      expect(html).toContain('Painel Entrada Principal');
      expect(html).toContain('Totem Vertical Hortifruti');
      expect(html).toContain('Supermercado Central');

      // Honest telemetry and type badges
      expect(html).toContain('Ativa (Pronta)');
      expect(html).toContain('Pendente');
      expect(html).toContain('Exemplo / Demo');
      expect(html).toContain('1920x1080');
      expect(html).toContain('Horizontal');
    });

    it('deve renderizar botões de ação para cada tela (Detalhes, Editar, Excluir, Copiar)', () => {
      const html = renderToString(React.createElement(SectionScreens));
      expect(html).toContain('Detalhes');
      expect(html).toContain('aria-label="Editar Painel Entrada Principal"');
      expect(html).toContain('aria-label="Remover Painel Entrada Principal"');
      expect(html).toContain('aria-label="Copiar código VTR-7K9A"');
    });
  });

  describe('3. Local TV Browser Profile Detection & Banner', () => {
    it('deve exibir banner para vincular quando TV deste navegador for detectada e não estiver na lista', () => {
      // Set TV profile in localStorage
      window.localStorage.setItem('vitrion_tv_device_id', 'device-test-tv-uuid');
      window.localStorage.setItem('vitrion_tv_pairing_code', 'VTR-9999');

      const html = renderToString(React.createElement(SectionScreens));
      expect(html).toContain('Dispositivo de TV Local Detectado neste Navegador');
      expect(html).toContain('VTR-9999');
      expect(html).toContain('Vincular TV Deste Navegador');
    });

    it('NÃO deve exibir banner de vinculação se o código da TV local já estiver cadastrado', () => {
      // Seed storage with VTR-7K9A which is already in default screens
      window.localStorage.setItem('vitrion_tv_device_id', 'device-test-tv-uuid');
      window.localStorage.setItem('vitrion_tv_pairing_code', 'VTR-7K9A');

      const html = renderToString(React.createElement(SectionScreens));
      // Since VTR-7K9A is already in the seed records, the banner should not prompt to link
      expect(html).not.toContain('Dispositivo de TV Local Detectado neste Navegador');
    });
  });

  describe('4. ScreenModal (Create & Edit Dialog)', () => {
    it('não deve renderizar nada quando isOpen=false', () => {
      const html = renderToString(
        React.createElement(ScreenModal, {
          isOpen: false,
          onClose: () => {},
          onSaved: () => {},
          existingScreens: [],
        })
      );
      expect(html).toBe('');
    });

    it('deve renderizar o modal em modo de criação quando isOpen=true e editingScreen=null', () => {
      const html = renderToString(
        React.createElement(ScreenModal, {
          isOpen: true,
          onClose: () => {},
          onSaved: () => {},
          existingScreens: [],
        })
      );
      expect(html).toContain('Vincular Nova Tela Local');
      expect(html).toContain('Nome da Tela / Ponto');
      expect(html).toContain('Código de Pareamento');
      expect(html).toContain('Estabelecimento / Unidade');
      expect(html).toContain('Status Operacional');
      expect(html).toContain('Tipo de Registro');
      expect(html).toContain('Plataforma / Dispositivo');
      expect(html).toContain('Resolução da Tela');
      expect(html).toContain('Cadastrar Tela');
      expect(html).toContain('Transparência de Arquitetura &amp; Telemetria');
    });

    it('deve renderizar o modal em modo de edição com dados pré-preenchidos', () => {
      const sampleScreen: AdminScreenRecord = {
        id: 'screen-test-01',
        pairingCode: 'VTR-7777',
        name: 'Tela Teste Painel',
        establishmentName: 'Hospital São Lucas',
        locationNotes: 'Recepção 2º andar',
        recordType: 'custom_local',
        status: 'active',
        platform: 'firetv',
        resolution: '3840x2160',
        orientation: 'landscape',
        createdAt: '2026-10-15T10:00:00.000Z',
        updatedAt: '2026-10-15T10:00:00.000Z',
        telemetryNotice: 'Aviso teste',
      };

      const html = renderToString(
        React.createElement(ScreenModal, {
          isOpen: true,
          onClose: () => {},
          onSaved: () => {},
          editingScreen: sampleScreen,
          existingScreens: [sampleScreen],
        })
      );

      expect(html).toContain('Editar Metadados da Tela');
      expect(html).toContain('Atualizando registro: Tela Teste Painel');
      expect(html).toContain('value="Tela Teste Painel"');
      expect(html).toContain('value="VTR-7777"');
      expect(html).toContain('value="Hospital São Lucas"');
      expect(html).toContain('Salvar Alterações');
    });

    it('deve exibir botão de preenchimento rápido se TV local for detectada', () => {
      const html = renderToString(
        React.createElement(ScreenModal, {
          isOpen: true,
          onClose: () => {},
          onSaved: () => {},
          existingScreens: [],
          detectedLocalProfile: {
            deviceId: 'test-device-id',
            pairingCode: 'VTR-5555',
          },
        })
      );

      expect(html).toContain('TV local detectada neste navegador');
      expect(html).toContain('VTR-5555');
      expect(html).toContain('Usar dados locais');
    });
  });

  describe('5. ScreenDeleteModal (Safe Removal Dialog)', () => {
    it('não deve renderizar nada quando isOpen=false ou screen=null', () => {
      const html = renderToString(
        React.createElement(ScreenDeleteModal, {
          isOpen: false,
          screen: null,
          onClose: () => {},
          onConfirm: () => {},
        })
      );
      expect(html).toBe('');
    });

    it('deve exibir confirmação com nome, código e aviso de impacto local', () => {
      const sampleScreen: AdminScreenRecord = {
        id: 'screen-to-delete',
        pairingCode: 'VTR-8888',
        name: 'TV Corredor Farmácia',
        establishmentName: 'Farmácia Popular',
        recordType: 'custom_local',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        telemetryNotice: 'Local',
      };

      const html = renderToString(
        React.createElement(ScreenDeleteModal, {
          isOpen: true,
          screen: sampleScreen,
          onClose: () => {},
          onConfirm: () => {},
        })
      );

      expect(html).toContain('Remover Tela do Painel?');
      expect(html).toContain('TV Corredor Farmácia');
      expect(html).toContain('VTR-8888');
      expect(html).toContain('Farmácia Popular');
      expect(html).toContain(ADMIN_SCREENS_STORAGE_KEY);
      expect(html).toContain('A TV física e suas mídias offline não serão afetadas');
      expect(html).toContain('Confirmar Remoção');
    });
  });

  describe('6. ScreenDetailsModal (Full View Dialog)', () => {
    it('não deve renderizar nada quando isOpen=false', () => {
      const html = renderToString(
        React.createElement(ScreenDetailsModal, {
          isOpen: false,
          screen: null,
          onClose: () => {},
          onEdit: () => {},
        })
      );
      expect(html).toBe('');
    });

    it('deve exibir todos os metadados e notas honestas de telemetria', () => {
      const sampleScreen: AdminScreenRecord = {
        id: 'screen-detail-view',
        pairingCode: 'VTR-3333',
        name: 'Totem Vertical Shopping',
        establishmentName: 'Shopping Plaza',
        locationNotes: 'Entrada B - Praça de Alimentação',
        recordType: 'custom_local',
        status: 'active',
        platform: 'smarttv',
        resolution: '1080x1920',
        orientation: 'portrait',
        createdAt: '2026-10-15T08:00:00.000Z',
        updatedAt: '2026-10-15T09:00:00.000Z',
        telemetryNotice: 'Conectado à rede cabeada local',
      };

      const html = renderToString(
        React.createElement(ScreenDetailsModal, {
          isOpen: true,
          screen: sampleScreen,
          onClose: () => {},
          onEdit: () => {},
        })
      );

      expect(html).toContain('Totem Vertical Shopping');
      expect(html).toContain('screen-detail-view');
      expect(html).toContain('VTR-3333');
      expect(html).toContain('Shopping Plaza');
      expect(html).toContain('Entrada B - Praça de Alimentação');
      expect(html).toContain('1080x1920');
      expect(html).toContain('Vertical');
      expect(html).toContain('smarttv');
      expect(html).toContain('Conectado à rede cabeada local');
      expect(html).toContain('Status de Telemetria e Sincronização');
      expect(html).toContain('Editar Tela');
    });
  });

  describe('7. Safety & Isolation Verification', () => {
    it('renderizar SectionScreens não deve alterar as chaves da TV do navegador nem apagar vitrion_tv_device_id', () => {
      window.localStorage.setItem('vitrion_tv_device_id', 'keep-this-tv-id');
      window.localStorage.setItem('vitrion_tv_pairing_code', 'VTR-KEEP');

      renderToString(React.createElement(SectionScreens));

      expect(window.localStorage.getItem('vitrion_tv_device_id')).toBe('keep-this-tv-id');
      expect(window.localStorage.getItem('vitrion_tv_pairing_code')).toBe('VTR-KEEP');
    });
  });
});
