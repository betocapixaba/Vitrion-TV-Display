/**
 * Screen Wake Lock & TV Fullscreen Manager
 * Prevents Fire TV from entering standby screensavers during digital signage playback.
 */

let wakeLockSentinel: any = null;

export async function requestScreenWakeLock(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    return false;
  }

  try {
    wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });
    return true;
  } catch (err) {
    console.warn('[Vitrion WakeLock] Could not acquire screen wake lock:', err);
    return false;
  }
}

export function releaseScreenWakeLock(): void {
  if (wakeLockSentinel) {
    try {
      wakeLockSentinel.release();
    } catch {
      // ignore
    }
    wakeLockSentinel = null;
  }
}

export function toggleFullscreen(element?: HTMLElement): Promise<void> {
  const target = element || document.documentElement;

  if (!document.fullscreenElement) {
    if (target.requestFullscreen) {
      return target.requestFullscreen().catch(() => {});
    } else if ((target as any).webkitRequestFullscreen) {
      return (target as any).webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      return document.exitFullscreen().catch(() => {});
    }
  }
  return Promise.resolve();
}

/**
 * Initializes cursor auto-hiding after 3 seconds of inactivity
 * (Standard digital signage behavior so the mouse cursor never lingers on screen)
 */
export function initCursorAutoHider(): () => void {
  if (typeof window === 'undefined') return () => {};

  let timeoutId: number;

  const onMouseMove = () => {
    document.body.classList.remove('hide-cursor');
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      document.body.classList.add('hide-cursor');
    }, 3000);
  };

  window.addEventListener('mousemove', onMouseMove);
  // Initial timer
  timeoutId = window.setTimeout(() => {
    document.body.classList.add('hide-cursor');
  }, 3000);

  return () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.clearTimeout(timeoutId);
    document.body.classList.remove('hide-cursor');
  };
}
