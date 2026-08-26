import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { deviceTimeZone, localClock, localDateKey, currentSlot } from '@/lib/astroSlot';
import { astroTrace } from '@/lib/astroLog';


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

        // The offset is part of the key so a DST transition inside a long
        // session re-verifies the stored zone instead of trusting a stale flag.
        const offsetMin = -new Date().getTimezoneOffset();
        const sessionKey = `astro_tz_synced_${uid}_${tz}_${offsetMin}`;
        try { if (sessionStorage.getItem(sessionKey)) return; } catch { /* private mode */ }

        const { data } = await supabase
          .from('astro_profiles')
          .select('user_id, display_timezone')
          .eq('user_id', uid)
          .maybeSingle();

        if (cancelled) return;
        const stored = data?.display_timezone ?? null;
        if (data && stored !== tz) {
          await supabase
            .from('astro_profiles')
            .update({ display_timezone: tz })
            .eq('user_id', uid);
        }
        astroTrace('useAstroTimezoneSync', {
          timezone: tz,
          target_date: localDateKey(new Date(), tz),
          computed_slot: currentSlot(new Date(), tz),
          note: `stored=${stored ?? 'none'} device=${tz} offset=${offsetMin}m local=${localClock(new Date(), tz)}${stored !== tz ? ' → updated' : ''}`,
        });
        try { sessionStorage.setItem(sessionKey, '1'); } catch { /* noop */ }
      } catch (err) {
        console.warn('[AstroTZ] sync skipped', err);
      }
    };

    void run();
    // Re-check when the app returns to the foreground: travel, a DST change or
    // a local-midnight rollover can all happen while the tab is hidden.
    const onVisible = () => { if (document.visibilityState === 'visible') void run(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

}

export default useAstroTimezoneSync;
