/**
 * Sovereign administrator check.
 *
 * Admin capability on this platform is bound to a single account. The check is
 * resolved server-side through the security-definer `is_sovereign_admin`
 * function, so no client flag, localStorage value or username can forge it.
 *
 * Returns `null` while the check is in flight, `false` for everyone else.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SovereignAdminState {
  /** null = resolving, true = sovereign, false = denied */
  isSovereign: boolean | null;
  userId: string | null;
  recheck: () => void;
}

export function useSovereignAdmin(): SovereignAdminState {
  const [isSovereign, setIsSovereign] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const recheck = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const id = sessionData.session?.user?.id ?? null;
      if (cancelled) return;
      setUserId(id);
      if (!id) {
        setIsSovereign(false);
        return;
      }
      const { data, error } = await supabase.rpc('is_sovereign_admin', { check_user_id: id });
      if (cancelled) return;
      setIsSovereign(!error && Boolean(data));
    };

    void check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void check();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [nonce]);

  return { isSovereign, userId, recheck };
}

export default useSovereignAdmin;
