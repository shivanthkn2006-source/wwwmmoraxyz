import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, PlayCircle, AlertTriangle, Clock, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { deviceTimeZone, localClock, localDateKey, currentSlot } from '@/lib/astroSlot';
import { newCorrelationId, setActiveCorrelationId } from '@/lib/astroCorrelation';

interface AuditMember {
  user_id: string;
  timezone: string;
  local_time: string;
  target_date: string;
  current_slot: string | null;
  expected_slots: string[];
  present_slots: string[];
  missing_slots: string[];
  missing_morning: boolean;
  rows?: Array<{ id: string; slot: string; status: string }>;
}

interface AuditResult {
  correlation_id?: string;
  summary: { at: string; members: number; missing_morning: number; members_with_gaps: number; correlation_id?: string };
  members: AuditMember[];
}

/** One flat row per member per selected card — the shape both exports use. */
const auditRows = (audit: AuditResult) =>
  audit.members.map((m) => {
    const selected = m.rows?.find((r) => r.slot === m.current_slot) ?? m.rows?.[0] ?? null;
    return {
      correlation_id: audit.correlation_id ?? audit.summary.correlation_id ?? '',
      user_id: m.user_id,
      timezone: m.timezone,
      local_time: m.local_time,
      local_date: m.target_date,
      computed_slot: m.current_slot ?? '',
      selected_row_id: selected?.id ?? '',
      selected_row_status: selected?.status ?? '',
      expected_slots: m.expected_slots.join('|'),
      present_slots: m.present_slots.join('|'),
      missing_slots: m.missing_slots.join('|'),
      missing_morning: m.missing_morning,
    };
  });

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
  const [audit, setAudit] = useState<AuditResult | null>(null);
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
    const correlationId = newCorrelationId('run');
    const { data, error } = await supabase.functions.invoke('astro-dispatch', { body: { action: 'run', correlationId } });
    setRunning(false);
    setMessage(error ? `Run failed: ${error.message}` : `Run finished: ${JSON.stringify((data as { summary?: unknown })?.summary ?? data)}`);
    void load();
  };

  const runAudit = async () => {
    setAuditing(true);
    setAudit(null);
    // One id for the whole audit: the server stamps every log line with it and
    // client reads made while it is active are tagged the same way.
    const correlationId = newCorrelationId('audit');
    setActiveCorrelationId(correlationId);
    const { data, error } = await supabase.functions.invoke('astro-dispatch', { body: { action: 'audit', correlationId } });
    setActiveCorrelationId(null);
    setAuditing(false);
    if (error) { setMessage(`Audit failed: ${error.message}`); return; }
    setAudit({ correlation_id: correlationId, ...(data as AuditResult) });
  };

  const exportAudit = (format: 'json' | 'csv') => {
    if (!audit) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rows = auditRows(audit);
    if (format === 'json') {
      downloadFile(
        `astro-audit-${stamp}.json`,
        'application/json',
        JSON.stringify({ correlation_id: audit.correlation_id, summary: audit.summary, rows }, null, 2),
      );
    } else {
      downloadFile(`astro-audit-${stamp}.csv`, 'text/csv', toCsv(rows));
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

      {/* Slot audit across all members */}
      {audit && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
          <div className="mb-3 flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4" /> Slot audit
            <div className="ml-auto flex gap-2">
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
          {(audit.correlation_id || audit.summary.correlation_id) && (
            <p className="mb-2 font-mono text-[11px] text-muted-foreground">
              correlation: {audit.correlation_id ?? audit.summary.correlation_id}
            </p>
          )}
          {audit.summary.missing_morning > 0 && (
            <p className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-destructive">
              Alert raised: {audit.summary.missing_morning} member(s) with no morning prompt —{' '}
              {audit.members.filter((m) => m.missing_morning).map((m) => `${m.user_id.slice(0, 8)} (${m.target_date})`).join(', ')}
            </p>
          )}
          <p className="mb-3 text-muted-foreground">
            {audit.summary.members} member(s) · {audit.summary.missing_morning} missing morning ·{' '}
            {audit.summary.members_with_gaps} with gaps
          </p>
          <ul className="space-y-2">
            {audit.members.map((m) => (
              <li
                key={m.user_id}
                className={`rounded-lg border p-2 ${m.missing_morning ? 'border-destructive/50' : 'border-border/60'}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <span className="font-mono text-xs">{m.user_id.slice(0, 8)}</span>
                  <span>{m.timezone}</span>
                  <span>{m.local_time}</span>
                  <span>{m.target_date}</span>
                  <span className="text-foreground">slot: {m.current_slot ?? '—'}</span>
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
