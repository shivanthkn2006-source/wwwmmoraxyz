import { useState, useCallback, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { GenesisImprintGate } from '@/components/zoe-infinity/GenesisImprintGate';
import ZoeInfinityUnlocked from '@/pages/ZoeInfinityUnlocked';

const UNLOCK_KEY = 'zoe-infinity-unlocked';

const ZoeInfinityLoadingShell = ({ label = 'Opening Zoe Infinity' }: { label?: string }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-background p-4 text-foreground" aria-live="polite" aria-busy="true">
    <div className="w-full max-w-sm rounded-lg border border-border bg-card/70 p-5 text-center shadow-lg backdrop-blur">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-muted border-b-primary" />
      <p className="font-mono text-xs uppercase tracking-widest text-primary">{label}</p>
      <p className="mt-2 text-xs text-muted-foreground">Recovering the session if the preview is stale.</p>
    </div>
  </div>
);

// In-memory guard to prevent any flicker even if storage is briefly unavailable/cleared.
declare global {
  interface Window {
    __zoeInfinityUnlocked?: boolean;
  }
}

const readUnlockFlag = (): boolean => {
  if (typeof window !== 'undefined' && window.__zoeInfinityUnlocked) return true;

  try {
    // Prefer localStorage (more resilient than sessionStorage for some browsers/iframes)
    if (localStorage.getItem(UNLOCK_KEY) === 'true') return true;
    
    // BUG FIX: Also check genesis complete flag - if user has completed genesis, they're unlocked
    if (localStorage.getItem('zoe_infinity_genesis_complete') === 'true') return true;
    
    // Also check if there's any chat history (truly returning user)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('zoe_infinity_history_v1:')) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('[ZoeInfinity] Found existing history, auto-unlocking');
              return true;
            }
          } catch {}
        }
      }
    }
  } catch {
    // ignore
  }
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === 'true';
  } catch {
    return false;
  }
};

const writeUnlockFlag = (): void => {
  if (typeof window !== 'undefined') window.__zoeInfinityUnlocked = true;

  try {
    localStorage.setItem(UNLOCK_KEY, 'true');
  } catch {
    // ignore
  }
  try {
    sessionStorage.setItem(UNLOCK_KEY, 'true');
  } catch {
    // ignore
  }
};

export default function ZoeInfinity() {
  const { user, loading } = useAuth();
  // Avoid a 1-frame flash of the gate: wait for hydration before deciding.
  const [hydrated, setHydrated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    const flag = readUnlockFlag();
    if (flag) {
      writeUnlockFlag();
      setUnlocked(true);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!loading) {
      setAuthTimedOut(false);
      return;
    }

    const timeout = window.setTimeout(() => setAuthTimedOut(true), 10_000);
    return () => window.clearTimeout(timeout);
  }, [loading]);

  const handleUnlock = useCallback(() => {
    writeUnlockFlag();
    setUnlocked(true);
  }, []);

  // Wait for auth to resolve
  if (loading) {
    return <ZoeInfinityLoadingShell label={authTimedOut ? 'Session is slow — still recovering' : 'Opening Zoe Infinity'} />;
  }

  // If not authenticated, redirect to Zoe Infinity auth
  if (!user) {
    return <Navigate to="/zoe-infinity/auth" replace />;
  }

  // While we confirm persisted unlock state, don't show the gate overlay.
  if (!hydrated) {
    return <ZoeInfinityLoadingShell label="Restoring Zoe state" />;
  }

  // Once unlocked, skip the gate entirely - no overlay
  if (unlocked) {
    return <ZoeInfinityUnlocked />;
  }

  return (
    <GenesisImprintGate onUnlock={handleUnlock}>
      <ZoeInfinityUnlocked />
    </GenesisImprintGate>
  );
}
