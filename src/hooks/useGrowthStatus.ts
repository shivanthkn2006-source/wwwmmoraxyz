/**
 * Per-user growth engine status: today's delivery schedule, whether the next
 * insight is scheduled / pending / generated / failed, and a guarded
 * "regenerate now" action.
 *
 * All work happens in the growth-dispatch edge function under the caller's own
 * session, so nothing here can read or change another member's data.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { GrowthSlot, ReflectionStyle } from '@/lib/growthSlot';
import { invokeGrowthDispatch } from '@/lib/growthDispatch';

export type SlotStatus = 'delivered' | 'shadow' | 'pending' | 'scheduled';
export type NextStatus = 'paused' | 'failed' | 'pending' | 'scheduled' | 'complete';

export interface ScheduleEntry {
  slot: GrowthSlot;
  label: string;
  local_time: string;
  passed: boolean;
  status: SlotStatus;
  item: {
    id: string;
    slot: GrowthSlot;
    title: string;
    category: string;
    status: string;
    source: string;
    created_at: string;
    regen_count?: number;
  } | null;
}

export interface GrowthStatus {
  timezone: string;
  local_date: string;
  paused_by_user: boolean;
  engine_paused: boolean;
  engine_paused_reason: string | null;
  shadow_mode: boolean;
  last_run_at: string | null;
  last_error: string | null;
  next_status: NextStatus;
  next: ScheduleEntry | null;
  schedule: ScheduleEntry[];
  focus_areas: string[];
  styles: ReflectionStyle[];
  delivery_frequency: number;
}

export function useGrowthStatus(enabled = true) {
  const { user } = useAuth();
  const [status, setStatus] = useState<GrowthStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const load = useCallback(async () => {
    if (!user || !enabled) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: fnError } = await invokeGrowthDispatch({ action: 'me-status' });
      if (fnError) throw fnError;
      if (!data?.ok) throw new Error(String(data?.error ?? 'status unavailable'));
      setStatus(data.status as GrowthStatus);
      setError(null);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [user, enabled]);

  useEffect(() => { void load(); }, [load]);

  const regenerate = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: 'sign in required' };
    setRegenerating(true);
    try {
      const { data, error: fnError } = await invokeGrowthDispatch({ action: 'regenerate' });
      if (fnError) throw fnError;
      if (!data?.ok) return { ok: false, error: String(data?.error ?? 'could not regenerate') };
      await load();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String((e as Error)?.message ?? e) };
    } finally {
      setRegenerating(false);
    }
  }, [user, load]);

  return { status, loading, error, regenerating, refresh: load, regenerate };
}

export default useGrowthStatus;
