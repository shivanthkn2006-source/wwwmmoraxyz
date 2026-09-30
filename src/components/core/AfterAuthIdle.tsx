import { ReactNode, Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

/**
 * Staged loading: background helpers mount only after sign-in has settled
 * and the browser is idle, so /auth and first Home paint stay light and
 * no helper fires backend calls with a half-switched session.
 */
export function AfterAuthIdle({ children, delayMs = 0 }: { children: ReactNode; delayMs?: number }) {
  const { user, loading } = useAuth();
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

  if (!ready) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
}
