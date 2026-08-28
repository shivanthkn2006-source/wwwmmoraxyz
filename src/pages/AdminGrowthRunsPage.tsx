/**
 * GROWTH WORKER STATUS (admin)
 *
 * Traces every growth-dispatch run end to end: batch counts, catch-up
 * backfills, vault fallbacks and errors. Access is enforced by row-level
 * security — non-admins simply see no rows and a clear message.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Activity, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GrowthBackfillPanel from '@/components/growth/GrowthBackfillPanel';
import GrowthFlagAdminPanel from '@/components/growth/GrowthFlagAdminPanel';

interface RunRow {
  id: string;
  run_id: string;
  action: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  processed: number;
  written: number;
  skipped: number;
  vault: number;
  catchups: number;
  paused: boolean;
  parked: boolean;
  shadow_mode: boolean;
  errors: string[] | null;
}

interface EngineState {
  paused: boolean;
  paused_reason: string | null;
  shadow_mode: boolean;
  last_run_at: string | null;
  last_error: string | null;
  last_run_processed: number;
}

export default function AdminGrowthRunsPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [state, setState] = useState<EngineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [runRes, stateRes] = await Promise.all([
        supabase
          .from('growth_dispatch_runs')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(50),
        supabase
          .from('growth_dispatch_state')
          .select('paused, paused_reason, shadow_mode, last_run_at, last_error, last_run_processed')
          .eq('id', 'singleton')
          .maybeSingle(),
      ]);
      if (runRes.error) throw runRes.error;
      setRuns((runRes.data as RunRow[] | null) ?? []);
      setState((stateRes.data as EngineState | null) ?? null);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Growth Worker Status | Admin</title>
        <meta name="description" content="Admin trace of every growth-dispatch worker run, backfill and failure." />
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-6 flex items-center gap-3">
          <Link
            to="/"
            aria-label="Back to home feed"
            className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
              Growth worker status
            </h1>
            <p className="text-xs text-muted-foreground">Last 50 dispatch runs, newest first.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
          </Button>
        </header>

        {state && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Engine state</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <p>Mode: <span className="font-medium text-foreground">{state.shadow_mode ? 'shadow' : 'live'}</span></p>
              <p>Paused: <span className="font-medium text-foreground">{state.paused ? 'yes' : 'no'}</span></p>
              <p>Last run: <span className="font-medium text-foreground">{state.last_run_at ? new Date(state.last_run_at).toLocaleString() : '—'}</span></p>
              <p>Last batch size: <span className="font-medium text-foreground">{state.last_run_processed}</span></p>
              {state.paused_reason && <p className="col-span-2 text-destructive">{state.paused_reason}</p>}
              {state.last_error && <p className="col-span-2 text-destructive">Last error: {state.last_error}</p>}
            </CardContent>
          </Card>
        )}

        <GrowthFlagAdminPanel />
        <GrowthBackfillPanel />

        {loading && <p className="text-sm text-muted-foreground">Loading run history…</p>}

        {!loading && failed && (
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Could not load the run history.</p>
            <Button className="mt-3" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        )}

        {!loading && !failed && runs.length === 0 && (
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No runs visible. This page is restricted to administrators.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {runs.map((run) => (
            <div key={run.id} className="rounded-lg border border-border p-3 text-xs">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium">
                  {new Date(run.started_at).toLocaleString()} · {run.action}
                </span>
                <span className="text-muted-foreground">
                  {run.duration_ms != null ? `${run.duration_ms} ms` : '—'}
                </span>
              </div>
              <p className="text-muted-foreground">
                processed {run.processed} · written {run.written} · catch-up {run.catchups} ·
                {' '}vault {run.vault} · skipped {run.skipped} · {run.shadow_mode ? 'shadow' : 'live'}
                {run.paused ? ' · PAUSED' : ''}{run.parked ? ' · PARKED' : ''}
              </p>
              {run.errors?.length ? (
                <p className="mt-1 text-destructive">{run.errors.join(' | ')}</p>
              ) : null}
              <p className="mt-1 text-[10px] text-muted-foreground">run {run.run_id}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
