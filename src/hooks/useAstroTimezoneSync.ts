import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { deviceTimeZone } from '@/lib/astroSlot';

/**
 * Keeps the member's alignment timezone hardwired to the device they are
 * actually using. The dispatch engine schedules every slot in
 * `astro_profiles.display_timezone`, so a member who travels (or whose row was
 * seeded with UTC) would otherwise receive night cards in the morning.
 * Runs once per session, writes only when the value actually changed.
 */
export function useAstroTimezoneSync() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const tz = deviceTimeZone();
        if (!tz) return;
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid || cancelled) return;

        const sessionKey = `astro_tz_synced_${uid}_${tz}`;
        try { if (sessionStorage.getItem(sessionKey)) return; } catch { /* private mode */ }

        const { data } = await supabase
          .from('astro_profiles')
          .select('user_id, display_timezone')
          .eq('user_id', uid)
          .maybeSingle();

        if (cancelled) return;
        if (data && data.display_timezone !== tz) {
          await supabase
            .from('astro_profiles')
            .update({ display_timezone: tz })
            .eq('user_id', uid);
        }
        try { sessionStorage.setItem(sessionKey, '1'); } catch { /* noop */ }
      } catch (err) {
        console.warn('[AstroTZ] sync skipped', err);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, []);
}

export default useAstroTimezoneSync;
