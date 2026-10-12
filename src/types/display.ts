/**
 * Vitrion TV Display - Core Data Models & Types
 * Designed for Amazon Fire TV and Digital Signage players.
 */

export type ScreenOrientation = 'landscape' | 'portrait';

export type MediaType = 'image' | 'video' | 'web';

export type TransitionEffect = 'fade' | 'slide' | 'zoom' | 'none';

export interface PlaybackSchedule {
  enabled: boolean;
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // 'HH:mm' e.g. '08:00'
  endTime: string; // 'HH:mm' e.g. '22:00'
}

export interface PlaylistItem {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  fallbackUrl?: string;
  durationSeconds: number;
  fitMode?: 'cover' | 'contain';
  order: number;
  schedule?: PlaybackSchedule;
  caption?: string;
  badge?: string;
  accentColor?: string;
  isCached?: boolean;
  version?: number;
  checksum?: string;
}

export interface Playlist {
  id: string;
  name: string;
  version: number;
  items: PlaylistItem[];
  defaultDurationSeconds: number;
  transition: TransitionEffect;
  updatedAt: string;
}

export interface DisplayDevice {
  id: string;
  pairingCode: string;
  name: string;
  isActivated: boolean;
  registeredAt: string;
  lastHeartbeat: string;
  platform: 'firetv' | 'smarttv' | 'browser';
  userAgent: string;
  resolution: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  orientation: ScreenOrientation;
}

export interface PlayerConfig {
  device: DisplayDevice;
  activePlaylistId: string;
  syncIntervalSeconds: number;
  heartbeatIntervalSeconds: number;
  autoRecoveryEnabled: boolean;
  showClock: boolean;
  clockFormat: '24h' | '12h';
  offlineCacheEnabled: boolean;
  volume: number; // 0 to 1
  isMuted: boolean;
}

export interface TelemetryState {
  isOnline: boolean;
  uptimeSeconds: number;
  currentItemIndex: number;
  currentItemId: string;
  totalPlayCount: number;
  errorsCount: number;
  lastError: string | null;
  lastHeartbeatSent: string | null;
  lastSyncAttempt: string | null;
  cachedItemsCount: number;
  storageUsageBytes: number;
}
