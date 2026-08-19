import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Image as ImageIcon, Eye, Coins, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface ImageRow {
  id: string;
  kind: 'Alignment' | 'Motivation';
  title: string;
  target_date: string;
  slot?: string | null;
  image_status: string;
  image_provider: string | null;
  image_attempts: number;
  image_retries: number;
  image_cost_usd: number;
  image_prompt: string | null;
  image_attempt_log: Array<{ provider: string; model?: string; ok: boolean; ms: number; reason?: string }> | null;
}

interface ImpressionRow {
  surface: string;
  target_date: string;
  opened_at: string;
  dwell_ms: number | null;
  read_completed: boolean;
}

const statusTone = (s: string) =>
  s === 'generated' ? 'text-primary'
  : s === 'fallback' ? 'text-muted-foreground'
  : s === 'failed' ? 'text-destructive'
  : 'text-muted-foreground';

const money = (n: number) => `$${(Number(n) || 0).toFixed(5)}`;

/** Per-card generation log: status, provider, retries, cost and scene prompt. */
const ZoeAstroLogPage: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<ImageRow[]>([]);
  const [impressions, setImpressions] = useState<ImpressionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [pred, mot, imp] = await Promise.all([
        supabase
          .from('astro_predictions' as never)
          .select('id, target_date, slot, prediction_headline, image_status, image_provider, image_attempts, image_retries, image_cost_usd, image_prompt, image_attempt_log')
          .eq('user_id', user.id)
          .order('target_date', { ascending: false })
          .limit(40),
        supabase
          .from('zoe_daily_motivations' as never)
          .select('id, target_date, headline, image_status, image_provider, image_attempts, image_retries, image_cost_usd, image_prompt, image_attempt_log')
          .eq('user_id', user.id)
          .order('target_date', { ascending: false })
          .limit(40),
        supabase
          .from('astro_card_impressions' as never)
          .select('surface, target_date, opened_at, dwell_ms, read_completed')
          .eq('user_id', user.id)
          .order('target_date', { ascending: false })
          .limit(60),
      ]);

      const a: ImageRow[] = ((pred.data as unknown as Record<string, unknown>[]) ?? []).map((r) => ({
        id: String(r.id), kind: 'Alignment', title: String(r.prediction_headline ?? '—'),
        target_date: String(r.target_date), slot: (r.slot as string) ?? null,
        image_status: String(r.image_status ?? 'pending'),
        image_provider: (r.image_provider as string) ?? null,
        image_attempts: Number(r.image_attempts ?? 0),
        image_retries: Number(r.image_retries ?? 0),
        image_cost_usd: Number(r.image_cost_usd ?? 0),
        image_prompt: (r.image_prompt as string) ?? null,
        image_attempt_log: (r.image_attempt_log as ImageRow['image_attempt_log']) ?? null,
      }));
      const b: ImageRow[] = ((mot.data as unknown as Record<string, unknown>[]) ?? []).map((r) => ({
        id: String(r.id), kind: 'Motivation', title: String(r.headline ?? '—'),
        target_date: String(r.target_date),
        image_status: String(r.image_status ?? 'pending'),
        image_provider: (r.image_provider as string) ?? null,
        image_attempts: Number(r.image_attempts ?? 0),
        image_retries: Number(r.image_retries ?? 0),
        image_cost_usd: Number(r.image_cost_usd ?? 0),
        image_prompt: (r.image_prompt as string) ?? null,
        image_attempt_log: (r.image_attempt_log as ImageRow['image_attempt_log']) ?? null,
      }));

      setRows([...a, ...b].sort((x, y) => (x.target_date < y.target_date ? 1 : -1)));
      setImpressions((imp.data as unknown as ImpressionRow[]) ?? []);
    } catch (err) {
      console.error('[ZoeAstroLog] load failed', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const totalCost = rows.reduce((sum, r) => sum + (Number(r.image_cost_usd) || 0), 0);
  const totalRetries = rows.reduce((sum, r) => sum + (Number(r.image_retries) || 0), 0);
  const openRate = (surface: string) => {
    const seen = impressions.filter((i) => i.surface === surface);
    const read = seen.filter((i) => i.read_completed).length;
    return { seen: seen.length, read };
  };
  const dawn = openRate('morning_takeover');
  const greeting = openRate('login_greeting');

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4 pb-24">
        <header className="flex items-center gap-3">
          <Link to="/zoe-astro" aria-label="Back to dashboard" className="rounded-lg border border-border p-2">
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Card generation log</h1>
            <p className="text-sm text-muted-foreground">Image status, retries, cost and the scene prompt used.</p>
          </div>
          <button onClick={load} className="ml-auto rounded-lg border border-border p-2" aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          </button>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-4">
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Coins className="h-3.5 w-3.5" aria-hidden /> Total image cost</p>
            <p className="mt-1 text-lg font-semibold">{money(totalCost)}</p>
            <p className="text-xs text-muted-foreground">Pollinations — free tier</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" aria-hidden /> Total retries</p>
            <p className="mt-1 text-lg font-semibold">{totalRetries}</p>
            <p className="text-xs text-muted-foreground">{rows.length} cards tracked</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" aria-hidden /> Opens</p>
            <p className="mt-1 text-sm">Dawn takeover: <span className="font-semibold">{dawn.seen}</span> ({dawn.read} read)</p>
            <p className="text-sm">Login motivation: <span className="font-semibold">{greeting.seen}</span> ({greeting.read} read)</p>
          </div>
        </section>

        <section className="space-y-3">
          {!loading && rows.length === 0 && (
            <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">No cards generated yet.</p>
          )}
          {rows.map((r) => (
            <article key={`${r.kind}_${r.id}`} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {r.kind}{r.slot ? ` • ${r.slot}` : ''}
                </span>
                <span className="text-xs text-muted-foreground">{r.target_date}</span>
                <span className={`ml-auto text-xs font-medium ${statusTone(r.image_status)}`}>
                  {r.image_status}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium">{r.title}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" aria-hidden /> {r.image_provider ?? 'not generated'}</span>
                <span>Attempts: {r.image_attempts}</span>
                <span>Retries: {r.image_retries}</span>
                <span>Cost: {money(r.image_cost_usd)}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(open === r.id ? null : r.id)}
                className="mt-3 text-xs underline underline-offset-4"
              >
                {open === r.id ? 'Hide details' : 'Scene prompt & attempts'}
              </button>
              {open === r.id && (
                <div className="mt-3 space-y-3 rounded-lg bg-muted/40 p-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Scene prompt</p>
                    <p className="mt-1 text-xs">{r.image_prompt ?? 'not recorded'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Attempts</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      {(r.image_attempt_log ?? []).map((a, i) => (
                        <li key={i} className={a.ok ? 'text-primary' : 'text-muted-foreground'}>
                          {i + 1}. {a.provider}{a.model ? ` (${a.model})` : ''} — {a.ok ? 'ok' : `failed: ${a.reason ?? 'unknown'}`} · {a.ms}ms
                        </li>
                      ))}
                      {(!r.image_attempt_log || r.image_attempt_log.length === 0) && (
                        <li className="text-muted-foreground">No attempt log recorded for this card.</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
};

export default ZoeAstroLogPage;
