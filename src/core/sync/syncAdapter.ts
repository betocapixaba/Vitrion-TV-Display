/**
 * Remote Sync & Cloud Adapter Interface
 * Provides a modular contract for Firebase / Cloud synchronization.
 * Operates gracefully both online and fully offline.
 */

import { Playlist, DisplayDevice, TelemetryState } from '../../types/display';
import { idbService } from '../storage/indexedDb';

export interface HeartbeatPayload {
  deviceId: string;
  pairingCode: string;
  name: string;
  isActivated: boolean;
  platform: string;
  timestamp: string;
  uptimeSeconds: number;
  currentPlaylistId: string;
  currentItemId: string;
  currentItemIndex: number;
  isOnline: boolean;
  screenResolution: string;
  memoryEstimateMb?: number;
}

export interface IRemoteSyncAdapter {
  checkActivationStatus(
    deviceId: string,
    pairingCode: string
  ): Promise<{ isActivated: boolean; deviceName?: string; playlistId?: string } | null>;
  sendHeartbeat(payload: HeartbeatPayload): Promise<boolean>;
  fetchLatestPlaylist(playlistId: string): Promise<Playlist | null>;
  activateDevice(deviceId: string, pairingCode: string, deviceName?: string): Promise<boolean>;
  unpairDevice(deviceId: string): Promise<boolean>;
}

/**
 * Standby / Local Sync Adapter
 * Implements full offline queueing, local mock activation for physical Fire TV testing,
 * and seamless fallback so testing can begin immediately on Fire TV devices.
 */
class StandbySyncAdapter implements IRemoteSyncAdapter {
  public async checkActivationStatus(
    deviceId: string,
    _pairingCode: string
  ): Promise<{ isActivated: boolean; deviceName?: string; playlistId?: string } | null> {
    const profile = await idbService.getConfig<DisplayDevice>('device_profile');
    if (profile && profile.id === deviceId) {
      return {
        isActivated: profile.isActivated,
        deviceName: profile.name,
      };
    }
    return null;
  }

  public async sendHeartbeat(payload: HeartbeatPayload): Promise<boolean> {
    try {
      // Always record telemetry to IndexedDB for offline audit
      await idbService.logTelemetry({
        type: 'heartbeat',
        message: `Heartbeat emitted for ${payload.deviceId}`,
        data: {
          uptimeSeconds: payload.uptimeSeconds,
          currentItemId: payload.currentItemId,
          timestamp: payload.timestamp,
          isOnline: payload.isOnline,
        },
      });

      if (!payload.isOnline) {
        return false;
      }

      // In standby mode, mock cloud acknowledgement
      return true;
    } catch {
      return false;
    }
  }

  public async fetchLatestPlaylist(playlistId: string): Promise<Playlist | null> {
    return await idbService.getPlaylist(playlistId);
  }

  public async activateDevice(deviceId: string, pairingCode: string, deviceName?: string): Promise<boolean> {
    const profile = await idbService.getConfig<DisplayDevice>('device_profile');
    if (profile) {
      profile.isActivated = true;
      if (deviceName) {
        profile.name = deviceName;
      }
      await idbService.setConfig('device_profile', profile);
      await idbService.logTelemetry({
        type: 'activation',
        message: `Dispositivo ${deviceId} ativado com sucesso via código ${pairingCode}`,
      });
      return true;
    }
    return false;
  }

  public async unpairDevice(_deviceId: string): Promise<boolean> {
    const profile = await idbService.getConfig<DisplayDevice>('device_profile');
    if (profile) {
      profile.isActivated = false;
      await idbService.setConfig('device_profile', profile);
      await idbService.logTelemetry({
        type: 'unpair',
        message: `Dispositivo desconectado / desparelhado`,
      });
      return true;
    }
    return false;
  }
}

export const syncAdapter: IRemoteSyncAdapter = new StandbySyncAdapter();
