import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TAKEOVER_SECONDS = 60;

const localDateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Local 5:00 AM precision scheduler for the sandboxed M'Mora Zoe overlay.
 * Drift-immune (delta timestamps), once-per-day (DB unique row + localStorage).
 */
export const useMoraZoeScheduler = (userId?: string) => {
  const [showMorningTakeover, setShowMorningTakeover] = useState(false);
  const [showLoginGreeting, setShowLoginGreeting] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(TAKEOVER_SECONDS);
  const timerRef = useRef<number | null>(null);
  const remainingRef = useRef(TAKEOVER_SECONDS);

  const recordViewCompletion = useCallback(async (dismissType: 'auto_timer' | 'manual') => {
    if (!userId) return;
    const todayStr = localDateKey();
    try { localStorage.setItem(`mora_zoe_5am_${todayStr}`, 'true'); } catch { /* private mode */ }
    try {
      await (supabase as unknown as { from: (t: string) => any })
        .from('user_daily_ephemeral_views')
        .upsert(
          {
            user_id: userId,
            view_date: todayStr,
            view_duration_seconds: TAKEOVER_SECONDS - remainingRef.current,
            dismiss_type: dismissType,
          },
          { onConflict: 'user_id,view_date' },
        );
    } catch (err) {
      console.warn('[MoraZoe Scheduler] view record failed', err);
    }
  }, [userId]);

  const dismissTakeover = useCallback((type: 'auto_timer' | 'manual' = 'manual') => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setShowMorningTakeover(false);
    void recordViewCompletion(type);
  }, [recordViewCompletion]);

  const trigger5AMTakeover = useCallback(() => {
    setShowLoginGreeting(false);
    setShowMorningTakeover(true);
    remainingRef.current = TAKEOVER_SECONDS;
    setSecondsRemaining(TAKEOVER_SECONDS);

    const startTime = Date.now();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, TAKEOVER_SECONDS - elapsed);
      remainingRef.current = remaining;
      setSecondsRemaining(remaining);
      if (remaining <= 0) dismissTakeover('auto_timer');
    }, 250);
  }, [dismissTakeover]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let schedulerTimer: number | null = null;

    const boot = async () => {
      const todayStr = localDateKey();
      let seenRemote = false;
      try {
        const { data } = await (supabase as unknown as { from: (t: string) => any })
          .from('user_daily_ephemeral_views')
          .select('id')
          .eq('user_id', userId)
          .eq('view_date', todayStr)
          .maybeSingle();
        seenRemote = !!data;
      } catch { /* offline-safe */ }

      let seenLocal = false;
      try { seenLocal = !!localStorage.getItem(`mora_zoe_5am_${todayStr}`); } catch { /* noop */ }

      if (cancelled) return;

      const isPast5AM = new Date().getHours() >= 5;
      if (isPast5AM && !seenRemote && !seenLocal) {
        trigger5AMTakeover();
      } else {
        try {
          if (!sessionStorage.getItem(`mora_zoe_login_greet_${todayStr}`)) {
            sessionStorage.setItem(`mora_zoe_login_greet_${todayStr}`, 'true');
            setShowLoginGreeting(true);
          }
        } catch { /* noop */ }
      }

      const now = new Date();
      const next5AM = new Date();
      next5AM.setHours(5, 0, 0, 0);
      if (now.getTime() >= next5AM.getTime()) next5AM.setDate(next5AM.getDate() + 1);
      const msUntil5AM = next5AM.getTime() - now.getTime();
      // setTimeout is capped at ~24.8 days; 5AM is always well within range.
      schedulerTimer = window.setTimeout(() => trigger5AMTakeover(), msUntil5AM);
    };

    void boot();

    return () => {
      cancelled = true;
      if (schedulerTimer) window.clearTimeout(schedulerTimer);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [userId, trigger5AMTakeover]);

  return {
    showMorningTakeover,
    showLoginGreeting,
    secondsRemaining,
    dismissTakeover,
    dismissLoginGreeting: () => setShowLoginGreeting(false),
  };
};

export default useMoraZoeScheduler;
