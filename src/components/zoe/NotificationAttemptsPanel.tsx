// Ops panel: recent Slack/email alert delivery attempts, grouped by audit run.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, RefreshCw, CheckCircle2, XCircle, Repeat } from 'lucide-react';
import {
  fetchNotificationAttempts,
  type NotificationAttempt,
} from '@/lib/data/dataAccess';

interface Props {
  /** When set, only attempts for this audit run are shown. */
  auditRunId?: string | null;
}

export const NotificationAttemptsPanel: React.FC<Props> = ({ auditRunId }) => {
  const [rows, setRows] = useState<NotificationAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeToRun, setScopeToRun] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchNotificationAttempts(
      scopeToRun && auditRunId ? auditRunId : undefined,
      120,
    );
    if (res.error) setError(res.error.message);
    else setRows(res.data);
    setLoading(false);
  }, [auditRunId, scopeToRun]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const failures = rows.filter((r) => !r.succeeded);
    const retried = rows.filter((r) => r.attempt > 1);
    return {
      total: rows.length,
      delivered: rows.filter((r) => r.succeeded).length,
      failed: failures.length,
      retried: retried.length,
    };
  }, [rows]);

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 font-medium">
          <Bell className="h-4 w-4" /> Alert delivery attempts
        </div>
        <div className="ml-auto flex items-center gap-2">
          {auditRunId && (
            <button
              type="button"
              onClick={() => setScopeToRun((v) => !v)}
              className="rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:bg-muted/40"
            >
              {scopeToRun ? 'This run only' : 'All recent runs'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Reload delivery attempts"
            className="rounded-md border border-border/60 px-2 py-1 text-xs hover:bg-muted/40 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 p-2">
          <div className="text-muted-foreground">Attempts</div>
          <div className="text-base font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <div className="text-muted-foreground">Delivered</div>
          <div className="text-base font-semibold text-primary">{stats.delivered}</div>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <div className="text-muted-foreground">Failed</div>
          <div className="text-base font-semibold text-destructive">{stats.failed}</div>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <div className="text-muted-foreground">Retries</div>
          <div className="text-base font-semibold">{stats.retried}</div>
        </div>
      </div>

      {error && (
        <p className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {!error && rows.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground">
          No alert deliveries recorded yet — nothing has needed escalating.
        </p>
      )}

      <div className="max-h-72 space-y-1 overflow-y-auto">
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[auto_5rem_1fr_auto] items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-xs"
          >
            {r.succeeded ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-label="delivered" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-destructive" aria-label="failed" />
            )}
            <span className="font-medium capitalize">{r.channel}</span>
            <span className="min-w-0 break-words text-muted-foreground">
              {r.succeeded
                ? `sent via ${r.transport ?? 'default'}`
                : (r.error ?? 'unknown error')}
              {!scopeToRun && r.audit_run_id ? ` · ${r.audit_run_id}` : ''}
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap text-muted-foreground">
              {r.attempt > 1 && <Repeat className="h-3 w-3" />}
              {r.attempt}/{r.max_attempts}
              {typeof r.duration_ms === 'number' ? ` · ${r.duration_ms}ms` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationAttemptsPanel;
