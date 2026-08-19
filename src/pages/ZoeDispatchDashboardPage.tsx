import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, PlayCircle, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface RunRow {
  id: string;
  engine: string;
  started_at: string;
  finished_at: string | null;
  summary: Record<string, unknown> | null;
  results: Array<{ user_id: string; slot: string | null; status: string; note?: string }> | null;
  failed_count: number;
  error: string | null;
}

interface QueueRow {
  id: string;
  target_date: string;
  slot: string;
  status: string;
  prediction_headline: string | null;
  poster_image_url: string | null;
  created_at: string;
}

/** Operations view: what the daily engine queued, what it ran, and what failed. */
const ZoeDispatchDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [state, setState] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [runRes, queueRes, stateRes] = await Promise.all([
      (supabase.from('astro_dispatch_runs' as never) as never as {
        select: (s: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: RunRow[] | null }> } };
      }).select('*').order('started_at', { ascending: false }).limit(20),
      supabase
        .from('astro_predictions')
        .select('id, target_date, slot, status, prediction_headline, poster_image_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('astro_dispatch_state').select('*').maybeSingle(),
    ]);
    setRuns((runRes.data as RunRow[]) ?? []);
    setQueue((queueRes.data as QueueRow[]) ?? []);
    setState((stateRes.data as Record<string, unknown>) ?? null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  const runNow = async () => {
    setRunning(true);
    setMessage(null);
    const { data, error } = await supabase.functions.invoke('astro-dispatch', { body: { action: 'run' } });
    setRunning(false);
    setMessage(error ? `Run failed: ${error.message}` : `Run finished: ${JSON.stringify((data as { summary?: unknown })?.summary ?? data)}`);
    void load();
  };

  const failures = runs.filter((r) => r.error || r.failed_count > 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/zoe-astro" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Zoe dispatch</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={runNow}
            disabled={running}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-60"
          >
            <PlayCircle className="h-4 w-4" /> {running ? 'Running…' : 'Run now'}
          </button>
        </div>
      </div>

      {/* Engine state */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="mb-2 font-medium">Engine state</div>
        {state ? (
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <span>Mode</span><span className="text-foreground">{state.shadow_mode ? 'Shadow (not publishing)' : 'Live'}</span>
            <span>Paused</span><span className="text-foreground">{state.paused ? String(state.pause_reason ?? 'yes') : 'no'}</span>
            <span>Last run</span><span className="text-foreground">{state.last_run_at ? new Date(String(state.last_run_at)).toLocaleString() : '—'}</span>
          </div>
        ) : <p className="text-muted-foreground">No state row yet.</p>}
        {message && <p className="mt-3 break-words text-muted-foreground">{message}</p>}
      </div>

      {/* Queue */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 font-medium"><Clock className="h-4 w-4" /> Your card queue</div>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : queue.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing queued yet — add your birth details to start daily cards.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {queue.map((q) => (
              <li key={q.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-2">
                {q.poster_image_url
                  ? <span className="rounded bg-muted px-2 py-0.5 text-xs">poster ✓</span>
                  : <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">no poster</span>}
                <span className="text-muted-foreground">{q.target_date} · {q.slot}</span>
                <span className="flex-1 truncate">{q.prediction_headline ?? '—'}</span>
                <span className={q.status === 'published' ? 'text-emerald-500' : 'text-muted-foreground'}>{q.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Failures */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Failed generations</div>
        {failures.length === 0 ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Nothing failing right now.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {failures.map((f) => (
              <li key={f.id} className="rounded-lg border border-destructive/40 p-2">
                <div className="text-muted-foreground">{new Date(f.started_at).toLocaleString()}</div>
                <div className="break-words">{f.error ?? `${f.failed_count} item(s) failed`}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Run history */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 font-medium">Run history</div>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {runs.map((r) => {
              const s = (r.summary ?? {}) as Record<string, number | boolean | string>;
              return (
                <li key={r.id} className="rounded-lg border border-border/60 p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">{new Date(r.started_at).toLocaleString()}</span>
                    <span>processed {String(s.processed ?? 0)}</span>
                    <span className="text-emerald-500">published {String(s.published ?? 0)}</span>
                    <span className="text-muted-foreground">skipped {String(s.skipped ?? 0)}</span>
                    {Number(s.failed ?? 0) > 0 && <span className="text-destructive">failed {String(s.failed)}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ZoeDispatchDashboardPage;
