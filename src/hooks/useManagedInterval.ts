import { useEffect, useRef } from 'react';

/**
 * Leak-safe, battery-safe interval.
 *
 * Every raw `setInterval` in a component is a leak risk (missed clear on
 * unmount) and a background-tab cost: a hidden tab kept polling the backend at
 * full rate. This hook:
 *   - always clears on unmount,
 *   - reads the callback through a ref so a new inline function does not
 *     restart the timer,
 *   - pauses while `document.hidden` and fires once immediately on return,
 *     which is what a poller actually wants.
 */
export function useManagedInterval(
  callback: () => void,
  delayMs: number | null,
  options: { pauseWhenHidden?: boolean; runOnResume?: boolean } = {},
) {
  const { pauseWhenHidden = true, runOnResume = true } = options;
  const savedRef = useRef(callback);
  savedRef.current = callback;

  useEffect(() => {
    if (delayMs === null || delayMs <= 0) return;

    let id: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };

    const start = () => {
      if (id !== null) return;
      id = setInterval(() => savedRef.current(), delayMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop();
        return;
      }
      if (runOnResume) savedRef.current();
      start();
    };

    if (pauseWhenHidden && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      // Stay parked until the tab comes back.
    } else {
      start();
    }

    if (pauseWhenHidden && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      stop();
      if (pauseWhenHidden && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [delayMs, pauseWhenHidden, runOnResume]);
}

export default useManagedInterval;
