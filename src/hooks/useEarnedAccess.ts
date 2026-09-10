/**
 * EARNED ACCESS
 *
 * Some pages only open once someone has actually used M'Mora for a while:
 * the Digital Vault, legacy messages and astrology. The rule is seven active
 * days — seven distinct days on which the account did something, counted from
 * the member's own activity log (own-row reads only, no privileged helper).
 *
 * If the activity log is unreachable we fall back to account age in days, so a
 * long-standing member is never locked out by a failed read. Admins bypass.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';

export const REQUIRED_ACTIVE_DAYS = 7;

export interface EarnedAccessState {
  /** null while still working it out. */
  unlocked: boolean | null;
  activeDays: number;
  daysRemaining: number;
}

export function useEarnedAccess(): EarnedAccessState {
  const isAdmin = useIsAdmin();
  const [state, setState] = useState<EarnedAccessState>({
    unlocked: null,
    activeDays: 0,
    daysRemaining: REQUIRED_ACTIVE_DAYS,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (isAdmin === true) {
        if (!cancelled) setState({ unlocked: true, activeDays: REQUIRED_ACTIVE_DAYS, daysRemaining: 0 });
        return;
      }
      if (isAdmin === null) return; // still resolving

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        if (!cancelled) setState({ unlocked: false, activeDays: 0, daysRemaining: REQUIRED_ACTIVE_DAYS });
        return;
      }

      let activeDays = 0;

      const { data: rows, error } = await supabase
        .from('user_activity_log')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!error && rows) {
        const days = new Set(rows.map((r) => String(r.created_at).slice(0, 10)));
        activeDays = days.size;
      }

      if (activeDays < REQUIRED_ACTIVE_DAYS) {
        // Fallback: account age, so an unreadable log never traps a real member.
        const { data: profile } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('user_id', userId)
          .maybeSingle();
        if (profile?.created_at) {
          const ageDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000);
          activeDays = Math.max(activeDays, ageDays);
        }
      }

      if (cancelled) return;
      setState({
        unlocked: activeDays >= REQUIRED_ACTIVE_DAYS,
        activeDays,
        daysRemaining: Math.max(0, REQUIRED_ACTIVE_DAYS - activeDays),
      });
    })().catch(() => {
      if (!cancelled) setState({ unlocked: true, activeDays: REQUIRED_ACTIVE_DAYS, daysRemaining: 0 });
    });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  return state;
}

export default useEarnedAccess;
