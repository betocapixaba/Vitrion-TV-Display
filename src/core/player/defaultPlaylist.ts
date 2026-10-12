/**
 * Default Offline Fallback Playlist
 * Provides guaranteed high-quality visual content when the player boots up
 * or when offline without cloud sync. Ensures ZERO white screens or error pages.
 */

import { Playlist } from '../../types/display';

export const DEFAULT_OFFLINE_PLAYLIST: Playlist = {
  id: 'pl-default-vitrion-showcase',
  name: 'Vitrion TV - Demonstração Padrão',
  version: 1,
  defaultDurationSeconds: 10,
  transition: 'fade',
  updatedAt: new Date().toISOString(),
  items: [
    {
      id: 'item-1',
      name: 'Boas-Vindas Vitrion TV',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1920&q=80',
      durationSeconds: 10,
      fitMode: 'cover',
      order: 1,
      caption: 'Experiência de sinalização digital contínua e inteligente para sua empresa',
      badge: 'BEM-VINDO',
      accentColor: '#38bdf8',
    },
    {
      id: 'item-2',
      name: 'Oferta Especial do Dia',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1920&q=80',
      durationSeconds: 12,
      fitMode: 'cover',
      order: 2,
      caption: 'Cafés especiais, panificação artesanal e atendimento diferenciado todos os dias',
      badge: 'GASTRONOMIA & SABOR',
      accentColor: '#f59e0b',
    },
    {
      id: 'item-3',
      name: 'Inovação e Tecnologia',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80',
      durationSeconds: 10,
      fitMode: 'cover',
      order: 3,
      caption: 'Comunicação visual em alta definição sincronizada em tempo real',
      badge: 'TECNOLOGIA',
      accentColor: '#10b981',
    },
    {
      id: 'item-4',
      name: 'Vídeo Demonstração Looping',
      type: 'video',
      // High-efficiency public sample mp4 suitable for smart TVs
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      fallbackUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1920&q=80',
      durationSeconds: 15,
      fitMode: 'cover',
      order: 4,
      caption: 'Reprodução fluida de vídeos em alta resolução sem engasgos',
      badge: 'VÍDEO HD',
      accentColor: '#8b5cf6',
    },
  ],
};
