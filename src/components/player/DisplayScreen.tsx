import React, { useRef, useEffect, useState } from 'react';
import { PlaylistItem, TransitionEffect } from '../../types/display';
import { AlertTriangle, Clock, HardDrive } from 'lucide-react';
import { mediaCacheService } from '../../core/storage/mediaCacheService';

interface DisplayScreenProps {
  currentItem: PlaylistItem | null;
  nextItem: PlaylistItem | null;
  transition: TransitionEffect;
  showClock?: boolean;
  clockFormat?: '24h' | '12h';
  onItemEnded: () => void;
  onItemError: (itemId: string, errorMsg: string) => void;
}

export const DisplayScreen: React.FC<DisplayScreenProps> = ({
  currentItem,
  nextItem,
  showClock = true,
  clockFormat = '24h',
  onItemEnded,
  onItemError,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [mediaError, setMediaError] = useState<boolean>(false);

  // Fonte resolvida do item atual (local blob URL prioritária ou URL remota direta)
  const [cachedBlob, setCachedBlob] = useState<{ itemId: string; blobUrl: string } | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  // Keep latest callback references in refs to prevent useEffect dependency churn
  const onItemEndedRef = useRef(onItemEnded);
  onItemEndedRef.current = onItemEnded;
  const onItemErrorRef = useRef(onItemError);
  onItemErrorRef.current = onItemError;

  const currentItemId = currentItem?.id;
  const hasHandledErrorRef = useRef<string | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  // Resolução da fonte de reprodução (Local Blob vs Remoto) e gestão de memória
  useEffect(() => {
    let isMounted = true;
    if (!currentItem) return;

    const resolveSource = async () => {
      try {
        const blobUrl = await mediaCacheService.createBlobUrl(currentItem.id);
        if (!isMounted) {
          if (blobUrl) mediaCacheService.revokeBlobUrl(blobUrl);
          return;
        }

        if (blobUrl) {
          // Libera a URL de blob anterior no momento seguro em que a nova está pronta
          if (activeBlobUrlRef.current && activeBlobUrlRef.current !== blobUrl) {
            mediaCacheService.revokeBlobUrl(activeBlobUrlRef.current);
          }
          activeBlobUrlRef.current = blobUrl;
          setCachedBlob({ itemId: currentItem.id, blobUrl });
        } else {
          // Sem blob em cache: usa URL remota e libera blob anterior se houver
          if (activeBlobUrlRef.current) {
            mediaCacheService.revokeBlobUrl(activeBlobUrlRef.current);
            activeBlobUrlRef.current = null;
          }
          setCachedBlob(null);
        }
      } catch (err) {
        if (isMounted) {
          setCachedBlob(null);
        }
      }
    };

    resolveSource();

    return () => {
      isMounted = false;
    };
  }, [currentItemId, currentItem?.url]);

  // Limpeza de recursos na desmontagem do componente
  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        mediaCacheService.revokeBlobUrl(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Digital Signage Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeOpts: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: clockFormat === '12h',
      };
      const dateOpts: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      };
      setCurrentTimeStr(now.toLocaleTimeString('pt-BR', timeOpts));
      setCurrentDateStr(now.toLocaleDateString('pt-BR', dateOpts).toUpperCase());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [clockFormat]);

  const isUsingLocalCache = cachedBlob?.itemId === currentItem?.id;
  const currentMediaSrc = isUsingLocalCache && cachedBlob ? cachedBlob.blobUrl : (currentItem?.url || '');
  const mediaSource = mediaError && currentItem?.fallbackUrl ? currentItem.fallbackUrl : currentMediaSrc;

  // Handle Video Autoplay and Loop control safely
  useEffect(() => {
    setMediaError(false);
    hasHandledErrorRef.current = null;
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    if (currentItem?.type === 'video' && videoRef.current) {
      const video = videoRef.current;
      video.muted = true;
      video.defaultMuted = true;
      video.currentTime = 0;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[Vitrion Video] Autoplay restricted or interrupted:', err);
          // Only notify once per item
          if (hasHandledErrorRef.current !== currentItemId) {
            hasHandledErrorRef.current = currentItemId || 'unknown';
            onItemErrorRef.current(currentItemId || 'unknown', 'Autoplay bloqueado pelo navegador');
          }
        });
      }
    }

    return () => {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [currentItemId, currentItem?.type, currentMediaSrc]);

  if (!currentItem) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-slate-400">
        <div className="w-12 h-12 rounded-full border-2 border-sky-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium">Carregando programação do cache local...</p>
      </div>
    );
  }

  const handleVideoEnded = () => {
    onItemEndedRef.current();
  };

  const handleImageError = () => {
    if (hasHandledErrorRef.current === currentItem.id) return;
    hasHandledErrorRef.current = currentItem.id;
    setMediaError(true);
    onItemErrorRef.current(currentItem.id, `Erro ao carregar imagem: ${currentMediaSrc || currentItem.url}`);
    
    // Auto-advance quickly to prevent black screen
    fallbackTimerRef.current = window.setTimeout(() => {
      onItemEndedRef.current();
    }, 1500);
  };

  const handleVideoError = () => {
    if (hasHandledErrorRef.current === currentItem.id) return;
    hasHandledErrorRef.current = currentItem.id;
    setMediaError(true);
    onItemErrorRef.current(currentItem.id, `Erro no stream do vídeo: ${currentMediaSrc || currentItem.url}`);
    
    fallbackTimerRef.current = window.setTimeout(() => {
      onItemEndedRef.current();
    }, 1500);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* Active Media Container */}
      <div className="absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out">
        {currentItem.type === 'video' ? (
          <video
            ref={videoRef}
            key={`${currentItem.id}-${isUsingLocalCache ? 'local' : 'remote'}`}
            src={mediaSource}
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnded}
            onError={handleVideoError}
            className={`w-full h-full object-${currentItem.fitMode || 'cover'} bg-black`}
          />
        ) : (
          <img
            key={`${currentItem.id}-${isUsingLocalCache ? 'local' : 'remote'}`}
            src={mediaSource}
            alt={currentItem.name}
            onError={handleImageError}
            className={`w-full h-full object-${currentItem.fitMode || 'cover'} transition-transform duration-1000`}
          />
        )}

        {/* Ambient Dark Gradient for Caption Legibility (Signage Overlay) */}
        {(currentItem.caption || currentItem.badge) && (
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none flex flex-col justify-end p-8 sm:p-12">
            <div className="max-w-4xl">
              {currentItem.badge && (
                <span
                  className="inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2 text-white shadow-sm"
                  style={{ backgroundColor: currentItem.accentColor || '#0284c7' }}
                >
                  {currentItem.badge}
                </span>
              )}
              {currentItem.caption && (
                <p className="text-xl sm:text-2xl font-semibold text-white tracking-wide drop-shadow-md">
                  {currentItem.caption}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preloading Background Layer for Next Item (Eliminates Flicker) */}
      {nextItem && (
        <div className="hidden pointer-events-none" aria-hidden="true">
          {nextItem.type === 'image' && (
            <img src={nextItem.url} alt="preload-buffer" loading="eager" />
          )}
        </div>
      )}

      {/* Optional Top Discreet Signage Clock & Offline Media Badge */}
      <div className="absolute top-6 right-8 z-20 pointer-events-none flex items-center space-x-3">
        {isUsingLocalCache && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-600/40 text-emerald-300 text-xs backdrop-blur-md shadow-lg">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-medium">Cache Local</span>
          </div>
        )}

        {showClock && (
          <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-white shadow-xl">
            <Clock className="w-4 h-4 text-sky-400" />
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold font-mono tracking-wider">{currentTimeStr}</span>
              <span className="text-[10px] text-slate-300 font-medium tracking-widest">{currentDateStr}</span>
            </div>
          </div>
        )}
      </div>

      {/* Discreet Fallback Alert if Media Failed */}
      {mediaError && (
        <div className="absolute top-6 left-8 z-30 flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-amber-950/80 border border-amber-600/50 text-amber-200 text-xs shadow-lg backdrop-blur-md">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Recuperando mídia alternativa...</span>
        </div>
      )}
    </div>
  );
};

