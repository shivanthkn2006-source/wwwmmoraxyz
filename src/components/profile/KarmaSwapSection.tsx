/**
 * Karma → credits swap. The server function takes the karma and adds the
 * points in one locked step; the client only asks and re-reads balances.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const RATE = 100; // 100 karma = 1 credit (1000 points)

export function KarmaSwapSection() {
  const { user } = useAuth();
  const [karma, setKarma] = useState<number | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [amount, setAmount] = useState(RATE);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: player }, { data: profile }] = await Promise.all([
      supabase.from('exodus_players').select('resonance_points').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('total_points').eq('user_id', user.id).maybeSingle(),
    ]);
    setKarma(player?.resonance_points ?? 0);
    setPoints(profile?.total_points ?? 0);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (!user) return null;
  const max = Math.floor((karma ?? 0) / RATE) * RATE;
  const credits = Math.floor(amount / RATE);

  const swap = async () => {
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)('exchange_karma_for_credits', { p_karma: amount });
    setBusy(false);
    if (error) { toast.error(error.message || 'Swap failed'); return; }
    toast.success(`Swapped ${Number(data) * RATE} karma for ${data} credit${data === 1 ? '' : 's'}`);
    await load();
  };

  return (
    <section className="mx-4 my-6 rounded-2xl border border-border/50 p-4 text-foreground" data-karma-swap>
      <h2 className="text-base font-semibold mb-1">Karma swap</h2>
      <p className="text-sm text-muted-foreground mb-3">
        {RATE} karma = 1 credit. You have {karma ?? '—'} karma · {points == null ? '—' : Math.floor(points / 1000)} credits.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          aria-label="Karma to swap"
          min={RATE}
          step={RATE}
          max={max || RATE}
          value={amount}
          onChange={(e) => setAmount(Math.max(RATE, Math.floor(Number(e.target.value) / RATE) * RATE || RATE))}
          className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-base"
        />
        <Button onClick={swap} disabled={busy || max < RATE || amount > max}>
          {busy ? 'Swapping…' : `Swap for ${credits} credit${credits === 1 ? '' : 's'}`}
        </Button>
      </div>
      {max < RATE && karma != null && (
        <p className="text-xs text-muted-foreground mt-2">Earn {RATE - (karma % RATE)} more karma to swap.</p>
      )}
    </section>
  );
}

export default KarmaSwapSection;
