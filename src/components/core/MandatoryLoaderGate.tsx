import { useEffect, useRef, useState } from 'react';
import IconOrbitLoader from '@/components/core/IconOrbitLoader';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'react-router-dom';
import { isPublicDocumentRoute } from '@/lib/publicDocumentRoutes';

const HOLD_MS = 5000;

/**
 * Covers the screen with the circling symbols for a fixed 5 seconds on every
 * app open/reload and again on every sign-in, with a new symbol set each time.
 */
export default function MandatoryLoaderGate() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [round, setRound] = useState(1);
  const [visible, setVisible] = useState(true);
  const prevUser = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const id = user?.id ?? null;
    if (prevUser.current === null && id) { setRound((r) => r + 1); setVisible(true); }
    prevUser.current = id;
  }, [user?.id]);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(false), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [visible, round]);

  if (!visible || isPublicDocumentRoute(pathname)) return null;
  return (
    <div data-testid="mandatory-loader" className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-background" aria-busy="true">
      <IconOrbitLoader key={round} fresh />
    </div>
  );
}
