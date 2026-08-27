import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, PlayCircle, AlertTriangle, Clock, CheckCircle2, ShieldCheck, Download, GitCompare, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { deviceTimeZone, localClock, localDateKey, currentSlot } from '@/lib/astroSlot';
import { newCorrelationId, setActiveCorrelationId } from '@/lib/astroCorrelation';
import {
  flattenAudit, diffAuditRuns, type AuditMember, type AuditRunRow, type FlatAuditRow,
} from '@/lib/astroAuditDiff';

interface AuditResult {
  correlation_id?: string;
  audit_run_id?: string;
  summary: { at: string; members: number; missing_morning: number; members_with_gaps: number; correlation_id?: string };
  members: AuditMember[];
}

const downloadFile = (name: string, mime: string, body: string) => {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const toCsv = (rows: Array<Record<string, unknown>>) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((r) => headers.map((h) => cell(r[h])).join(','))].join('\n');
};



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
  const [auditing, setAuditing] = useState(false);
  const [auditRuns, setAuditRuns] = useState<AuditRunRow[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>('');
  const [showDiff, setShowDiff] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [runRes, queueRes, stateRes, auditRes] = await Promise.all([
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
      (supabase.from('astro_audit_runs' as never) as never as {
        select: (s: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: AuditRunRow[] | null }> } };
      }).select('*').order('created_at', { ascending: false }).limit(30),
    ]);
    setRuns((runRes.data as RunRow[]) ?? []);
    setQueue((queueRes.data as QueueRow[]) ?? []);
    setState((stateRes.data as Record<string, unknown>) ?? null);
    const history = (auditRes.data as AuditRunRow[]) ?? [];
    setAuditRuns(history);
    // The latest stored report is the dashboard default.
    setSelectedAuditId((prev) => (prev && history.some((h) => h.audit_run_id === prev) ? prev : history[0]?.audit_run_id ?? ''));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  const selectedIndex = auditRuns.findIndex((r) => r.audit_run_id === selectedAuditId);
  const audit = selectedIndex >= 0 ? auditRuns[selectedIndex] : null;
  const previousAudit = selectedIndex >= 0 ? auditRuns[selectedIndex + 1] ?? null : null;

  const currentRows: FlatAuditRow[] = useMemo(
    () => (audit ? flattenAudit(audit.members ?? [], { correlation_id: audit.correlation_id, audit_run_id: audit.audit_run_id }) : []),
    [audit],
  );
  const previousRows: FlatAuditRow[] = useMemo(
    () => (previousAudit ? flattenAudit(previousAudit.members ?? [], { correlation_id: previousAudit.correlation_id, audit_run_id: previousAudit.audit_run_id }) : []),
    [previousAudit],
  );
  const diff = useMemo(() => diffAuditRuns(currentRows, previousRows), [currentRows, previousRows]);

  const runNow = async () => {
    setRunning(true);
    setMessage(null);
    const correlationId = newCorrelationId('run');
    const { data, error } = await supabase.functions.invoke('astro-dispatch', { body: { action: 'run', correlationId } });
    setRunning(false);
    setMessage(error ? `Run failed: ${error.message}` : `Run finished: ${JSON.stringify((data as { summary?: unknown })?.summary ?? data)}`);
    void load();
  };

  const runAudit = async () => {
    setAuditing(true);
    // One id for the whole audit: the server stamps every log line with it and
    // client reads made while it is active are tagged the same way.
    const correlationId = newCorrelationId('audit');
    setActiveCorrelationId(correlationId);
    const { data, error } = await supabase.functions.invoke('astro-dispatch', {
      body: { action: 'audit', correlationId, source: 'manual' },
    });
    setActiveCorrelationId(null);
    setAuditing(false);
    if (error) { setMessage(`Audit failed: ${error.message}`); return; }
    const result = data as AuditResult;
    setMessage(`Audit ${result.audit_run_id ?? ''} finished · ${result.summary?.missing_morning ?? 0} missing morning`);
    await load();
    if (result.audit_run_id) setSelectedAuditId(result.audit_run_id);
  };

  const exportAudit = (format: 'json' | 'csv') => {
    if (!audit) return;
    const stamp = new Date(audit.created_at).toISOString().replace(/[:.]/g, '-');
    if (format === 'json') {
      downloadFile(
        `astro-audit-${stamp}.json`,
        'application/json',
        JSON.stringify({ audit_run_id: audit.audit_run_id, correlation_id: audit.correlation_id, summary: audit.summary, rows: currentRows }, null, 2),
      );
    } else {
      downloadFile(`astro-audit-${stamp}.csv`, 'text/csv', toCsv(currentRows));
    }
  };

  const failures = runs.filter((r) => r.error || r.failed_count > 0);
  const tz = deviceTimeZone();




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
          <button
            onClick={runAudit}
            disabled={auditing}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" /> {auditing ? 'Auditing…' : 'Audit slots'}
          </button>
        </div>
      </div>

      {/* This device's resolution — compare against your phone's clock. */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="mb-2 font-medium">This device</div>
        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
          <span>Timezone</span><span className="text-foreground">{tz}</span>
          <span>Local time</span><span className="text-foreground">{localClock()}</span>
          <span>Target date</span><span className="text-foreground">{localDateKey()}</span>
          <span>Computed slot</span><span className="text-foreground">{currentSlot()}</span>
        </div>
      </div>

      {/* Slot audit across all members — defaults to the latest stored report */}
      {audit && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4" /> Slot audit
            <select
              value={selectedAuditId}
              onChange={(e) => setSelectedAuditId(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-normal"
              aria-label="Audit run"
            >
              {auditRuns.map((r, i) => (
                <option key={r.audit_run_id} value={r.audit_run_id}>
                  {i === 0 ? 'Latest · ' : ''}{new Date(r.created_at).toLocaleString()} · {r.source} · {r.missing_morning} missing
                </option>
              ))}
            </select>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setShowDiff((v) => !v)}
                disabled={!previousAudit}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-normal disabled:opacity-50"
              >
                <GitCompare className="h-3.5 w-3.5" /> {showDiff ? 'Hide diff' : 'Audit diff'}
              </button>
              <button
                onClick={() => exportAudit('json')}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-normal"
              >
                <Download className="h-3.5 w-3.5" /> JSON
              </button>
              <button
                onClick={() => exportAudit('csv')}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-normal"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>
          </div>
          <p className="mb-2 break-all font-mono text-[11px] text-muted-foreground">
            run: {audit.audit_run_id} · correlation: {audit.correlation_id}
          </p>
          {audit.missing_morning > 0 && (
            <p className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-destructive">
              Alert raised: {audit.missing_morning} member(s) with no morning prompt —{' '}
              {(audit.members ?? []).filter((m) => m.missing_morning).map((m) => `${m.user_id.slice(0, 8)} (${m.target_date})`).join(', ')}
              {audit.notifications && (
                <span className="mt-1 block text-xs">
                  slack: {(audit.notifications as { slack?: { sent?: boolean; error?: string } }).slack?.sent ? 'sent' : (audit.notifications as { slack?: { error?: string } }).slack?.error ?? 'not sent'}
                  {' · '}
                  email: {(audit.notifications as { email?: { sent?: boolean; error?: string } }).email?.sent ? 'sent' : (audit.notifications as { email?: { error?: string } }).email?.error ?? 'not sent'}
                </span>
              )}
            </p>
          )}
          <p className="mb-3 text-muted-foreground">
            {audit.members_count} member(s) · {audit.missing_morning} missing morning ·{' '}
            {audit.members_with_gaps} with gaps · {new Date(audit.created_at).toLocaleString()} · {audit.source}
          </p>

          {/* Diff against the previous run */}
          {showDiff && previousAudit && (
            <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <GitCompare className="h-3.5 w-3.5" /> Changes vs {new Date(previousAudit.created_at).toLocaleString()}
              </div>
              {diff.length === 0 ? (
                <p className="text-muted-foreground">No member changed between these two runs.</p>
              ) : (
                <ul className="space-y-2">
                  {diff.map((d) => (
                    <li key={`${d.kind}_${d.key}`} className="rounded-lg border border-border/60 bg-background p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[11px] ${d.kind === 'added' ? 'bg-emerald-500/15 text-emerald-500' : d.kind === 'removed' ? 'bg-muted text-muted-foreground' : 'bg-amber-500/15 text-amber-500'}`}>
                          {d.kind}
                        </span>
                        <span className="font-mono text-xs">{d.user_id.slice(0, 8)}</span>
                        <span className="text-muted-foreground">{d.local_date}</span>
                      </div>
                      {Object.entries(d.changes).map(([field, [before, after]]) => (
                        <div key={field} className="mt-1 font-mono text-[11px]">
                          <span className="text-muted-foreground">{field}: </span>
                          <span className="text-destructive line-through">{before || '—'}</span>
                          <span className="text-muted-foreground"> → </span>
                          <span className="text-emerald-500">{after || '—'}</span>
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <ul className="space-y-2">
            {(audit.members ?? []).map((m) => (
              <li
                key={`${m.user_id}_${m.target_date}`}
                className={`rounded-lg border p-2 ${m.missing_morning ? 'border-destructive/50' : 'border-border/60'}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <span className="font-mono text-xs">{m.user_id.slice(0, 8)}</span>
                  <span>{m.timezone}</span>
                  <span>{m.local_time}</span>
                  <span>{m.target_date}</span>
                  <span className="text-foreground">slot: {m.current_slot ?? '—'}</span>
                  <Link
                    to={`/zoe-astro/trace/${encodeURIComponent(audit.correlation_id)}?user=${encodeURIComponent(m.user_id)}`}
                    className="ml-auto inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] hover:text-foreground"
                  >
                    <Radio className="h-3 w-3" /> Trace
                  </Link>
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span>expected: {m.expected_slots.join(', ') || '—'}</span>
                  <span className="text-emerald-500">present: {m.present_slots.join(', ') || '—'}</span>
                  {m.missing_slots.length > 0 && (
                    <span className="text-destructive">missing: {m.missing_slots.join(', ')}</span>
                  )}
                  {m.missing_morning && <span className="text-destructive font-medium">no morning prompt</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}



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
