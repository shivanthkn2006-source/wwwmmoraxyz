/**
 * Edge function health panel.
 *
 * Reads the persisted synthetic probe results (edge_function_probes) and lets
 * an admin re-run the sweep through the `platform-selftest` function. A probe
 * counts as healthy when the function answered 200 / 401 / 400 — all three mean
 * it booted and handled the request. 5xx, timeouts and unreachable are faults.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ProbeRow = {
  fn: string;
  status: number;
  ok: boolean;
  category: string;
  note: string | null;
  duration_ms: number | null;
  checked_at: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  ok: 'Public OK',
  auth_required: 'Auth required',
  validation: 'Validates input',
  rate_limited: 'Rate limited',
  server_error: 'Server error',
  timeout: 'Upstream timeout',
  unreachable: 'Unreachable',
};

const EdgeFunctionHealthPanel: React.FC = () => {
  const [rows, setRows] = useState<ProbeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('edge_function_probes')
      .select('fn, status, ok, category, note, duration_ms, checked_at')
      .order('checked_at', { ascending: false })
      .limit(400);

    if (queryError) {
      setError(queryError.message);
      setRows([]);
    } else {
      // Keep only the newest probe per function.
      const latest = new Map<string, ProbeRow>();
      for (const row of (data ?? []) as ProbeRow[]) {
        if (!latest.has(row.fn)) latest.set(row.fn, row);
      }
      setRows([...latest.values()].sort((a, b) => a.fn.localeCompare(b.fn)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runSelfTest = useCallback(async () => {
    if (rows.length === 0) return;
    setRunning(true);
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError('Sign in again to run the self-test.');
      setRunning(false);
      return;
    }
    const { error: invokeError } = await supabase.functions.invoke('platform-selftest', {
      body: { functions: rows.map((r) => r.fn) },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (invokeError) setError(invokeError.message);
    await load();
    setRunning(false);
  }, [rows, load]);

  const summary = useMemo(() => {
    const failing = rows.filter((r) => !r.ok);
    const byCategory = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + 1;
      return acc;
    }, {});
    return { total: rows.length, failing, byCategory, checkedAt: rows[0]?.checked_at };
  }, [rows]);

  return (
    <Card data-testid="edge-health-panel">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            Edge function health
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.total} functions probed
            {summary.checkedAt ? ` · last run ${new Date(summary.checkedAt).toLocaleString()}` : ''}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void runSelfTest()} disabled={running || loading}>
          {running ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          )}
          Run self-test
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading probe results…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : summary.total === 0 ? (
          <p className="text-sm text-muted-foreground">No probe results recorded yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.byCategory).map(([category, count]) => (
                <span
                  key={category}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {CATEGORY_LABEL[category] ?? category}: {count}
                </span>
              ))}
            </div>

            <div className="mt-4">
              {summary.failing.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  All probed functions responded correctly.
                </p>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
                    {summary.failing.length} need attention
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {summary.failing.map((row) => (
                      <li key={row.fn} className="rounded-md border border-border px-3 py-2 text-xs">
                        <span className="font-medium text-foreground">{row.fn}</span>
                        <span className="ml-2 text-muted-foreground">
                          {row.status} · {CATEGORY_LABEL[row.category] ?? row.category}
                        </span>
                        {row.note ? (
                          <p className="mt-1 line-clamp-2 text-muted-foreground">{row.note}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EdgeFunctionHealthPanel;
