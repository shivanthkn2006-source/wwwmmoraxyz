import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BirthDetails {
  birth_date: string;
  birth_time: string;
  birth_place: string;
}

const SNOOZE_KEY = (uid: string) => `mora_zoe_birth_prompt_snooze_${uid}`;
const SNOOZE_DAYS = 3;

const isComplete = (p: Partial<BirthDetails> | null) =>
  !!(p && p.birth_date && p.birth_time && p.birth_place && String(p.birth_place).trim().length > 1);

/**
 * Detects members who have NOT filled birth date / time / place, so the
 * alignment engine can ask them once (and only them). Fully self-contained:
 * no feed, routing or profile component is touched.
 */
export function useBirthDetailsGate() {
  const [userId, setUserId] = useState<string | undefined>();
  const [needsDetails, setNeedsDetails] = useState(false);
  const [existing, setExisting] = useState<BirthDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const snoozed = useCallback((uid: string) => {
    try {
      const until = Number(localStorage.getItem(SNOOZE_KEY(uid)) || 0);
      return Number.isFinite(until) && Date.now() < until;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) { if (!cancelled) setLoading(false); return; }
        if (!cancelled) setUserId(uid);

        const { data, error } = await supabase
          .from('profiles')
          .select('birth_date, birth_time, birth_place')
          .eq('id', uid)
          .maybeSingle();

        if (error) throw error;
        const p = (data ?? null) as Partial<BirthDetails> | null;
        if (cancelled) return;

        setExisting({
          birth_date: p?.birth_date ?? '',
          birth_time: (p?.birth_time ?? '').slice(0, 5),
          birth_place: p?.birth_place ?? '',
        });
        setNeedsDetails(!isComplete(p) && !snoozed(uid));
      } catch (err) {
        console.warn('[BirthGate] check failed', err);
        if (!cancelled) setNeedsDetails(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [snoozed]);

  const save = useCallback(async (details: BirthDetails) => {
    if (!userId) return { ok: false, error: 'Not signed in.' };
    if (!details.birth_date || !details.birth_time || !details.birth_place.trim()) {
      return { ok: false, error: 'Please fill date, time and place.' };
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        birth_date: details.birth_date,
        birth_time: `${details.birth_time.slice(0, 5)}:00`,
        birth_place: details.birth_place.trim(),
      })
      .eq('id', userId);

    if (error) return { ok: false, error: error.message };

    // Ask the engine to build today's alignment straight away.
    try {
      await supabase.functions.invoke('astro-dispatch', {
        body: { action: 'run', userId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
    } catch { /* the scheduled run will pick it up anyway */ }

    setNeedsDetails(false);
    return { ok: true as const };
  }, [userId]);

  const snooze = useCallback(() => {
    if (userId) {
      try {
        localStorage.setItem(SNOOZE_KEY(userId), String(Date.now() + SNOOZE_DAYS * 86400000));
      } catch { /* private mode */ }
    }
    setNeedsDetails(false);
  }, [userId]);

  return { needsDetails, existing, loading, save, snooze };
}

export default useBirthDetailsGate;
