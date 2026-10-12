/**
 * Device Identity & Environment Detector
 * Manages unique TV identification, pairing codes, and Fire TV device detection.
 */

import { DisplayDevice, ScreenOrientation } from '../../types/display';
import { idbService } from '../storage/indexedDb';

const STORAGE_KEY_DEVICE_ID = 'vitrion_tv_device_id';
const STORAGE_KEY_PAIRING_CODE = 'vitrion_tv_pairing_code';

export function isAmazonFireTV(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /AFT|Amazon|Silk|FireTV/i.test(ua);
}

export function detectPlatform(): 'firetv' | 'smarttv' | 'browser' {
  if (typeof navigator === 'undefined') return 'browser';
  const ua = navigator.userAgent || '';
  if (isAmazonFireTV()) return 'firetv';
  if (/SmartTV|Tizen|Web0S|NetCast|HbbTV|BRAVIA|GoogleTV|Android TV/i.test(ua)) return 'smarttv';
  return 'browser';
}

export function detectOrientation(): ScreenOrientation {
  if (typeof window === 'undefined') return 'landscape';
  return window.innerWidth < window.innerHeight ? 'portrait' : 'landscape';
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'vtr-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
}

/**
 * Generates a clean, readable 6-character code (format: VTR-XXXX)
 * Omits ambiguous characters like 0, O, 1, I for TV screen clarity.
 */
export function generatePairingCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VTR-${code}`;
}

export async function getOrCreateDeviceProfile(): Promise<DisplayDevice> {
  // Check if profile exists in IndexedDB
  const cachedProfile = await idbService.getConfig<DisplayDevice>('device_profile');
  if (cachedProfile && cachedProfile.id) {
    // Update live resolution and orientation
    cachedProfile.resolution = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
    };
    cachedProfile.orientation = detectOrientation();
    return cachedProfile;
  }

  // Check fallback localStorage
  let deviceId = '';
  let pairingCode = '';
  try {
    deviceId = localStorage.getItem(STORAGE_KEY_DEVICE_ID) || '';
    pairingCode = localStorage.getItem(STORAGE_KEY_PAIRING_CODE) || '';
  } catch {
    // ignore
  }

  if (!deviceId) {
    deviceId = generateUUID();
    try {
      localStorage.setItem(STORAGE_KEY_DEVICE_ID, deviceId);
    } catch {
      // ignore
    }
  }

  if (!pairingCode) {
    pairingCode = generatePairingCode();
    try {
      localStorage.setItem(STORAGE_KEY_PAIRING_CODE, pairingCode);
    } catch {
      // ignore
    }
  }

  const platform = detectPlatform();
  const defaultName = platform === 'firetv' 
    ? `Fire TV (${pairingCode.slice(-4)})`
    : `Display TV (${pairingCode.slice(-4)})`;

  const newProfile: DisplayDevice = {
    id: deviceId,
    pairingCode,
    name: defaultName,
    isActivated: false,
    registeredAt: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString(),
    platform,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    resolution: {
      width: typeof window !== 'undefined' ? window.innerWidth : 1920,
      height: typeof window !== 'undefined' ? window.innerHeight : 1080,
      pixelRatio: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
    },
    orientation: detectOrientation(),
  };

  await idbService.setConfig('device_profile', newProfile);
  return newProfile;
}

export async function saveDeviceProfile(profile: DisplayDevice): Promise<void> {
  await idbService.setConfig('device_profile', profile);
  try {
    localStorage.setItem(STORAGE_KEY_DEVICE_ID, profile.id);
    localStorage.setItem(STORAGE_KEY_PAIRING_CODE, profile.pairingCode);
  } catch {
    // ignore
  }
}
