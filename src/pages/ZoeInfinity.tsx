import { useState, useCallback, useEffect } from 'react';
import { GenesisImprintGate } from '@/components/zoe-infinity/GenesisImprintGate';
import ZoeInfinityUnlocked from '@/pages/ZoeInfinityUnlocked';

const UNLOCK_KEY = 'zoe-infinity-unlocked';

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
  // Avoid a 1-frame flash of the gate: wait for hydration before deciding.
  const [hydrated, setHydrated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const flag = readUnlockFlag();
    if (flag) {
      writeUnlockFlag();
      setUnlocked(true);
    }
    setHydrated(true);
  }, []);

  const handleUnlock = useCallback(() => {
    writeUnlockFlag();
    setUnlocked(true);
  }, []);

  // While we confirm persisted unlock state, don't show the gate overlay.
  if (!hydrated) {
    return <div className="fixed inset-0 bg-background" aria-label="Loading" />;
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
