/**
 * Loads the growth feature-flag rows once per session (5 minute TTL, shared
 * module cache so twenty components cost one query) and exposes a synchronous
 * evaluator. Any failure falls back to the built-in defaults — the engine keeps
 * working even when the flag table is unreachable.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { evaluateFlag, GROWTH_FLAGS, type GrowthFlag } from '@/lib/growthFlags';

const TTL_MS = 5 * 60_000;

/** Safe defaults if the table is unreachable: core on, notifications off. */
const FALLBACK: Record<string, boolean> = {
  [GROWTH_FLAGS.engine]: true,
  [GROWTH_FLAGS.alerts]: true,
  [GROWTH_FLAGS.push]: false,
  [GROWTH_FLAGS.email]: false,
  [GROWTH_FLAGS.export]: true,
  [GROWTH_FLAGS.newBadge]: true,
  [GROWTH_FLAGS.loopsAutoplayLoop]: false,
  [GROWTH_FLAGS.onboardingGating]: true,
};


let cache: { at: number; flags: Record<string, GrowthFlag> } | null = null;
let inflight: Promise<Record<string, GrowthFlag>> | null = null;

async function fetchFlags(force = false): Promise<Record<string, GrowthFlag>> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.flags;
  if (!force && inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from('growth_feature_flags')
        .select('flag_key, enabled, rollout_percent, allow_user_ids, block_user_ids, description');
      if (error) throw error;
      const flags: Record<string, GrowthFlag> = {};
      ((data as GrowthFlag[] | null) ?? []).forEach((f) => { flags[f.flag_key] = f; });
      cache = { at: Date.now(), flags };
      return flags;
    } catch {
      return cache?.flags ?? {};
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Test/admin helper — drops the shared cache so the next read re-queries. */
export function invalidateGrowthFlags() {
  cache = null;
}

export function useGrowthFlags() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<Record<string, GrowthFlag>>(() => cache?.flags ?? {});
  const [loading, setLoading] = useState(!cache);
  // The flag read is a network round-trip; a component that unmounts first
  // (route change, or a torn-down test environment) must not be written to.
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const load = useCallback(async (force = false) => {
    const next = await fetchFlags(force);
    if (!alive.current) return;
    setFlags(next);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isEnabled = useCallback(
    (key: string) => evaluateFlag(flags[key], user?.id, FALLBACK[key] ?? false),
    [flags, user?.id],
  );

  return { flags, loading, isEnabled, refresh: () => load(true) };
}

export default useGrowthFlags;
