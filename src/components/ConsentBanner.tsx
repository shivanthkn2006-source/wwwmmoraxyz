// Region-gated measurement consent. Shown only where prior consent is required
// (or when the visitor reopens it from "Cookie settings"). Accept and Reject are
// equally prominent; choices apply immediately and never block sign-in.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  analyticsAllowed,
  getConsent,
  needsDecision,
  onConsentChange,
  resolveRegion,
  setConsent,
  syncFromStorage,
} from '@/lib/consent';

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    void resolveRegion();
    const refresh = () => setVisible(needsDecision());
    const unsub = onConsentChange(refresh);
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('mmora-consent')) { syncFromStorage(); }
    };
    const onOpen = () => setVisible(true);
    window.addEventListener('storage', onStorage);
    window.addEventListener('mmora:open-consent', onOpen);
    refresh();
    return () => {
      unsub();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('mmora:open-consent', onOpen);
    };
  }, []);

  if (!visible) return null;

  const choose = (analytics: 'granted' | 'denied') => {
    setConsent(analytics);
    setVisible(false);
  };

  const current = getConsent();

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Privacy choices"
      className="fixed inset-x-0 bottom-0 z-[90] px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-xl">
        <h2 className="text-base font-semibold text-foreground">Your privacy choices</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          M'Mora uses a small amount of first-party measurement — which pages are visited and for how
          long — to keep the platform reliable and understand what is used. It is never sold and never
          used for advertising profiles. Sign-in and security records stay on either way, because the
          service cannot run without them.
        </p>

        {details && (
          <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Essential — always on</p>
                <p className="text-xs text-muted-foreground">Sign-in, security and abuse-prevention records.</p>
              </div>
              <span className="text-xs text-muted-foreground">Required</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Visit measurement</p>
                <p className="text-xs text-muted-foreground">Pages visited, time spent, device type. First-party only.</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {current ? (analyticsAllowed() ? 'On' : 'Off') : 'Undecided'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Detail in the <Link to="/data-policy" className="underline underline-offset-4">Data Policy</Link>.
              You can change this any time from Cookie settings there.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => choose('granted')}
            className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => choose('denied')}
            className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => setDetails((d) => !d)}
            className="flex-1 rounded-full px-4 py-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            aria-expanded={details}
          >
            {details ? 'Hide details' : 'Customize'}
          </button>
        </div>
      </div>
    </div>
  );
}
