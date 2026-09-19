/**
 * ZOE GLOBAL MOUNT
 *
 * Single mount point for Zoe's orb, owned by PlatformLayout so she is present
 * on every route instead of only where DeferredComponentLoader happens to run.
 *
 * - Loads after first paint (idle) so it never delays a route's first render.
 * - Skipped on the ultra-light entry routes (sign in / sign up / landing) and on
 *   the separate Zoe Infinity project, which has its own assistant.
 * - No visual change: the orb keeps its own position and behaviour.
 */
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const ZoeAssetStatusCard = lazy(() =>
  import('@/components/zoe/ZoeAssetStatusCard').then((m) => ({ default: m.ZoeAssetStatusCard })),
);

const GlobalZoeAssistant = lazy(() =>
  import('@/components/GlobalZoeAssistant').then((m) => ({ default: m.GlobalZoeAssistant })),
);

/** Routes that must stay as light as possible, or own their assistant. */
const EXCLUDED_PREFIXES = ['/auth', '/signup', '/welcome', '/voice-auth', '/password-recovery', '/zoe-infinity', '/calls'];

export function isZoeOrbRoute(pathname: string): boolean {
  return !EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const scheduleIdle = (cb: () => void, timeout = 1500) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as Window & typeof globalThis).requestIdleCallback(cb, { timeout });
    return;
  }
  setTimeout(cb, 400);
};

export const ZoeGlobalMount: React.FC = () => {
  const { pathname } = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => scheduleIdle(() => setReady(true)), 600);
    return () => clearTimeout(t);
  }, [ready]);

  // Unit/e2e test shells mount PlatformLayout directly; pulling the whole
  // assistant bundle in there is pure cost with no behaviour under test.
  if (import.meta.env.MODE === 'test') return null;
  if (!ready || !isZoeOrbRoute(pathname)) return null;

  return (
    <Suspense fallback={null}>
      <GlobalZoeAssistant />
      <ZoeAssetStatusCard />
    </Suspense>
  );
};

export default ZoeGlobalMount;
