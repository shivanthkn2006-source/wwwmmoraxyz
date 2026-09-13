import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, GitCompare, RefreshCw, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  flattenAudit, diffAuditRuns, selectedRow,
  type AuditRunRow, type AuditMember,
} from '@/lib/astroAuditDiff';

/**
 * ONE AUDIT RUN, BY CORRELATION ID.
 *
 * Opened from the dispatch dashboard (or pasted from a log line). Shows the
 * stored run for that correlation id, diffs it against the run recorded just
 * before it, and lets an operator trace any member from here.
 */
const ZoeAstroAuditPage: React.FC = () => {
  const { correlationId = '' } = useParams();
  const [run, setRun] = useState<AuditRunRow | null>(null);
  const [previous, setPrevious] = useState<AuditRunRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDiff, setShowDiff] = useState(true);

  const load = useCallback(async () => {
    if (!correlationId) return;
    setLoading(true);
    const table = () =>
      supabase.from('astro_audit_runs' as never) as unknown as {
        select: (s: string) => {
          eq: (c: string, v: string) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: AuditRunRow[] | null }>;
            };
          };
          lt: (c: string, v: string) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: AuditRunRow[] | null }>;
            };
          };
        };
      };

    const { data } = await table()
      .select('*')
      .eq('correlation_id', correlationId)
      .order('created_at', { ascending: false })
      .limit(1);
    const current = (data ?? [])[0] ?? null;
    setRun(current);

    if (current) {
      const { data: prev } = await table()
        .select('*')
        .lt('created_at', current.created_at)
        .order('created_at', { ascending: false })
        .limit(1);
      setPrevious((prev ?? [])[0] ?? null);
    } else {
      setPrevious(null);
    }
    setLoading(false);
  }, [correlationId]);

  useEffect(() => { void load(); }, [load]);

  const currentRows = useMemo(
    () => (run ? flattenAudit(run.members ?? [], { correlation_id: run.correlation_id, audit_run_id: run.audit_run_id }) : []),
    [run],
  );
  const previousRows = useMemo(
    () => (previous ? flattenAudit(previous.members ?? [], { correlation_id: previous.correlation_id, audit_run_id: previous.audit_run_id }) : []),
    [previous],
  );
  const diff = useMemo(() => diffAuditRuns(currentRows, previousRows), [currentRows, previousRows]);
  const members: AuditMember[] = run?.members ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/zoe-astro/dispatch" className="text-muted-foreground hover:text-foreground" aria-label="Back to dispatch">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Audit run</h1>
        <button
          onClick={() => void load()}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="mb-2 flex items-center gap-2 font-medium"><Radio className="h-4 w-4" /> Correlation</div>
        <p className="break-all font-mono text-xs text-muted-foreground">{correlationId}</p>
        {run && (
          <p className="mt-2 text-xs text-muted-foreground">
            run {run.audit_run_id} · {new Date(run.created_at).toLocaleString()} · {run.members_count} members ·{' '}
            {run.missing_morning} missing morning · {run.members_with_gaps} with gaps
          </p>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && !run && (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No audit run stored for this correlation id.
        </p>
      )}

      {run && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={() => setShowDiff((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs"
            >
              <GitCompare className="h-3.5 w-3.5" /> {showDiff ? 'Hide diff' : 'Show diff'}
            </button>
            <span className="text-xs text-muted-foreground">
              {previous ? `vs run ${previous.audit_run_id}` : 'no earlier run to compare'}
            </span>
          </div>

          {showDiff && (
            <div className="mb-6 rounded-xl border border-border bg-card p-4">
              {diff.length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes against the previous run.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {diff.map((d) => (
                    <li key={`${d.kind}-${d.key}`} className="rounded-lg border border-border/60 p-2">
                      <div className="font-mono">
                        {d.kind.toUpperCase()} · {d.user_id.slice(0, 8)} · {d.local_date}
                      </div>
                      {Object.entries(d.changes).map(([field, [before, after]]) => (
                        <div key={field} className="mt-1 text-muted-foreground">
                          {field}: <span className="font-mono">{before || '—'}</span> →{' '}
                          <span className="font-mono">{after || '—'}</span>
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium">Members in this run</h2>
            <ul className="space-y-2 text-xs">
              {members.map((m) => {
                const sel = selectedRow(m);
                return (
                  <li key={`${m.user_id}-${m.target_date}`} className="rounded-lg border border-border/60 p-2">
                    <div className="flex flex-wrap items-center gap-2 font-mono">
                      <span>{m.user_id.slice(0, 8)}</span>
                      <span className="text-muted-foreground">{m.target_date} · {m.local_time} · {m.timezone}</span>
                      {m.missing_morning && <span className="rounded bg-muted px-1.5 py-0.5">missing morning</span>}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      slot: {m.current_slot ?? '—'} · serving: {sel?.id?.slice(0, 8) ?? '—'} ({sel?.status ?? '—'}) ·
                      missing: {m.missing_slots.join(', ') || 'none'}
                    </div>
                    <Link
                      to={`/zoe-astro/trace/${encodeURIComponent(run.correlation_id)}?user=${encodeURIComponent(m.user_id)}`}
                      className="mt-1 inline-block underline"
                    >
                      Trace member
                    </Link>
                  </li>
                );
              })}
              {members.length === 0 && <li className="text-muted-foreground">This run recorded no members.</li>}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default ZoeAstroAuditPage;
