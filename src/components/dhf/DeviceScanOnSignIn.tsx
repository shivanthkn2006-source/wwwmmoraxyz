import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { autoScanAfterSignIn } from '@/services/zoeDeviceScan';

/** Runs the prompt-free device scan once per signed-in member per session. */
export default function DeviceScanOnSignIn() {
  const { user, loading } = useAuth();
  const doneFor = useRef<string | null>(null);
  useEffect(() => {
    if (loading || !user?.id || doneFor.current === user.id) return;
    doneFor.current = user.id;
    // Idle start so the scan never competes with Home's first paint.
    const t = window.setTimeout(() => { void autoScanAfterSignIn().catch(() => undefined); }, 6000);
    return () => window.clearTimeout(t);
  }, [user?.id, loading]);
  return null;
}
