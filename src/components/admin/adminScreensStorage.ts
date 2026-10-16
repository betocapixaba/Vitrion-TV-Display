/**
 * Vitrion TV Display - Administrative Screens Storage Service (Phase C1)
 * 
 * Strict isolation rules:
 * - Uses exclusive key 'vitrion_admin_screens_v1' in localStorage.
 * - Never modifies TV runtime keys (vitrion_tv_device_id, vitrion_tv_pairing_code, IndexedDB).
 * - Never deletes or overwrites existing valid records when partial malformed data is found.
 * - Safely handles JSON parse failures without clobbering corrupted data.
 */

import {
  AdminScreenRecord,
  AdminScreensState,
  ScreenOperationalStatus,
  ScreenRecordType,
} from '../../types/admin';

export const ADMIN_SCREENS_STORAGE_KEY = 'vitrion_admin_screens_v1';
export const ADMIN_SCREENS_STORAGE_VERSION = 1;

/**
 * Validates pairing code format (VTR-XXXX where XXXX is 4 alphanumeric chars).
 */
export function validatePairingCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  return /^VTR-[A-Z0-9]{4}$/i.test(code.trim());
}

/**
 * Generates an isolated unique ID for administrative screen records.
 */
export function generateAdminRecordId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `adm-scr-${crypto.randomUUID()}`;
  }
  return `adm-scr-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;
}

/**
 * Safe validator for single screen record.
 * Returns the sanitized record if valid, or null if essential fields are missing/invalid.
 */
export function validateScreenRecord(data: unknown): AdminScreenRecord | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const item = data as Record<string, unknown>;

  // Check required string fields
  if (typeof item.id !== 'string' || item.id.trim() === '') return null;
  if (typeof item.pairingCode !== 'string' || item.pairingCode.trim() === '') return null;
  if (typeof item.name !== 'string' || item.name.trim() === '') return null;
  if (typeof item.establishmentName !== 'string') return null;

  // Validate recordType
  const allowedTypes: ScreenRecordType[] = ['current_device', 'demo', 'custom_local'];
  const recordType: ScreenRecordType = allowedTypes.includes(item.recordType as ScreenRecordType)
    ? (item.recordType as ScreenRecordType)
    : 'custom_local';

  // Validate status
  const allowedStatuses: ScreenOperationalStatus[] = ['active', 'pending', 'offline_demo'];
  const status: ScreenOperationalStatus = allowedStatuses.includes(item.status as ScreenOperationalStatus)
    ? (item.status as ScreenOperationalStatus)
    : 'pending';

  // Validate timestamps
  const createdAt = typeof item.createdAt === 'string' && item.createdAt.trim() !== ''
    ? item.createdAt
    : new Date().toISOString();

  const updatedAt = typeof item.updatedAt === 'string' && item.updatedAt.trim() !== ''
    ? item.updatedAt
    : createdAt;

  // Telemetry notice
  const telemetryNotice = typeof item.telemetryNotice === 'string' && item.telemetryNotice.trim() !== ''
    ? item.telemetryNotice
    : 'Painel local (sem telemetria remota ativa)';

  // Optional fields
  const locationNotes = typeof item.locationNotes === 'string' ? item.locationNotes : undefined;
  
  const platform = (item.platform === 'firetv' || item.platform === 'smarttv' || item.platform === 'browser' || item.platform === 'unknown')
    ? item.platform
    : undefined;

  const resolution = typeof item.resolution === 'string' ? item.resolution : undefined;
  
  const orientation = (item.orientation === 'landscape' || item.orientation === 'portrait')
    ? item.orientation
    : undefined;

  return {
    id: item.id.trim(),
    pairingCode: item.pairingCode.trim().toUpperCase(),
    name: item.name.trim(),
    establishmentName: item.establishmentName.trim(),
    locationNotes,
    recordType,
    status,
    platform,
    resolution,
    orientation,
    createdAt,
    updatedAt,
    telemetryNotice,
  };
}

/**
 * Result of parsing local admin screens storage.
 */
export interface ParseStorageResult {
  state: AdminScreensState;
  validCount: number;
  invalidCount: number;
  errors: string[];
  rawIsCorrupted: boolean;
}

/**
 * Safely parses raw JSON from storage without losing existing valid data.
 */
export function parseAdminScreensStorage(raw: string | null): ParseStorageResult {
  const defaultEmptyState: AdminScreensState = {
    version: ADMIN_SCREENS_STORAGE_VERSION,
    records: [],
    lastModified: new Date().toISOString(),
  };

  if (!raw || raw.trim() === '') {
    return {
      state: defaultEmptyState,
      validCount: 0,
      invalidCount: 0,
      errors: [],
      rawIsCorrupted: false,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      state: defaultEmptyState,
      validCount: 0,
      invalidCount: 0,
      errors: [`JSON parse error: ${err instanceof Error ? err.message : String(err)}`],
      rawIsCorrupted: true,
    };
  }

  // Handle both { version, records } object and legacy plain array []
  let rawRecords: unknown[] = [];
  let version = ADMIN_SCREENS_STORAGE_VERSION;
  let lastModified = new Date().toISOString();

  if (Array.isArray(parsed)) {
    rawRecords = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.records)) {
      rawRecords = obj.records;
    }
    if (typeof obj.version === 'number') {
      version = obj.version;
    }
    if (typeof obj.lastModified === 'string') {
      lastModified = obj.lastModified;
    }
  } else {
    return {
      state: defaultEmptyState,
      validCount: 0,
      invalidCount: 1,
      errors: ['Stored admin screens data is neither an array nor an object container'],
      rawIsCorrupted: true,
    };
  }

  const validRecords: AdminScreenRecord[] = [];
  const errors: string[] = [];
  let invalidCount = 0;

  for (let i = 0; i < rawRecords.length; i++) {
    const candidate = rawRecords[i];
    const validated = validateScreenRecord(candidate);
    if (validated) {
      validRecords.push(validated);
    } else {
      invalidCount++;
      errors.push(`Record at index ${i} failed schema validation and was skipped to protect state integrity`);
    }
  }

  return {
    state: {
      version,
      records: validRecords,
      lastModified,
    },
    validCount: validRecords.length,
    invalidCount,
    errors,
    rawIsCorrupted: false,
  };
}

/**
 * Creates starter seed records for fresh admin setups.
 * Clearly marks records as demo or current local browser to maintain honesty.
 */
export function createDefaultSeedScreens(): AdminScreenRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'screen-demo-01',
      pairingCode: 'VTR-7K9A',
      name: 'Painel Entrada Principal',
      establishmentName: 'Supermercado Central',
      locationNotes: 'Área dos caixas 1-4 (Visão frontal)',
      recordType: 'demo',
      status: 'active',
      platform: 'firetv',
      resolution: '1920x1080',
      orientation: 'landscape',
      createdAt: now,
      updatedAt: now,
      telemetryNotice: 'Dispositivo demonstrativo pré-cadastrado no painel local',
    },
    {
      id: 'screen-demo-02',
      pairingCode: 'VTR-3M8P',
      name: 'Totem Vertical Hortifruti',
      establishmentName: 'Supermercado Central',
      locationNotes: 'Corredor A - Entrada do hortifruti',
      recordType: 'demo',
      status: 'active',
      platform: 'smarttv',
      resolution: '1080x1920',
      orientation: 'portrait',
      createdAt: now,
      updatedAt: now,
      telemetryNotice: 'Dispositivo demonstrativo pré-cadastrado no painel local',
    },
    {
      id: 'screen-demo-03',
      pairingCode: 'VTR-9X2L',
      name: 'TV Recepção / Sala de Espera',
      establishmentName: 'Clínica Bem Viver',
      locationNotes: 'Recepção térreo',
      recordType: 'demo',
      status: 'pending',
      platform: 'browser',
      resolution: '1920x1080',
      orientation: 'landscape',
      createdAt: now,
      updatedAt: now,
      telemetryNotice: 'Aguardando sincronização de playlist',
    },
  ];
}

export type CreateAdminScreenInput = Omit<
  AdminScreenRecord,
  'id' | 'createdAt' | 'updatedAt' | 'telemetryNotice' | 'recordType' | 'status'
> & {
  id?: string;
  telemetryNotice?: string;
  recordType?: ScreenRecordType;
  status?: ScreenOperationalStatus;
};

/**
 * Safe local storage repository for administrative screens.
 */
export class AdminScreensStorageService {
  private memoryCache: AdminScreensState | null = null;

  /**
   * Loads administrative screens.
   * If storage is empty, initializes with default seed records.
   */
  loadScreens(): { state: AdminScreensState; errors: string[]; rawCorrupted: boolean } {
    let raw: string | null = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(ADMIN_SCREENS_STORAGE_KEY);
      }
    } catch (e) {
      return {
        state: this.memoryCache || { version: ADMIN_SCREENS_STORAGE_VERSION, records: [], lastModified: new Date().toISOString() },
        errors: [`Cannot access localStorage: ${e instanceof Error ? e.message : String(e)}`],
        rawCorrupted: false,
      };
    }

    // If storage is completely empty, initialize with default seed records
    if (raw === null) {
      const defaultRecords = createDefaultSeedScreens();
      const initialState: AdminScreensState = {
        version: ADMIN_SCREENS_STORAGE_VERSION,
        records: defaultRecords,
        lastModified: new Date().toISOString(),
      };
      this.saveScreens(initialState.records);
      this.memoryCache = initialState;
      return {
        state: initialState,
        errors: [],
        rawCorrupted: false,
      };
    }

    const parseResult = parseAdminScreensStorage(raw);
    this.memoryCache = parseResult.state;
    return {
      state: parseResult.state,
      errors: parseResult.errors,
      rawCorrupted: parseResult.rawIsCorrupted,
    };
  }

  /**
   * Persists screens array to localStorage safely.
   */
  saveScreens(records: AdminScreenRecord[]): { success: boolean; error?: string } {
    try {
      const state: AdminScreensState = {
        version: ADMIN_SCREENS_STORAGE_VERSION,
        records,
        lastModified: new Date().toISOString(),
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(ADMIN_SCREENS_STORAGE_KEY, JSON.stringify(state));
      }
      this.memoryCache = state;
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: `Failed to persist admin screens: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  /**
   * Adds a new screen record.
   */
  addScreen(
    data: CreateAdminScreenInput
  ): { success: boolean; record?: AdminScreenRecord; error?: string } {
    const { state } = this.loadScreens();

    const normalizedCode = data.pairingCode.trim().toUpperCase();
    if (!validatePairingCodeFormat(normalizedCode)) {
      return {
        success: false,
        error: `Código de pareamento inválido ("${data.pairingCode}"). O formato exigido é VTR-XXXX (ex: VTR-8K2M).`,
      };
    }

    if (!data.name || data.name.trim() === '') {
      return { success: false, error: 'O nome da tela / dispositivo é obrigatório.' };
    }

    // Check duplicate pairing code
    const existing = state.records.find(
      (r) => r.pairingCode.toUpperCase() === normalizedCode
    );
    if (existing) {
      return {
        success: false,
        error: `O código de pareamento ${normalizedCode} já está cadastrado para a tela "${existing.name}".`,
      };
    }

    const now = new Date().toISOString();
    const newRecord: AdminScreenRecord = {
      id: data.id?.trim() || generateAdminRecordId(),
      pairingCode: normalizedCode,
      name: data.name.trim(),
      establishmentName: data.establishmentName.trim() || 'Geral',
      locationNotes: data.locationNotes?.trim(),
      recordType: data.recordType || 'custom_local',
      status: data.status || 'pending',
      platform: data.platform || 'unknown',
      resolution: data.resolution || '1920x1080',
      orientation: data.orientation || 'landscape',
      createdAt: now,
      updatedAt: now,
      telemetryNotice: data.telemetryNotice || 'Cadastrado no painel local (sem telemetria remota)',
    };

    const updatedList = [newRecord, ...state.records];
    const saveRes = this.saveScreens(updatedList);
    if (!saveRes.success) {
      return { success: false, error: saveRes.error };
    }

    return { success: true, record: newRecord };
  }

  /**
   * Updates an existing screen record.
   */
  updateScreen(
    id: string,
    updates: Partial<Omit<AdminScreenRecord, 'id' | 'createdAt'>>
  ): { success: boolean; record?: AdminScreenRecord; error?: string } {
    const { state } = this.loadScreens();
    const index = state.records.findIndex((r) => r.id === id);

    if (index === -1) {
      return { success: false, error: `Tela com ID "${id}" não foi encontrada.` };
    }

    const current = state.records[index];

    // If pairing code is being updated, validate and ensure uniqueness
    let normalizedCode = current.pairingCode;
    if (updates.pairingCode && updates.pairingCode !== current.pairingCode) {
      normalizedCode = updates.pairingCode.trim().toUpperCase();
      if (!validatePairingCodeFormat(normalizedCode)) {
        return {
          success: false,
          error: `Código de pareamento inválido ("${updates.pairingCode}"). O formato exigido é VTR-XXXX.`,
        };
      }
      const duplicate = state.records.find(
        (r) => r.id !== id && r.pairingCode.toUpperCase() === normalizedCode
      );
      if (duplicate) {
        return {
          success: false,
          error: `O código ${normalizedCode} já está em uso por "${duplicate.name}".`,
        };
      }
    }

    const updatedRecord: AdminScreenRecord = {
      ...current,
      ...updates,
      pairingCode: normalizedCode,
      id: current.id, // Immutable ID
      createdAt: current.createdAt, // Immutable createdAt
      updatedAt: new Date().toISOString(),
    };

    const updatedList = [...state.records];
    updatedList[index] = updatedRecord;

    const saveRes = this.saveScreens(updatedList);
    if (!saveRes.success) {
      return { success: false, error: saveRes.error };
    }

    return { success: true, record: updatedRecord };
  }

  /**
   * Deletes a screen record by ID.
   */
  deleteScreen(id: string): { success: boolean; error?: string } {
    const { state } = this.loadScreens();
    const initialLen = state.records.length;
    const filtered = state.records.filter((r) => r.id !== id);

    if (filtered.length === initialLen) {
      return { success: false, error: `Tela com ID "${id}" não foi encontrada para exclusão.` };
    }

    return this.saveScreens(filtered);
  }

  /**
   * Read-only helper: inspects the current TV device credentials in this browser,
   * without modifying them or touching IndexedDB.
   */
  readCurrentBrowserTVProfile(): {
    deviceId?: string;
    pairingCode?: string;
  } | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const deviceId = window.localStorage.getItem('vitrion_tv_device_id') || undefined;
      const pairingCode = window.localStorage.getItem('vitrion_tv_pairing_code') || undefined;
      if (!deviceId && !pairingCode) return null;
      return { deviceId, pairingCode };
    } catch {
      return null;
    }
  }
}

export const adminScreensStorage = new AdminScreensStorageService();
