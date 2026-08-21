/** Admin-only view of Zoe universal search indexing: counts, failures, backfill progress. */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSearchIndexHealth, runIndexerBatch } from '@/hooks/useSearchIndexHealth';

export default function AdminSearchIndexPage() {
  const { stats, failures, loading, refresh } = useSearchIndexHealth();
  const [running, setRunning] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [log, setLog] = React.useState<string[]>([]);
  const cancelRef = React.useRef(false);

  const startBackfill = React.useCallback(async () => {
    if (running) return;
    cancelRef.current = false;
    setRunning(true);
    setLog([]);
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    try {
      let first = true;
      for (let batch = 0; batch < 200 && !cancelRef.current; batch += 1) {
        const result = await runIndexerBatch({ backfill: first, limit: 10 });
        first = false;
        setLog((prev) => [
          `batch ${batch + 1}: processed ${result.processed} · indexed ${result.completed} · failed ${result.failed}`,
          ...prev,
        ].slice(0, 40));
        await refresh();
        if (result.processed === 0) break;
      }
    } catch (error: any) {
      setLog((prev) => [`error: ${error?.message || 'backfill failed'}`, ...prev]);
    } finally {
      window.clearInterval(timer);
      setRunning(false);
    }
  }, [running, refresh]);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Search index</h1>
        <p className="text-sm text-muted-foreground">
          Backfill and monitor the Zoe universal search index.
        </p>
      </header>

      <Card className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        {[
          ['Indexed', stats?.indexed ?? 0],
          ['Pending', stats?.pending ?? 0],
          ['Processing', stats?.processing ?? 0],
          ['Failed', stats?.failed ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-semibold tabular-nums">{loading ? '—' : String(value)}</div>
          </div>
        ))}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={startBackfill} disabled={running}>
          {running ? `Backfilling… ${elapsed}s` : 'Run full backfill'}
        </Button>
        <Button variant="outline" onClick={() => { cancelRef.current = true; }} disabled={!running}>
          Stop
        </Button>
        <Button variant="ghost" onClick={() => void refresh()} disabled={running}>Refresh</Button>
        <span className="text-xs text-muted-foreground">
          Newest entry: {stats?.newestIndexedAt ? new Date(stats.newestIndexedAt).toLocaleString() : '—'}
        </span>
      </div>

      {log.length > 0 && (
        <Card className="space-y-1 p-3 font-mono text-xs text-muted-foreground">
          {log.map((line, index) => <div key={index}>{line}</div>)}
        </Card>
      )}

      <Card className="p-3">
        <h2 className="mb-2 text-sm font-medium">Recent failures</h2>
        {failures.length === 0 ? (
          <p className="text-xs text-muted-foreground">No failed indexing jobs.</p>
        ) : (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {failures.map((failure) => (
              <li key={failure.id} className="truncate">
                {failure.entity_type} · {failure.entity_id.slice(0, 8)} · attempts {failure.attempts} · {failure.last_error}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
