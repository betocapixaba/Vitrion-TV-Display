/**
 * Administrative Screen & Device Types (Phase C)
 * Isolated from TV runtime player types to prevent cross-contamination.
 */

export type ScreenRecordType = 'current_device' | 'demo' | 'custom_local';

export type ScreenOperationalStatus = 'active' | 'pending' | 'offline_demo';

export interface AdminScreenRecord {
  /** Unique administrative record ID */
  id: string;
  /** Pairing code (format VTR-XXXX) */
  pairingCode: string;
  /** Friendly display name */
  name: string;
  /** Associated establishment / store name or ID */
  establishmentName: string;
  /** Physical placement notes (e.g. "Vitrine Principal", "Caixa 02") */
  locationNotes?: string;
  /** Type of record: real current browser device, demo TV, or manually added local entry */
  recordType: ScreenRecordType;
  /** Honest operational status label */
  status: ScreenOperationalStatus;
  /** Platform identifier if known, or undefined */
  platform?: 'firetv' | 'smarttv' | 'browser' | 'unknown';
  /** Native resolution string if available (e.g. "1920x1080"), otherwise undefined */
  resolution?: string;
  /** Orientation */
  orientation?: 'landscape' | 'portrait';
  /** Date when this administrative record was registered */
  createdAt: string;
  /** Date when this administrative record was last updated */
  updatedAt: string;
  /**
   * Honest telemetry note.
   * If remote telemetry is not connected, this must be explicitly noted.
   */
  telemetryNotice: string;
}

export interface AdminScreensState {
  version: number;
  records: AdminScreenRecord[];
  lastModified: string;
}
