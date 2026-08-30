import { useEffect, useRef, useState, type RefObject } from 'react';

const TRIGGER_DISTANCE = 72;
const MAX_DISTANCE = 104;

interface PullToRefreshState {
  distance: number;
  refreshing: boolean;
}

/**
 * Native touch pull-to-refresh for an existing scroll surface. It only takes
 * control when the active feed is already at its top, so normal snap scrolling
 * and video swipes are left untouched.
 */
export function usePullToRefresh(
  rootRef: RefObject<HTMLElement>,
  onRefresh: () => Promise<unknown>,
): PullToRefreshState {
  const startY = useRef<number | null>(null);
  const activeScroller = useRef<HTMLElement | null>(null);
  const distanceRef = useRef(0);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reset = () => {
      startY.current = null;
      activeScroller.current = null;
      distanceRef.current = 0;
      setDistance(0);
    };

    const onStart = (event: TouchEvent) => {
      if (refreshing || event.touches.length !== 1) return;
      const target = event.target instanceof Element ? event.target : null;
      const scroller = target?.closest<HTMLElement>('[data-feed-scroll]') ?? null;
      if (!scroller || scroller.scrollTop > 1) return;
      startY.current = event.touches[0].clientY;
      activeScroller.current = scroller;
    };

    const onMove = (event: TouchEvent) => {
      if (startY.current === null || !activeScroller.current || event.touches.length !== 1) return;
      if (activeScroller.current.scrollTop > 1) return reset();
      const delta = event.touches[0].clientY - startY.current;
      if (delta <= 0) return setDistance(0);
      event.preventDefault();
      distanceRef.current = Math.min(MAX_DISTANCE, delta * 0.55);
      setDistance(distanceRef.current);
    };

    const onEnd = () => {
      const shouldRefresh = distanceRef.current >= TRIGGER_DISTANCE;
      startY.current = null;
      activeScroller.current = null;
      setDistance(0);
      if (!shouldRefresh || refreshing) return;
      setRefreshing(true);
      void Promise.resolve(onRefresh()).finally(() => setRefreshing(false));
    };

    root.addEventListener('touchstart', onStart, { passive: true });
    root.addEventListener('touchmove', onMove, { passive: false });
    root.addEventListener('touchend', onEnd, { passive: true });
    root.addEventListener('touchcancel', reset, { passive: true });
    return () => {
      root.removeEventListener('touchstart', onStart);
      root.removeEventListener('touchmove', onMove);
      root.removeEventListener('touchend', onEnd);
      root.removeEventListener('touchcancel', reset);
    };
  }, [onRefresh, refreshing, rootRef]);

  return { distance, refreshing };
}

export default usePullToRefresh;