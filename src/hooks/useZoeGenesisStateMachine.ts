/**
 * GENESIS STATE MACHINE
 * Explicit stage enum for Zoe Infinity onboarding:
 *   ASK_NAME → ASK_AGE → ASK_LOCATION → IDENTIFY_USER → NAMING → COMPLETE
 *
 * Backed by public.zoe_genesis_memory (DB) with localStorage fallback so the
 * machine works pre-auth and resumes cross-device once signed in.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type GenesisStage =
  | 'ASK_NAME'
  | 'ASK_AGE'
  | 'ASK_LOCATION'
  | 'IDENTIFY_USER'
  | 'NAMING'
  | 'COMPLETE';

export const GENESIS_STAGES: GenesisStage[] = [
  'ASK_NAME', 'ASK_AGE', 'ASK_LOCATION', 'IDENTIFY_USER', 'NAMING', 'COMPLETE',
];

export interface GenesisMemory {
  stage: GenesisStage;
  name?: string | null;
  nickname?: string | null;
  age?: number | null;
  dob?: string | null;
  location?: { city?: string; region?: string; country?: string; lat?: number; lng?: number } | null;
  life_stage?: string | null;
  zoe_name?: string | null;
  zoe_gender?: 'female' | 'male' | null;
  completed_at?: string | null;
}

const LS_KEY = 'zoe_genesis_memory_v1';

const EMPTY: GenesisMemory = { stage: 'ASK_NAME' };

function readLocal(): GenesisMemory {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {}
  return { ...EMPTY };
}
function writeLocal(m: GenesisMemory) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(m)); } catch {}
}

export function useZoeGenesisStateMachine() {
  const { user } = useAuth();
  const [memory, setMemory] = useState<GenesisMemory>(readLocal);
  const [loading, setLoading] = useState(true);

  // Pull from DB once we have a user
  useEffect(() => {
    let cancelled = false;
    if (!user?.id) { setLoading(false); return; }
    (async () => {
      try {
        const { data } = await supabase
          .from('zoe_genesis_memory' as any)
          .select('stage,name,nickname,age,dob,location,life_stage,zoe_name,zoe_gender,completed_at')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          const next: GenesisMemory = { ...EMPTY, ...(data as any) };
          setMemory(next);
          writeLocal(next);
        }
      } catch (e) {
        console.warn('[Genesis] DB read failed, using local:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const persist = useCallback(async (patch: Partial<GenesisMemory>) => {
    setMemory(prev => {
      const next: GenesisMemory = { ...prev, ...patch };
      writeLocal(next);
      if (user?.id) {
        supabase
          .from('zoe_genesis_memory' as any)
          .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
          .then(({ error }) => { if (error) console.warn('[Genesis] upsert failed:', error.message); });
      }
      return next;
    });
  }, [user?.id]);

  const advance = useCallback(async (patch: Partial<GenesisMemory> = {}) => {
    const idx = GENESIS_STAGES.indexOf(memory.stage);
    const nextStage = GENESIS_STAGES[Math.min(idx + 1, GENESIS_STAGES.length - 1)];
    const completed = nextStage === 'COMPLETE' ? new Date().toISOString() : null;
    await persist({ ...patch, stage: nextStage, completed_at: completed ?? memory.completed_at ?? null });
  }, [memory, persist]);

  const reset = useCallback(async () => {
    await persist({ ...EMPTY });
  }, [persist]);

  return {
    memory,
    stage: memory.stage,
    loading,
    isComplete: memory.stage === 'COMPLETE',
    persist,
    advance,
    reset,
  };
}

export default useZoeGenesisStateMachine;
