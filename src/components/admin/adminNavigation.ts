/**
 * Vitrion TV Display - Administrative Navigation & Route Types (Phase B)
 */

export type AdminSection =
  | 'overview'
  | 'screens'
  | 'playlists'
  | 'media'
  | 'establishments'
  | 'campaigns'
  | 'settings';

export interface AdminNavItem {
  id: AdminSection;
  label: string;
  hash: string;
  badge?: string;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'overview', label: 'Visão Geral', hash: '#/admin' },
  { id: 'screens', label: 'Telas & Dispositivos', hash: '#/admin/screens' },
  { id: 'playlists', label: 'Playlists', hash: '#/admin/playlists' },
  { id: 'media', label: 'Biblioteca de Mídia', hash: '#/admin/media' },
  { id: 'establishments', label: 'Estabelecimentos', hash: '#/admin/establishments' },
  { id: 'campaigns', label: 'Campanhas & Anúncios', hash: '#/admin/campaigns' },
  { id: 'settings', label: 'Configurações', hash: '#/admin/settings' },
];

/**
 * Resolves the active AdminSection from the window hash.
 * Supports:
 * - #/admin or #/admin/ -> 'overview'
 * - #/admin/screens -> 'screens'
 * - #/admin/playlists -> 'playlists'
 * - #/admin/media -> 'media'
 * - #/admin/establishments -> 'establishments'
 * - #/admin/campaigns -> 'campaigns'
 * - #/admin/settings -> 'settings'
 */
export function resolveAdminSection(hash: string): AdminSection {
  const cleanHash = (hash || '').split('?')[0].replace(/\/+$/, '');
  
  if (cleanHash === '#/admin/screens' || cleanHash.startsWith('#/admin/screens/')) {
    return 'screens';
  }
  if (cleanHash === '#/admin/playlists' || cleanHash.startsWith('#/admin/playlists/')) {
    return 'playlists';
  }
  if (cleanHash === '#/admin/media' || cleanHash.startsWith('#/admin/media/')) {
    return 'media';
  }
  if (cleanHash === '#/admin/establishments' || cleanHash.startsWith('#/admin/establishments/')) {
    return 'establishments';
  }
  if (cleanHash === '#/admin/campaigns' || cleanHash.startsWith('#/admin/campaigns/')) {
    return 'campaigns';
  }
  if (cleanHash === '#/admin/settings' || cleanHash.startsWith('#/admin/settings/')) {
    return 'settings';
  }
  return 'overview';
}
