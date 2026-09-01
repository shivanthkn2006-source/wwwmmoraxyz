/**
 * GROWTH DELIVERY SUPERVISOR (per member, client side)
 *
 * One hook that owns everything about "did today's insights actually arrive":
 *
 *  1. `runCatchUp()` — a user-triggered catch-up that asks the growth-dispatch
 *     worker to fill every elapsed window for THIS member only, and reports the
 *     resulting status back to the UI.
 *  2. Bounded automatic retry — when a window has passed with no card, or the
 *     next insight is `failed`, a retry is scheduled with exponential backoff
 *     (2 min, 4 min, 8 min), capped at 3 attempts per local day and persisted so
 *     a reload cannot restart the budget. Never retries while the engine is
 *     paused (user pause, credit/policy circuit breaker) — that is a terminal
 *     state that only an explicit action clears.
 *  3. Live reconciliation — after a worker write lands (realtime insert on
 *     growth_feed_items), the hook waits a short settle delay, re-reads status
 *     and, if any elapsed window is still empty, performs exactly one
 *     reconciliation catch-up for the day.
 *
 * All work runs through the edge function under the caller's own session, so
 * nothing here can read or change another member's data.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useGrowthStatus, type ScheduleEntry } from '@/hooks/useGrowthStatus';
import { invokeGrowthDispatch } from '@/lib/growthDispatch';

const MAX_AUTO_RETRIES = 3;
const BASE_RETRY_MS = 2 * 60_000;
const SETTLE_MS = 25_000;

export interface CatchUpResult {
  ok: boolean;
  message: string;
  written: number;
  at: string;
}

interface RetryState {
  date: string;
  count: number;
  nextAt: number | null;
}

const storageKey = (userId: string) => `growth_retry_${userId}`;

function readRetry(userId: string, date: string): RetryState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as RetryState) : null;
    if (parsed && parsed.date === date) return parsed;
  } catch { /* private mode — start fresh */ }
  return { date, count: 0, nextAt: null };
}

function writeRetry(userId: string, state: RetryState) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(state)); } catch { /* ignore */ }
}

/** Windows that have already passed today but hold no card yet. */
export function missingWindows(schedule: ScheduleEntry[] | undefined): ScheduleEntry[] {
  return (schedule ?? []).filter((entry) => entry.passed && !entry.item);
}

export function useGrowthDelivery(enabled = true) {
  const { user } = useAuth();
  const { status, loading, error, refresh } = useGrowthStatus(enabled);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CatchUpResult | null>(null);
  const [retry, setRetry] = useState<RetryState>({ date: '', count: 0, nextAt: null });
  const timerRef = useRef<number | null>(null);
  const reconciledForRef = useRef<string | null>(null);

  const localDate = status?.local_date ?? '';
  const gaps = missingWindows(status?.schedule);
  const enginePaused = Boolean(status?.paused_by_user || status?.engine_paused);

  useEffect(() => {
    if (!user || !localDate) return;
    setRetry(readRetry(user.id, localDate));
  }, [user, localDate]);

  const runCatchUp = useCallback(
    async (reason: 'manual' | 'auto' | 'reconcile' = 'manual'): Promise<CatchUpResult> => {
      if (!user) {
        const denied = { ok: false, message: 'Sign in required.', written: 0, at: new Date().toISOString() };
        setResult(denied);
        return denied;
      }
      setRunning(true);
      try {
        const { data, error: fnError } = await invokeGrowthDispatch({ action: 'catchup-me', reason });
        if (fnError) throw fnError;
        const written = Number(data?.summary?.written ?? 0);
        const skipped = String(data?.skipped ?? '');
        const ok = data?.ok !== false;
        const message = !ok
          ? String(data?.error ?? 'Catch-up could not run.')
          : skipped
            ? 'The worker is busy right now — try again in a moment.'
            : written > 0
              ? `Delivered ${written} insight${written === 1 ? '' : 's'} for today.`
              : 'Everything due today is already delivered.';
        const next = { ok, message, written, at: new Date().toISOString() };
        setResult(next);
        await refresh();
        return next;
      } catch (e) {
        const failed = {
          ok: false,
          message: String((e as Error)?.message ?? e).slice(0, 200),
          written: 0,
          at: new Date().toISOString(),
        };
        setResult(failed);
        return failed;
      } finally {
        setRunning(false);
      }
    },
    [user, refresh],
  );

  // ── Bounded automatic retry ───────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !user || !localDate || loading || enginePaused) return;
    const needsRetry = gaps.length > 0 || status?.next_status === 'failed';
    if (!needsRetry) return;
    if (retry.count >= MAX_AUTO_RETRIES) return;
    if (timerRef.current) return;

    const delay = BASE_RETRY_MS * 2 ** retry.count;
    const nextAt = Date.now() + delay;
    const state = { date: localDate, count: retry.count, nextAt };
    writeRetry(user.id, state);
    setRetry(state);

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const advanced = { date: localDate, count: state.count + 1, nextAt: null };
      writeRetry(user.id, advanced);
      setRetry(advanced);
      void runCatchUp('auto');
    }, delay);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // `gaps.length` (not the array) keeps this effect stable across re-renders.
  }, [enabled, user, localDate, loading, enginePaused, gaps.length, status?.next_status, retry.count, runCatchUp]);

  // ── Live reconciliation shortly after a worker write ──────────────────────
  useEffect(() => {
    if (!enabled || !user) return;
    let settle: number | null = null;
    const channel = supabase
      .channel(`growth-delivery-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'growth_feed_items', filter: `user_id=eq.${user.id}` },
        () => {
          if (settle) window.clearTimeout(settle);
          settle = window.setTimeout(() => {
            settle = null;
            void (async () => {
              const fresh = await refresh();
              void fresh;
            })();
          }, SETTLE_MS);
        },
      )
      .subscribe();

    return () => {
      if (settle) window.clearTimeout(settle);
      supabase.removeChannel(channel);
    };
  }, [enabled, user, refresh]);

  // After the settle refresh, close any remaining gap exactly once per day.
  useEffect(() => {
    if (!enabled || !user || !localDate || loading || enginePaused || running) return;
    if (gaps.length === 0) return;
    if (reconciledForRef.current === localDate) return;
    if (!status?.last_run_at) return;
    const sinceRun = Date.now() - new Date(status.last_run_at).getTime();
    if (sinceRun < SETTLE_MS || sinceRun > 6 * 60 * 60_000) return;
    reconciledForRef.current = localDate;
    void runCatchUp('reconcile');
  }, [enabled, user, localDate, loading, enginePaused, running, gaps.length, status?.last_run_at, runCatchUp]);

  return {
    status,
    loading,
    error,
    running,
    result,
    gaps,
    retryCount: retry.count,
    maxRetries: MAX_AUTO_RETRIES,
    nextRetryAt: retry.nextAt,
    runCatchUp,
    refresh,
  };
}

export default useGrowthDelivery;
