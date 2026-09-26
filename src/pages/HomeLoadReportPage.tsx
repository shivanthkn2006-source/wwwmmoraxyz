import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { HOME_SECTIONS } from '@/lib/homeLoadReport';
import { useIsAdmin } from '@/hooks/useIsAdmin';

interface Row {
  id: string;
  user_id: string;
  created_at: string;
  device: string | null;
  browser: string | null;
  viewport: string | null;
  connection: string | null;
  interactive_ms: number | null;
  sections: Record<string, boolean>;
  failures: { kind: string; label: string; status?: string | number; at: number }[];
  failure_count: number;
}

const HomeLoadReportPage = () => {
  const isAdmin = useIsAdmin();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error: err } = await supabase
        .from('home_load_reports' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (err) setError(err.message);
      else setRows((data ?? []) as unknown as Row[]);
    })();
  }, []);

  const summary = useMemo(() => {
    if (!rows?.length) return null;
    const missing: Record<string, number> = {};
    const failing: Record<string, number> = {};
    for (const r of rows) {
      for (const name of Object.keys(HOME_SECTIONS)) if (r.sections?.[name] === false) missing[name] = (missing[name] ?? 0) + 1;
      for (const f of r.failures ?? []) failing[f.label] = (failing[f.label] ?? 0) + 1;
    }
    const times = rows.map((r) => r.interactive_ms).filter((n): n is number => typeof n === 'number').sort((a, b) => a - b);
    return {
      visits: rows.length,
      members: new Set(rows.map((r) => r.user_id)).size,
      withFailures: rows.filter((r) => r.failure_count > 0).length,
      median: times.length ? times[Math.floor(times.length / 2)] : null,
      missing: Object.entries(missing).sort((a, b) => b[1] - a[1]),
      failing: Object.entries(failing).sort((a, b) => b[1] - a[1]).slice(0, 15),
    };
  }, [rows]);

  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Home loading report</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'All members' : 'Your visits'} · last 200 Home visits, checked 12 seconds after Home opens.
            </p>
          </div>
          <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground">Back to Home</Link>
        </header>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!rows && !error && <p className="text-sm text-muted-foreground">Loading…</p>}
        {rows && rows.length === 0 && <p className="text-sm text-muted-foreground">No Home visits recorded yet.</p>}

        {summary && (
          <section className="grid gap-3 sm:grid-cols-4">
            {[
              ['Visits', summary.visits],
              ['Members', summary.members],
              ['Visits with failures', summary.withFailures],
              ['Median time to usable', summary.median != null ? `${(summary.median / 1000).toFixed(1)}s` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-lg font-semibold">{value}</div>
              </div>
            ))}
          </section>
        )}

        {summary && (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border p-3">
              <h2 className="mb-2 text-sm font-semibold">Missing Home parts</h2>
              {summary.missing.length === 0 ? <p className="text-xs text-muted-foreground">Every part appeared.</p> : (
                <ul className="space-y-1 text-xs">{summary.missing.map(([n, c]) => <li key={n} className="flex justify-between"><span>{n}</span><span className="font-mono">{c} of {summary.visits}</span></li>)}</ul>
              )}
            </div>
            <div className="rounded-xl border border-border p-3">
              <h2 className="mb-2 text-sm font-semibold">Most frequent failures</h2>
              {summary.failing.length === 0 ? <p className="text-xs text-muted-foreground">No failures recorded.</p> : (
                <ul className="space-y-1 text-xs">{summary.failing.map(([n, c]) => <li key={n} className="flex justify-between gap-2"><span className="truncate font-mono">{n}</span><span className="font-mono">{c}×</span></li>)}</ul>
              )}
            </div>
          </section>
        )}

        {rows && rows.length > 0 && (
          <section className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr><th className="p-2">When</th><th className="p-2">Member</th><th className="p-2">Device</th><th className="p-2">Network</th><th className="p-2">Usable</th><th className="p-2">Missing</th><th className="p-2">Failures</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const missing = Object.entries(r.sections ?? {}).filter(([, ok]) => !ok).map(([n]) => n);
                  return (
                    <>
                      <tr key={r.id} className="cursor-pointer border-t border-border/50 hover:bg-muted/40" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                        <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="p-2 font-mono">{r.user_id.slice(0, 8)}</td>
                        <td className="p-2">{r.device} · {r.browser} · {r.viewport}</td>
                        <td className="p-2">{r.connection ?? '—'}</td>
                        <td className="p-2 font-mono">{r.interactive_ms != null ? `${(r.interactive_ms / 1000).toFixed(1)}s` : '—'}</td>
                        <td className="p-2">{missing.length ? missing.join(', ') : 'none'}</td>
                        <td className="p-2 font-mono">{r.failure_count}</td>
                      </tr>
                      {openId === r.id && (
                        <tr key={`${r.id}-d`} className="bg-muted/30">
                          <td colSpan={7} className="p-2">
                            {r.failures.length === 0 ? 'No failures.' : (
                              <ul className="space-y-1">{r.failures.map((f, i) => <li key={i} className="font-mono">{(f.at / 1000).toFixed(1)}s · {f.kind} · {f.label} {f.status != null ? `(${f.status})` : ''}</li>)}</ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
};

export default HomeLoadReportPage;
