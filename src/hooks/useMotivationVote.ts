import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MotivationVoteStats { up: number; down: number; days: number }

/** One member's saved vote on a motivation, plus their lifetime vote stats. */
export function useMotivationVote(motivationId?: string | null, userId?: string | null) {
  const [vote, setVote] = useState<number | null>(null);
  const [stats, setStats] = useState<MotivationVoteStats>({ up: 0, down: 0, days: 0 });

  const loadStats = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from('zoe_motivation_votes' as never).select('vote').eq('user_id', userId);
    const rows = (data as unknown as { vote: number }[]) ?? [];
    setStats({ up: rows.filter((r) => r.vote === 1).length, down: rows.filter((r) => r.vote === -1).length, days: rows.length });
  }, [userId]);

  useEffect(() => {
    setVote(null);
    if (!motivationId || !userId) return;
    void supabase.from('zoe_motivation_votes' as never).select('vote')
      .eq('user_id', userId).eq('motivation_id', motivationId).maybeSingle()
      .then(({ data }) => setVote((data as { vote?: number } | null)?.vote ?? null));
    void loadStats();
  }, [motivationId, userId, loadStats]);

  const cast = useCallback(async (value: 1 | -1) => {
    if (!motivationId || !userId) return false;
    const prev = vote;
    const next = vote === value ? null : value;
    setVote(next);
    const table = supabase.from('zoe_motivation_votes' as never);
    const { error } = next === null
      ? await table.delete().eq('user_id', userId).eq('motivation_id', motivationId)
      : await table.upsert({ user_id: userId, motivation_id: motivationId, vote: next } as never, { onConflict: 'user_id,motivation_id' });
    if (error) { setVote(prev); return false; }
    void loadStats();
    return true;
  }, [motivationId, userId, vote, loadStats]);

  return { vote, cast, stats };
}

/** Today's motivation is revealed in the feed from 07:00 local time. */
export const MOTIVATION_REVEAL_HOUR = 7;
export const isMotivationRevealed = (d = new Date()) => d.getHours() >= MOTIVATION_REVEAL_HOUR;
