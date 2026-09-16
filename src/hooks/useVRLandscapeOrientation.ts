// ═══════════════════════════════════════════════════════════════════════════════
// VR LANDSCAPE ORIENTATION
// Auto-requests landscape (+ fullscreen where required) when the VR world opens.
// Purely additive: no VR visuals, components or logic are modified.
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';

type OrientationLockType = 'landscape' | 'landscape-primary' | 'portrait';

interface ScreenOrientationLockable {
  lock?: (orientation: OrientationLockType) => Promise<void>;
  unlock?: () => void;
}

export interface VRLandscapeState {
  /** True when the viewport is currently portrait on a touch/small device. */
  needsRotate: boolean;
  /** True when a native orientation lock is active. */
  locked: boolean;
  /** True when the document currently owns the full screen. */
  isFullscreen: boolean;
  /** Manually (re)request landscape - must be called from a user gesture on iOS. */
  requestLandscape: () => Promise<void>;
  /** One-tap enter/exit full screen (also re-requests landscape on entry). */
  toggleFullscreen: () => Promise<void>;
  /** Release the lock (used when leaving the VR world). */
  releaseLandscape: () => void;
}

const isTouchLike = () => {
  if (typeof window === 'undefined') return false;
  const smallest = Math.min(window.innerWidth, window.innerHeight);
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  return coarse || smallest <= 900;
};

export const useVRLandscapeOrientation = (active: boolean): VRLandscapeState => {
  const [needsRotate, setNeedsRotate] = useState(false);
  const [locked, setLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== 'undefined' && Boolean(document.fullscreenElement)
  );

  const evaluate = useCallback(() => {
    if (typeof window === 'undefined') {
      setNeedsRotate(false);
      return;
    }
    const portrait = window.innerHeight > window.innerWidth;
    setNeedsRotate(Boolean(active) && portrait && isTouchLike());
  }, [active]);

  const requestLandscape = useCallback(async () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const orientation = window.screen?.orientation as unknown as ScreenOrientationLockable | undefined;

    try {
      // Android/Chrome require fullscreen before an orientation lock is allowed.
      if (!document.fullscreenElement && document.documentElement.requestFullscreen && isTouchLike()) {
        await document.documentElement.requestFullscreen().catch(() => undefined);
      }
      if (orientation?.lock) {
        await orientation.lock('landscape');
        setLocked(true);
      }
    } catch (error) {
      // iOS Safari and desktop browsers reject locks - fall back to the rotate hint.
      console.info('[VR Orientation] Landscape lock unavailable:', (error as Error)?.message);
      setLocked(false);
    } finally {
      evaluate();
    }
  }, [evaluate]);

  const releaseLandscape = useCallback(() => {
    if (typeof window === 'undefined') return;
    const orientation = window.screen?.orientation as unknown as ScreenOrientationLockable | undefined;
    try {
      orientation?.unlock?.();
    } catch {
      /* no-op */
    }
    setLocked(false);
  }, []);

  // Auto-attempt on entry, and clean up on exit.
  useEffect(() => {
    if (!active) {
      releaseLandscape();
      setNeedsRotate(false);
      return;
    }
    evaluate();
    void requestLandscape();
    return () => releaseLandscape();
  }, [active, evaluate, requestLandscape, releaseLandscape]);

  // Retry the lock on the first user gesture (needed when autoplay-style gating blocks it).
  useEffect(() => {
    if (!active || locked) return;
    const onGesture = () => { void requestLandscape(); };
    window.addEventListener('pointerdown', onGesture, { once: true, passive: true });
    return () => window.removeEventListener('pointerdown', onGesture);
  }, [active, locked, requestLandscape]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', evaluate);
    window.addEventListener('orientationchange', evaluate);
    return () => {
      window.removeEventListener('resize', evaluate);
      window.removeEventListener('orientationchange', evaluate);
    };
  }, [evaluate]);

  // Track full-screen changes made anywhere (our button, Esc key, system gestures).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
        releaseLandscape();
        setIsFullscreen(false);
        return;
      }
      await document.documentElement.requestFullscreen?.();
      setIsFullscreen(Boolean(document.fullscreenElement));
      await requestLandscape();
    } catch (error) {
      console.info('[VR Orientation] Fullscreen unavailable:', (error as Error)?.message);
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  }, [requestLandscape, releaseLandscape]);

  return { needsRotate, locked, isFullscreen, requestLandscape, toggleFullscreen, releaseLandscape };
};

export default useVRLandscapeOrientation;
