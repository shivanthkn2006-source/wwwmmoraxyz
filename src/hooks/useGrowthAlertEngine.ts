/**
 * GROWTH ALERT ENGINE (single owner, mounted once by GrowthCardAlertHost)
 *
 * Detects newly generated insight cards for the signed-in member through three
 * independent paths, so a card is never missed:
 *   1. Realtime INSERT/UPDATE on growth_feed_items scoped to the member.
 *   2. A 60s poll (also covers projects where realtime is not replicated).
 *   3. An immediate re-check on tab focus / visibility change / network return.
 *
 * Every path funnels into the shared alert store, which dedupes by card id
 * against a persisted seen-ledger — three detections of the same card produce
 * exactly one alert. All failures are swallowed: this module can never break a
 * screen it is mounted on.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { readingTimeMs } from '@/lib/growthFlags';
import {
  bindGrowthAlertUser, pushGrowthAlerts, markGrowthSeen, hasGrowthSeenLedger,
  type GrowthAlert,
} from '@/lib/growthAlertStore';

const POLL_MS = 60_000;
/** On a brand-new device, only cards generated this recently are announced. */
const BOOTSTRAP_WINDOW_MS = 45 * 60_000;

interface Row {
  id: string;
  slot: string;
  title: string;
  category: string;
  content: string;
  actionable_step: string | null;
  created_at: string;
  status: string;
}

function toAlert(row: Row): GrowthAlert {
  return {
    id: row.id,
    slot: row.slot,
    title: row.title,
    category: row.category,
    content: row.content,
    actionable_step: row.actionable_step,
    created_at: row.created_at,
    durationMs: readingTimeMs(row.title, row.content, row.actionable_step),
  };
}

export function useGrowthAlertEngine(enabled: boolean, onAlert?: (a: GrowthAlert) => void) {
  const { user } = useAuth();
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  useEffect(() => {
    bindGrowthAlertUser(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    if (!enabled || !user?.id) return;
    let cancelled = false;
    let bootstrapped = hasGrowthSeenLedger();

    const sync = async () => {
      try {
        const { data, error } = await supabase
          .from('growth_feed_items')
          .select('id, slot, title, category, content, actionable_step, created_at, status')
          .eq('user_id', user.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(10);
        if (error || cancelled) return;
        const rows = ((data as Row[] | null) ?? []).slice().reverse();
        if (rows.length === 0) return;

        if (!bootstrapped) {
          // First run on this device: only announce what was just generated.
          const cutoff = Date.now() - BOOTSTRAP_WINDOW_MS;
          const stale = rows.filter((r) => new Date(r.created_at).getTime() < cutoff);
          markGrowthSeen(stale.map((r) => r.id));
          bootstrapped = true;
        }

        const queued = pushGrowthAlerts(rows.map(toAlert));
        queued.forEach((a) => onAlertRef.current?.(a));
      } catch {
        // Detection is best-effort; the next tick retries.
      }
    };

    void sync();
    const timer = window.setInterval(() => { void sync(); }, POLL_MS);

    const onWake = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('online', onWake);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`growth-alerts-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'growth_feed_items',
            filter: `user_id=eq.${user.id}`,
          },
          () => { void sync(); },
        )
        .subscribe();
    } catch {
      // Realtime unavailable — the poll above still covers detection.
    }

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('online', onWake);
      try { if (channel) void supabase.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [enabled, user?.id]);
}

export default useGrowthAlertEngine;
