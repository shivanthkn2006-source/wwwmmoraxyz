import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { astroTraces, type AstroTrace } from '@/lib/astroLog';
import type { AuditRunRow, AuditMember } from '@/lib/astroAuditDiff';

interface ErrorEvent {
  id: string;
  created_at: string;
  error_type: string;
  severity: string;
  source: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * One correlation id, every side of the story: the client reads recorded in
 * this tab, the stored audit run, and the server alerts raised for the run.
 */
const ZoeAuditTracePage: React.FC = () => {
  const { correlationId = '' } = useParams();
  const [params] = useSearchParams();
  const focusUser = params.get('user') ?? '';
  const [run, setRun] = useState<AuditRunRow | null>(null);
  const [events, setEvents] = useState<ErrorEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const clientTraces: AstroTrace[] = useMemo(
    () => astroTraces().filter((t) => t.correlation_id === correlationId),
    [correlationId],
  );

  const load = useCallback(async () => {
    if (!correlationId) return;
    setLoading(true);
    const [runRes, evRes] = await Promise.all([
      (supabase.from('astro_audit_runs' as never) as never as {
        select: (s: string) => { eq: (c: string, v: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: AuditRunRow[] | null }> } } };
      }).select('*').eq('correlation_id', correlationId).order('created_at', { ascending: false }).limit(1),
      supabase
        .from('platform_error_events')
        .select('id, created_at, error_type, severity, source, message, metadata')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    setRun((runRes.data as AuditRunRow[])?.[0] ?? null);
    setEvents(
      ((evRes.data as ErrorEvent[]) ?? []).filter(
        (e) => JSON.stringify(e.metadata ?? {}).includes(correlationId),
      ),
    );
    setLoading(false);
  }, [correlationId]);

  useEffect(() => { void load(); }, [load]);

  const members: AuditMember[] = (run?.members ?? []).filter(
    (m) => !focusUser || m.user_id === focusUser,
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/zoe-astro/dispatch" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Correlation trace</h1>
        <button onClick={() => void load()} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="mb-2 flex items-center gap-2 font-medium"><Radio className="h-4 w-4" /> Trace key</div>
        <p className="break-all font-mono text-xs text-muted-foreground">{correlationId}</p>
        {focusUser && <p className="mt-1 break-all font-mono text-xs text-muted-foreground">member: {focusUser}</p>}
      </div>

      {/* Server: the stored audit run */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="mb-3 font-medium">Server · audit run</div>
        {loading ? <p className="text-muted-foreground">Loading…</p> : !run ? (
          <p className="text-muted-foreground">No stored audit run for this correlation id.</p>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2 text-muted-foreground">
              <span>Run id</span><span className="break-all font-mono text-xs text-foreground">{run.audit_run_id}</span>
              <span>Source</span><span className="text-foreground">{run.source}</span>
              <span>At</span><span className="text-foreground">{new Date(run.created_at).toLocaleString()}</span>
              <span>Members</span><span className="text-foreground">{run.members_count}</span>
              <span>Missing morning</span><span className="text-foreground">{run.missing_morning}</span>
            </div>
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={`${m.user_id}_${m.target_date}`} className="rounded-lg border border-border/60 p-2">
                  <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                    <span className="font-mono text-xs">{m.user_id.slice(0, 8)}</span>
                    <span>{m.timezone}</span>
                    <span>{m.local_time}</span>
                    <span>{m.target_date}</span>
                    <span className="text-foreground">slot: {m.current_slot ?? '—'}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span>expected: {m.expected_slots.join(', ') || '—'}</span>
                    <span className="text-emerald-500">present: {m.present_slots.join(', ') || '—'}</span>
                    {m.missing_slots.length > 0 && <span className="text-destructive">missing: {m.missing_slots.join(', ')}</span>}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                    rows: {(m.rows ?? []).map((r) => `${r.slot}:${r.id.slice(0, 8)}(${r.status})`).join(' · ') || '—'}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Server: alerts */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="mb-3 font-medium">Server · alerts</div>
        {events.length === 0 ? (
          <p className="text-muted-foreground">No alerts recorded for this trace.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-lg border border-destructive/40 p-2">
                <div className="text-muted-foreground">{new Date(e.created_at).toLocaleString()} · {e.severity} · {e.source}</div>
                <div className="break-words">{e.message}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Client traces from this session */}
      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <div className="mb-3 font-medium">Client · reads in this tab</div>
        {clientTraces.length === 0 ? (
          <p className="text-muted-foreground">No client reads recorded in this tab for this trace.</p>
        ) : (
          <ul className="space-y-2">
            {clientTraces.map((t, i) => (
              <li key={i} className="rounded-lg border border-border/60 p-2 font-mono text-[11px]">
                {t.at} · {t.source} · {t.timezone} · {t.local_time} · {t.target_date} · {t.computed_slot}
                {t.selected_row_id ? ` · row ${t.selected_row_id.slice(0, 8)}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ZoeAuditTracePage;
