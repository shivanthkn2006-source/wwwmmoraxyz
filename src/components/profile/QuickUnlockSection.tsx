import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { changeQuickUnlock, quickUnlockStatus, rememberEnabled, removeQuickUnlock, setQuickUnlock } from '@/lib/quickUnlock';
import QuickUnlockPad from '@/components/security/QuickUnlockPad';

type Step = 'idle' | 'current' | 'new' | 'confirm';

const announce = () => window.dispatchEvent(new Event('mmora:quick-unlock-changed'));

/** Profile setting: turn the 5-digit Quick Unlock on, change it or remove it. */
export default function QuickUnlockSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [current, setCurrent] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void quickUnlockStatus().then((s) => setEnabled(!!s.enabled)); }, []);

  const reset = () => { setStep('idle'); setCurrent(''); setFirst(''); setError(null); };

  const save = async (code: string) => {
    if (code !== first) { setError("Those codes don't match. Start again."); setFirst(''); setStep('new'); return; }
    setBusy(true);
    const r = enabled ? await changeQuickUnlock(current, code) : await setQuickUnlock(code);
    setBusy(false);
    if (!r.ok) { setError(r.error ?? 'Could not save.'); setFirst(''); setStep(enabled && r.error?.includes('not right') ? 'current' : 'new'); return; }
    setEnabled(true); rememberEnabled(true); announce(); reset();
    toast.success('Quick Unlock is on for your account.');
  };

  const remove = async () => {
    setBusy(true);
    await removeQuickUnlock();
    setBusy(false);
    setEnabled(false); rememberEnabled(false); announce(); reset();
    toast.success('Quick Unlock removed.');
  };

  return (
    <section className="space-y-3 rounded-2xl p-4" aria-label="Quick Unlock">
      <div>
        <h3 className="font-semibold text-foreground">Quick Unlock</h3>
        <p className="text-sm text-muted-foreground">
          A 5-digit code that unlocks M'Mora after 5 minutes away. It never replaces your normal sign-in.
        </p>
      </div>

      {step === 'idle' && enabled !== null && (
        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <>
              <Button variant="ghost" onClick={() => setStep('current')}>Change code</Button>
              <Button variant="ghost" disabled={busy} onClick={remove}>Remove</Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setStep('new')}>Set up Quick Unlock</Button>
          )}
        </div>
      )}

      {step === 'current' && (
        <QuickUnlockPad key="cur" title="Enter your current code" error={error} busy={busy}
          onComplete={(c) => { setCurrent(c); setError(null); setStep('new'); }} />
      )}
      {step === 'new' && (
        <QuickUnlockPad key="new" title="Choose a 5-digit code" hint="Avoid 12345, 11111 and similar." error={error} busy={busy}
          onComplete={(c) => { setFirst(c); setError(null); setStep('confirm'); }} />
      )}
      {step === 'confirm' && (
        <QuickUnlockPad key="confirm" title="Enter it once more" error={error} busy={busy} onComplete={save} />
      )}
      {step !== 'idle' && <Button variant="ghost" onClick={reset}>Cancel</Button>}
    </section>
  );
}
