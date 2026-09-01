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

        // profiles is keyed by `user_id` (its `id` column is a separate row id).
        const { data, error } = await supabase
          .from('profiles')
          .select('birth_date, birth_time, birth_place')
          .eq('user_id', uid)
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
    // Strict date validation: the alignment and Growth engines derive
    // everything from this value, so a typo silently degrades every card the
    // member ever receives. Reject anything not a real, plausible birth date.
    const parsed = new Date(`${details.birth_date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: 'That is not a valid date.' };
    }
    const year = parsed.getUTCFullYear();
    const nowYear = new Date().getUTCFullYear();
    if (parsed.getTime() > Date.now()) {
      return { ok: false, error: 'Birth date cannot be in the future.' };
    }
    if (year < nowYear - 120) {
      return { ok: false, error: 'Please enter a birth date within the last 120 years.' };
    }
    if (year > nowYear - 13) {
      return { ok: false, error: 'You must be at least 13 years old to use M\'Mora.' };
    }
    const patch = {
      // Both columns are written: the engines read `birth_date` while older
      // onboarding paths wrote `date_of_birth`. A DB trigger keeps them in
      // sync too, but writing both keeps the intent obvious at the call site.
      birth_date: details.birth_date,
      date_of_birth: details.birth_date,
      birth_time: `${details.birth_time.slice(0, 5)}:00`,
      birth_place: details.birth_place.trim(),
    };

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('user_id', userId)
      .select('user_id');

    if (error) return { ok: false, error: error.message };

    // Members who never got a profile row still need their details stored.
    if (!updated || updated.length === 0) {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email ?? '';
      const base = (email.split('@')[0] || 'member').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'member';
      const { error: insertError } = await supabase.from('profiles').insert({
        user_id: userId,
        username: `${base}${userId.slice(0, 6)}`,
        display_name: base,
        ...patch,
      });
      if (insertError) return { ok: false, error: insertError.message };
    }

    // Ask the engine to build today's alignment straight away.
    try {
      await supabase.functions.invoke('astro-dispatch', {
        body: { action: 'run', userId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
    } catch { /* the scheduled run will pick it up anyway */ }

    // Growth cards are personalised from the same birth data, so build the
    // first one now rather than making the member wait for the next window.
    try {
      await supabase.functions.invoke('growth-dispatch', { body: { targetUserId: userId } });
    } catch { /* the scheduled run will pick it up anyway */ }

    setNeedsDetails(false);
    return { ok: true as const };
  }, [userId]);

  const snooze = useCallback(() => {
    // Strict DOB: the date itself is not optional. Members may defer time and
    // place (which only refine the reading), but without a birth date every
    // personalised surface falls back to generic content — which is exactly
    // the failure this gate exists to prevent.
    if (!existing?.birth_date) return;
    if (userId) {
      try {
        localStorage.setItem(SNOOZE_KEY(userId), String(Date.now() + SNOOZE_DAYS * 86400000));
      } catch { /* private mode */ }
    }
    setNeedsDetails(false);
  }, [userId, existing]);

  return {
    needsDetails,
    existing,
    loading,
    save,
    snooze,
    /** False while the member has no stored birth date — the prompt is then mandatory. */
    canSnooze: !!existing?.birth_date,
  };
}

export default useBirthDetailsGate;
