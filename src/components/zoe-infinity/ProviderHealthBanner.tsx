/**
 * Top-of-app banner that surfaces degraded/missing-tier alerts coming from
 * useProviderHealthScheduler (`zoe:tier-alert` / `zoe:tier-clear` events).
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface AlertState { degraded: number[]; missing: number[]; reasons: string; at: number; }

export default function ProviderHealthBanner() {
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number>(0);

  useEffect(() => {
    const onAlert = (e: Event) => {
      const detail = (e as CustomEvent).detail as AlertState;
      setAlert(detail);
    };
    const onClear = () => setAlert(null);
    window.addEventListener('zoe:tier-alert', onAlert);
    window.addEventListener('zoe:tier-clear', onClear);
    return () => {
      window.removeEventListener('zoe:tier-alert', onAlert);
      window.removeEventListener('zoe:tier-clear', onClear);
    };
  }, []);

  if (!alert || alert.at <= dismissedAt) return null;
  const tiers = [...alert.degraded, ...alert.missing.filter(t => !alert.degraded.includes(t))];

  return (
    <div className="fixed inset-x-0 top-0 z-[8500] flex justify-center px-2 pt-2 pointer-events-none">
      <div className="pointer-events-auto flex max-w-3xl items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-2 text-xs text-amber-100 backdrop-blur">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <div className="font-semibold">
            {tiers.length} provider tier{tiers.length > 1 ? 's' : ''} degraded — fallback active
          </div>
          <div className="mt-0.5 text-[11px] opacity-80">
            Tiers: {tiers.map(t => `T${t}`).join(', ')}{alert.reasons ? ` · ${alert.reasons}` : ''}
          </div>
        </div>
        <button onClick={() => setDismissedAt(alert.at)} className="rounded p-1 hover:bg-amber-400/20" aria-label="Dismiss">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
