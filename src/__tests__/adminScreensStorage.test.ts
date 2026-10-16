import './testHelper';
import { describe, it, expect, beforeEach } from 'bun:test';
import {
  ADMIN_SCREENS_STORAGE_KEY,
  ADMIN_SCREENS_STORAGE_VERSION,
  validatePairingCodeFormat,
  validateScreenRecord,
  parseAdminScreensStorage,
  createDefaultSeedScreens,
  AdminScreensStorageService,
} from '../components/admin/adminScreensStorage';
import { AdminScreenRecord } from '../types/admin';

describe('Phase C1: Administrative Screens Storage & Validation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('validatePairingCodeFormat', () => {
    it('accepts valid VTR-XXXX formats', () => {
      expect(validatePairingCodeFormat('VTR-7K9A')).toBe(true);
      expect(validatePairingCodeFormat('vtr-3m8p')).toBe(true);
      expect(validatePairingCodeFormat('VTR-ABCD')).toBe(true);
      expect(validatePairingCodeFormat('VTR-1234')).toBe(true);
      expect(validatePairingCodeFormat('  VTR-9999  ')).toBe(true);
    });

    it('rejects invalid pairing codes', () => {
      expect(validatePairingCodeFormat('')).toBe(false);
      expect(validatePairingCodeFormat('1234')).toBe(false);
      expect(validatePairingCodeFormat('VTR1234')).toBe(false);
      expect(validatePairingCodeFormat('VTR-')).toBe(false);
      expect(validatePairingCodeFormat('VTR-123')).toBe(false);
      expect(validatePairingCodeFormat('VTR-12345')).toBe(false);
      expect(validatePairingCodeFormat('VTR-!@#$')).toBe(false);
      expect(validatePairingCodeFormat(null as unknown as string)).toBe(false);
      expect(validatePairingCodeFormat(undefined as unknown as string)).toBe(false);
    });
  });

  describe('validateScreenRecord', () => {
    it('validates a complete valid record', () => {
      const candidate = {
        id: 'screen-1',
        pairingCode: 'vtr-8k2m',
        name: 'Painel Central',
        establishmentName: 'Loja 01',
        locationNotes: 'Frente de caixa',
        recordType: 'demo',
        status: 'active',
        platform: 'firetv',
        resolution: '1920x1080',
        orientation: 'landscape',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        telemetryNotice: 'Painel demo',
      };

      const result = validateScreenRecord(candidate);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('screen-1');
      expect(result?.pairingCode).toBe('VTR-8K2M'); // Uppercased
      expect(result?.name).toBe('Painel Central');
      expect(result?.platform).toBe('firetv');
      expect(result?.orientation).toBe('landscape');
    });

    it('rejects records with missing essential fields', () => {
      expect(validateScreenRecord(null)).toBeNull();
      expect(validateScreenRecord({})).toBeNull();
      expect(validateScreenRecord({ id: '', name: 'Test', pairingCode: 'VTR-1111', establishmentName: 'E' })).toBeNull();
      expect(validateScreenRecord({ id: 's1', name: '', pairingCode: 'VTR-1111', establishmentName: 'E' })).toBeNull();
      expect(validateScreenRecord({ id: 's1', name: 'Test', pairingCode: '', establishmentName: 'E' })).toBeNull();
    });

    it('supplies defaults for optional or missing metadata', () => {
      const minimal = {
        id: 'screen-min',
        pairingCode: 'VTR-2222',
        name: 'Tela Mínima',
        establishmentName: 'Geral',
      };

      const result = validateScreenRecord(minimal);
      expect(result).not.toBeNull();
      expect(result?.recordType).toBe('custom_local');
      expect(result?.status).toBe('pending');
      expect(result?.telemetryNotice).toContain('sem telemetria');
      expect(result?.createdAt).toBeDefined();
      expect(result?.updatedAt).toBeDefined();
    });
  });

  describe('parseAdminScreensStorage & safe corrupted data handling', () => {
    it('returns empty state without errors on null or empty string', () => {
      const resNull = parseAdminScreensStorage(null);
      expect(resNull.state.records).toEqual([]);
      expect(resNull.rawIsCorrupted).toBe(false);
      expect(resNull.errors.length).toBe(0);

      const resEmpty = parseAdminScreensStorage('');
      expect(resEmpty.state.records).toEqual([]);
      expect(resEmpty.rawIsCorrupted).toBe(false);
    });

    it('safely handles non-JSON corrupted string without crashing and flags rawIsCorrupted', () => {
      const resCorrupt = parseAdminScreensStorage('INVALID_JSON{{{{');
      expect(resCorrupt.rawIsCorrupted).toBe(true);
      expect(resCorrupt.state.records).toEqual([]);
      expect(resCorrupt.errors[0]).toContain('JSON parse error');
    });

    it('preserves valid records when partial malformed records are present', () => {
      const mixedPayload = JSON.stringify({
        version: 1,
        records: [
          {
            id: 'valid-1',
            pairingCode: 'VTR-1111',
            name: 'Tela Válida 1',
            establishmentName: 'Loja',
            recordType: 'demo',
            status: 'active',
          },
          {
            corrupted: true, // Missing id, pairingCode, name
          },
          {
            id: 'valid-2',
            pairingCode: 'VTR-2222',
            name: 'Tela Válida 2',
            establishmentName: 'Loja',
            recordType: 'custom_local',
            status: 'pending',
          },
        ],
      });

      const res = parseAdminScreensStorage(mixedPayload);
      expect(res.rawIsCorrupted).toBe(false);
      expect(res.validCount).toBe(2);
      expect(res.invalidCount).toBe(1);
      expect(res.state.records.length).toBe(2);
      expect(res.state.records[0].id).toBe('valid-1');
      expect(res.state.records[1].id).toBe('valid-2');
      expect(res.errors.length).toBe(1);
    });

    it('parses legacy array format correctly', () => {
      const legacyArray = JSON.stringify([
        {
          id: 'legacy-1',
          pairingCode: 'VTR-9999',
          name: 'Tela Legado',
          establishmentName: 'Loja Antiga',
        },
      ]);

      const res = parseAdminScreensStorage(legacyArray);
      expect(res.validCount).toBe(1);
      expect(res.state.records[0].id).toBe('legacy-1');
      expect(res.state.version).toBe(ADMIN_SCREENS_STORAGE_VERSION);
    });
  });

  describe('AdminScreensStorageService CRUD operations & isolation', () => {
    let service: AdminScreensStorageService;

    beforeEach(() => {
      service = new AdminScreensStorageService();
    });

    it('initializes default seed records when storage is empty', () => {
      expect(localStorage.getItem(ADMIN_SCREENS_STORAGE_KEY)).toBeNull();
      const { state } = service.loadScreens();

      expect(state.records.length).toBeGreaterThanOrEqual(3);
      expect(state.records[0].pairingCode.startsWith('VTR-')).toBe(true);
      // Confirmed stored in localStorage
      expect(localStorage.getItem(ADMIN_SCREENS_STORAGE_KEY)).not.toBeNull();
    });

    it('adds a new screen record and persists it', () => {
      const addRes = service.addScreen({
        pairingCode: 'vtr-55aa',
        name: 'TV Nova Entrada',
        establishmentName: 'Filial Sul',
        locationNotes: 'Corredor 1',
        recordType: 'custom_local',
        status: 'pending',
        platform: 'smarttv',
      });

      expect(addRes.success).toBe(true);
      expect(addRes.record).toBeDefined();
      expect(addRes.record?.pairingCode).toBe('VTR-55AA');
      expect(addRes.record?.id).toBeDefined();

      const { state } = service.loadScreens();
      const found = state.records.find((r) => r.pairingCode === 'VTR-55AA');
      expect(found).toBeDefined();
      expect(found?.name).toBe('TV Nova Entrada');
    });

    it('prevents adding a screen with duplicate pairing code', () => {
      service.addScreen({
        pairingCode: 'VTR-DUP1',
        name: 'TV Original',
        establishmentName: 'Filial 1',
      });

      const dupRes = service.addScreen({
        pairingCode: 'vtr-dup1', // same code in lowercase
        name: 'TV Duplicada',
        establishmentName: 'Filial 2',
      });

      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toContain('já está cadastrado');
    });

    it('prevents adding a screen with invalid pairing code format', () => {
      const badRes = service.addScreen({
        pairingCode: 'INVALID-CODE',
        name: 'TV Invalida',
        establishmentName: 'Filial',
      });

      expect(badRes.success).toBe(false);
      expect(badRes.error).toContain('formato exigido é VTR-XXXX');
    });

    it('updates an existing screen record safely', () => {
      const addRes = service.addScreen({
        pairingCode: 'VTR-UPDT',
        name: 'Nome Antigo',
        establishmentName: 'Loja A',
      });

      const screenId = addRes.record!.id;
      const initialCreatedAt = addRes.record!.createdAt;

      const updateRes = service.updateScreen(screenId, {
        name: 'Nome Atualizado',
        locationNotes: 'Nova localização',
        status: 'active',
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.record?.name).toBe('Nome Atualizado');
      expect(updateRes.record?.locationNotes).toBe('Nova localização');
      expect(updateRes.record?.status).toBe('active');
      expect(updateRes.record?.createdAt).toBe(initialCreatedAt); // Immutable createdAt
    });

    it('deletes an existing screen record', () => {
      const addRes = service.addScreen({
        pairingCode: 'VTR-DEL1',
        name: 'Tela para Deletar',
        establishmentName: 'Loja',
      });

      const screenId = addRes.record!.id;
      const delRes = service.deleteScreen(screenId);
      expect(delRes.success).toBe(true);

      const { state } = service.loadScreens();
      expect(state.records.find((r) => r.id === screenId)).toBeUndefined();
    });

    it('fails gracefully when updating or deleting non-existent ID', () => {
      const updateRes = service.updateScreen('non-existent-id', { name: 'X' });
      expect(updateRes.success).toBe(false);

      const delRes = service.deleteScreen('non-existent-id');
      expect(delRes.success).toBe(false);
    });

    it('strictly isolates admin storage from TV runtime storage keys', () => {
      // Simulate existing TV runtime credentials
      localStorage.setItem('vitrion_tv_device_id', 'tv-hardware-uuid-1234');
      localStorage.setItem('vitrion_tv_pairing_code', 'VTR-TV01');

      // Perform admin operations
      service.addScreen({
        pairingCode: 'VTR-ADM1',
        name: 'Tela Admin',
        establishmentName: 'Loja',
      });

      // TV runtime credentials MUST BE UNCHANGED
      expect(localStorage.getItem('vitrion_tv_device_id')).toBe('tv-hardware-uuid-1234');
      expect(localStorage.getItem('vitrion_tv_pairing_code')).toBe('VTR-TV01');

      // Admin read helper safely inspects without modifying
      const tvProfile = service.readCurrentBrowserTVProfile();
      expect(tvProfile?.deviceId).toBe('tv-hardware-uuid-1234');
      expect(tvProfile?.pairingCode).toBe('VTR-TV01');

      // TV keys remain untouched
      expect(localStorage.getItem('vitrion_tv_device_id')).toBe('tv-hardware-uuid-1234');
    });
  });
});
