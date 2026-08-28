/**
 * DAILY GROWTH DELIVERY REPORT (admin)
 *
 * One screen for "who did not get their insights, and why":
 *  - `preferences_missing` events: signed-in members with no Growth preferences
 *    row, which silently blocks every future delivery for that account.
 *  - Reconciliation and catch-up audit entries with timestamps and job ids.
 *  - Worker runs for the same period, with failure reasons and one-click
 *    linking from an audit row to its dispatch run.
 *
 * Access is enforced by row-level security — non-admins simply see no rows.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Download, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AuditRow {
  id: string;
  user_id: string | null;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface RunRow {
  id: string;
  run_id: string;
  action: string;
  started_at: string;
  processed: number;
  written: number;
  skipped: number;
  catchups: number;
  paused: boolean;
  parked: boolean;
  errors: string[] | null;
}

const ACTION_FILTERS = [
  { key: 'all', label: 'All events' },
  { key: 'preferences_missing', label: 'Missing preferences' },
  { key: 'engine_repaired', label: 'Repairs' },
  { key: 'diagnostics_run', label: 'Diagnostics' },
  { key: 'onboarding_dismissed', label: 'Onboarding dismissed' },
] as const;

const DAY_MS = 86_400_000;

function download(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: AuditRow[]): string {
  const head = ['created_at', 'action', 'user_id', 'actor_id', 'details'];
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    head.join(','),
    ...rows.map((r) => [r.created_at, r.action, r.user_id, r.actor_id, JSON.stringify(r.details ?? {})].map(escape).join(',')),
  ].join('\n');
}

export default function AdminGrowthDeliveryPage() {
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [action, setAction] = useState<string>('all');
  const [days, setDays] = useState(7);
  const [userQuery, setUserQuery] = useState('');

  const since = useMemo(() => new Date(Date.now() - days * DAY_MS).toISOString(), [days]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let auditQuery = supabase
        .from('growth_audit_log')
        .select('id, user_id, actor_id, action, details, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200);
      if (action !== 'all') auditQuery = auditQuery.eq('action', action);

      const [auditRes, runRes] = await Promise.all([
        auditQuery,
        supabase
          .from('growth_dispatch_runs')
          .select('id, run_id, action, started_at, processed, written, skipped, catchups, paused, parked, errors')
          .gte('started_at', since)
          .order('started_at', { ascending: false })
          .limit(100),
      ]);
      if (auditRes.error) throw auditRes.error;
      setAudit((auditRes.data as AuditRow[] | null) ?? []);
      setRuns((runRes.data as RunRow[] | null) ?? []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [since, action]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return audit;
    return audit.filter((r) => (r.user_id ?? '').toLowerCase().includes(q) || (r.actor_id ?? '').toLowerCase().includes(q));
  }, [audit, userQuery]);

  const affectedUsers = useMemo(
    () => new Set(filtered.filter((r) => r.action === 'preferences_missing').map((r) => r.user_id)).size,
    [filtered],
  );
  const failures = useMemo(() => runs.filter((r) => r.errors?.length || r.paused || r.parked), [runs]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Daily Growth Delivery Report | Admin</title>
        <meta name="description" content="Admin report of Growth Engine delivery gaps, missing preferences, reconciliation events and worker failures." />
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-6 flex items-center gap-3">
          <Link to="/admin/growth-runs" aria-label="Back to growth worker status" className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
              Daily growth delivery report
            </h1>
            <p className="text-xs text-muted-foreground">Missing preferences, reconciliation events and worker failures.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {ACTION_FILTERS.map((f) => (
            <Button key={f.key} size="sm" variant={action === f.key ? 'default' : 'outline'} onClick={() => setAction(f.key)}>
              {f.label}
            </Button>
          ))}
          {[1, 7, 30].map((d) => (
            <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'} onClick={() => setDays(d)}>
              {d}d
            </Button>
          ))}
          <Input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Filter by user id"
            className="h-8 w-44 text-xs"
            aria-label="Filter by user id"
          />
          <Button size="sm" variant="outline" onClick={() => download(`growth-delivery-${Date.now()}.csv`, 'text/csv', toCsv(filtered))}>
            <Download className="mr-1 h-3.5 w-3.5" /> CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => download(`growth-delivery-${Date.now()}.json`, 'application/json', JSON.stringify({ since, action, events: filtered, runs }, null, 2))}
          >
            <Download className="mr-1 h-3.5 w-3.5" /> JSON
          </Button>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <p>Events: <span className="font-medium text-foreground">{filtered.length}</span></p>
            <p>Members missing preferences: <span className="font-medium text-foreground">{affectedUsers}</span></p>
            <p>Worker runs: <span className="font-medium text-foreground">{runs.length}</span></p>
            <p>Runs with failures: <span className="font-medium text-foreground">{failures.length}</span></p>
          </CardContent>
        </Card>

        {loading && <p className="text-sm text-muted-foreground">Loading delivery report…</p>}

        {!loading && failed && (
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Could not load the delivery report.</p>
            <Button className="mt-3" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        )}

        {!loading && !failed && filtered.length === 0 && (
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No delivery events for this period. This page is restricted to administrators.</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((row) => {
            const jobId = String((row.details as Record<string, unknown> | null)?.run_id ?? (row.details as Record<string, unknown> | null)?.job_id ?? '');
            return (
              <div key={row.id} className="rounded-lg border border-border p-3 text-xs">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium">{row.action}</span>
                  <span className="text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
                </div>
                <p className="text-muted-foreground">member {row.user_id ?? '—'}</p>
                {jobId && (
                  <Link className="text-primary underline" to={`/admin/growth-runs#${jobId}`}>run {jobId}</Link>
                )}
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-[10px] text-muted-foreground">
                  {JSON.stringify(row.details ?? {}, null, 0)}
                </pre>
              </div>
            );
          })}
        </div>

        {failures.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold">Worker failures</h2>
            <div className="space-y-2">
              {failures.map((run) => (
                <div key={run.id} className="rounded-lg border border-destructive/40 p-3 text-xs">
                  <p className="font-medium">{new Date(run.started_at).toLocaleString()} · {run.action}</p>
                  <p className="text-muted-foreground">
                    processed {run.processed} · written {run.written} · catch-up {run.catchups}
                    {run.paused ? ' · PAUSED' : ''}{run.parked ? ' · PARKED' : ''}
                  </p>
                  {run.errors?.length ? <p className="mt-1 text-destructive">{run.errors.join(' | ')}</p> : null}
                  <p className="mt-1 text-[10px] text-muted-foreground">run {run.run_id}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
