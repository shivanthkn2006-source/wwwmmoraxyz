/**
 * Covers (never closes) the app after 5 minutes away or idle when the member
 * has a Quick Unlock code. Calls keep running and no lock starts mid-call.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useCallEngine } from '@/contexts/CallEngineContext';
import { inspectionActive } from '@/lib/vrInspection';
import { useManagedInterval } from '@/hooks/useManagedInterval';
import { IDLE_LOCK_MS, quickUnlockStatus, rememberEnabled, verifyQuickUnlock } from '@/lib/quickUnlock';
import QuickUnlockPad from './QuickUnlockPad';

const AUTH_PREFIXES = ['/auth', '/login', '/signup', '/password-recovery', '/voice-auth', '/beta', '/~oauth'];

export default function QuickUnlockGate() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const calls = useCallEngine();
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastActive = useRef(Date.now());

  const inCall = ['connected', 'connecting', 'reconnecting'].includes(String(calls.callState));
  const exempt = pathname === '/' || AUTH_PREFIXES.some((p) => pathname.startsWith(p)) || pathname.startsWith('/zoe-infinity');

  const refresh = useCallback(async () => {
    if (!user?.id) { setEnabled(false); return; }
    const s = await quickUnlockStatus();
    const on = !!s.enabled;
    setEnabled(on);
    rememberEnabled(on);
  }, [user?.id]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const onChange = () => void refresh();
    window.addEventListener('mmora:quick-unlock-changed', onChange);
    return () => window.removeEventListener('mmora:quick-unlock-changed', onChange);
  }, [refresh]);

  const tryLock = useCallback(() => {
    if (!enabled || locked || exempt || inCall || inspectionActive()) return;
    if (Date.now() - lastActive.current >= IDLE_LOCK_MS) setLocked(true);
  }, [enabled, locked, exempt, inCall]);

  useEffect(() => {
    if (!enabled) return;
    const touch = () => { if (!locked) lastActive.current = Date.now(); };
    const onVis = () => { if (document.visibilityState === 'visible') tryLock(); };
    const evts = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
    evts.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener('visibilitychange', onVis);
    return () => {
      evts.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, locked, tryLock]);

  // While a call runs, keep the idle clock fresh so it never locks right after hanging up.
  useEffect(() => { if (inCall) lastActive.current = Date.now(); }, [inCall]);

  useManagedInterval(tryLock, enabled ? 30_000 : null, { runOnResume: true });

  const submit = async (code: string) => {
    setBusy(true); setError(null);
    const r = await verifyQuickUnlock(code);
    setBusy(false);
    if (r.ok) { lastActive.current = Date.now(); setLocked(false); return; }
    if (r.erased || r.enabled === false) {
      setLocked(false); setEnabled(false); rememberEnabled(false);
      await supabase.auth.signOut();
      navigate('/auth', { replace: true });
      return;
    }
    setError(r.error ?? 'That code is not right.');
  };

  const forgot = async () => {
    setLocked(false);
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  if (!locked) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick Unlock"
      className="quick-unlock-gate surface-warm-tan fixed inset-0 z-[2147483000] flex flex-col items-center justify-center gap-6 p-6"
    >
      <QuickUnlockPad title="Enter your Quick Unlock code" hint="M'Mora is locked on this device." error={error} busy={busy} onComplete={submit} />
      <button type="button" onClick={forgot} className="text-sm text-foreground underline underline-offset-4">
        Forgot code? Sign in again
      </button>
    </div>
  );
}
