/**
 * Shared admin check. Resolves the `admin` role through the security-definer
 * `has_role` function so no client-side flag can be forged. Returns `null`
 * while the check is in flight, `false` for signed-out or non-admin users.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useIsAdmin(): boolean | null {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const { data } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      if (!cancelled) setIsAdmin(Boolean(data));
    };

    void check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void check();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return isAdmin;
}

export default useIsAdmin;
