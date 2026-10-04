import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Feature { feature: string; kinds: string[]; source: string; sent24h: number; sent7d: number; failed7d: number; lastError: string | null }
interface Channel { channel: string; ok: number; failed: number; lastError: string | null }
interface Health { features: Feature[]; channels: Channel[]; onlineNow: number; members: number; pushDevices: number; unread: number }
interface TestRow { kind: string; feature: string; label: string; pass: boolean }

/** Admin-only notification wiring/delivery overview with an end-to-end test. */
export default function NotificationHealthPanel() {
  const [data, setData] = useState<Health | null>(null);
  const [test, setTest] = useState<TestRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: d, error: e } = await supabase.functions.invoke('admin-notification-health', { body: {} });
    if (e || d?.error) { setError(d?.error || 'Could not load notification health.'); return; }
    setError(null); setData(d as Health);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const runTest = async () => {
    setBusy(true);
    const { data: d, error: e } = await supabase.functions.invoke('admin-notification-health', { body: { action: 'test' } });
    setBusy(false);
    if (e || !d?.results) { setError(d?.error || 'Test could not run.'); return; }
    setTest(d.results as TestRow[]);
  };

  const passed = test?.filter((t) => t.pass).length ?? 0;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Notification health</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => void load()}>Refresh</Button>
          <Button size="sm" variant="ghost" onClick={() => void runTest()} disabled={busy}>{busy ? 'Testing…' : 'Run end-to-end test'}</Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <div><div className="text-muted-foreground text-xs">Online now</div><div className="text-lg font-semibold">{data.onlineNow}</div></div>
          <div><div className="text-muted-foreground text-xs">Offline</div><div className="text-lg font-semibold">{Math.max(0, data.members - data.onlineNow)}</div></div>
          <div><div className="text-muted-foreground text-xs">Push devices</div><div className="text-lg font-semibold">{data.pushDevices}</div></div>
          <div><div className="text-muted-foreground text-xs">Unread alerts</div><div className="text-lg font-semibold">{data.unread}</div></div>
        </div>
      )}
      {test && (
        <div className="text-sm">
          <p className="font-medium">End-to-end: {passed} of {test.length} alert kinds working</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {test.map((t) => <Badge key={t.kind} variant={t.pass ? 'secondary' : 'destructive'}>{t.label}{t.pass ? ' ✓' : ' ✗'}</Badge>)}
          </div>
        </div>
      )}
      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground text-left"><tr><th className="py-1 pr-2">Feature</th><th className="pr-2">Sent by</th><th className="pr-2">24h</th><th className="pr-2">7d</th><th className="pr-2">Failed 7d</th><th>Status</th></tr></thead>
            <tbody>
              {data.features.map((f) => (
                <tr key={f.feature} className="border-t border-border/40 align-top">
                  <td className="py-1.5 pr-2 capitalize">{f.feature}</td>
                  <td className="pr-2 text-muted-foreground">{f.source}</td>
                  <td className="pr-2 tabular-nums">{f.sent24h}</td>
                  <td className="pr-2 tabular-nums">{f.sent7d}</td>
                  <td className="pr-2 tabular-nums">{f.failed7d}</td>
                  <td>{f.failed7d > 0 ? <span className="text-destructive">{f.lastError}</span> : f.sent7d > 0 ? 'Working' : 'Wired, no activity'}</td>
                </tr>
              ))}
              {data.channels.map((c) => (
                <tr key={c.channel} className="border-t border-border/40">
                  <td className="py-1.5 pr-2 capitalize">{c.channel} delivery</td><td className="pr-2 text-muted-foreground">outbound</td>
                  <td className="pr-2">—</td><td className="pr-2 tabular-nums">{c.ok}</td><td className="pr-2 tabular-nums">{c.failed}</td>
                  <td>{c.failed > 0 ? <span className="text-destructive">{c.lastError}</span> : 'Working'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
