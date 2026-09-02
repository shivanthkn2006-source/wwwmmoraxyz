/**
 * Load-test results panel: shows the persisted concurrency benchmarks for the
 * hot public edge functions so capacity headroom is visible before a launch.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Gauge, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type LoadTestRow = {
  id: string;
  target: string;
  concurrency: number;
  total_requests: number;
  succeeded: number;
  failed: number;
  p50_ms: number | null;
  p95_ms: number | null;
  p99_ms: number | null;
  max_ms: number | null;
  notes: string | null;
  ran_at: string;
};

const LoadTestPanel: React.FC = () => {
  const [rows, setRows] = useState<LoadTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('platform_load_tests')
      .select('id, target, concurrency, total_requests, succeeded, failed, p50_ms, p95_ms, p99_ms, max_ms, notes, ran_at')
      .order('ran_at', { ascending: false })
      .limit(12);
    if (queryError) setError(queryError.message);
    else {
      setError(null);
      setRows((data ?? []) as LoadTestRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card data-testid="load-test-panel">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />
            Concurrency load tests
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Latency and error rate under simultaneous traffic.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading results…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No load tests recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Target</th>
                  <th className="py-1.5 pr-3 font-medium">Concurrency</th>
                  <th className="py-1.5 pr-3 font-medium">Success</th>
                  <th className="py-1.5 pr-3 font-medium">p50</th>
                  <th className="py-1.5 pr-3 font-medium">p95</th>
                  <th className="py-1.5 pr-3 font-medium">p99</th>
                  <th className="py-1.5 font-medium">Ran</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-1.5 pr-3 font-medium">{row.target}</td>
                    <td className="py-1.5 pr-3">{row.concurrency}</td>
                    <td className="py-1.5 pr-3">
                      {row.succeeded}/{row.total_requests}
                      {row.failed > 0 ? <span className="ml-1 text-destructive">({row.failed} failed)</span> : null}
                    </td>
                    <td className="py-1.5 pr-3">{row.p50_ms ?? '—'} ms</td>
                    <td className="py-1.5 pr-3">{row.p95_ms ?? '—'} ms</td>
                    <td className="py-1.5 pr-3">{row.p99_ms ?? '—'} ms</td>
                    <td className="py-1.5 text-muted-foreground">{new Date(row.ran_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoadTestPanel;
