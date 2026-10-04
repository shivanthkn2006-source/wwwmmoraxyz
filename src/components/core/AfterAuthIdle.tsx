import { ReactNode, Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useVRWorldActive } from '@/lib/vrSession';

/**
 * Staged loading: background helpers mount only after sign-in has settled
 * and the browser is idle, so /auth and first Home paint stay light and
 * no helper fires backend calls with a half-switched session.
 */
export function AfterAuthIdle({ children, delayMs = 0, pauseInVR = false }: { children: ReactNode; delayMs?: number; /** Unmount while the member is inside VR World. */ pauseInVR?: boolean }) {
  const { user, loading } = useAuth();
  const inVR = useVRWorldActive();
  const [ready, setReady] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    setReady(false);
    if (loading || !userId) return;
    let idleId: number | undefined;
    const timer = window.setTimeout(() => {
      const ric = (window as any).requestIdleCallback as
        | ((cb: () => void, o?: { timeout: number }) => number)
        | undefined;
      if (ric) idleId = ric(() => setReady(true), { timeout: 2000 });
      else setReady(true);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
      const cic = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;
      if (idleId !== undefined && cic) cic(idleId);
    };
  }, [loading, userId, delayMs]);

  if (!ready || (pauseInVR && inVR)) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
}
