/**
 * Admin-only realtime platform analytics: visits, pages, sources, devices,
 * hardware, time spent, IP / country / region / city, VPN, and live
 * sign-in / sign-out events. Reads are blocked for everyone but the sole admin.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Radio, LogIn, LogOut } from 'lucide-react';
import AdminEngagementPanels from '@/components/admin/AdminEngagementPanels';
import NotificationHealthPanel from '@/components/admin/NotificationHealthPanel';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Visit = {
  id: string; visitor_id: string; user_id: string | null; path: string; referrer_host: string | null; site_host?: string | null; ref_code?: string | null;
  entered_at: string; last_seen_at: string; duration_seconds: number;
  device_type: string | null; os: string | null; browser: string | null; screen: string | null;
  language: string | null; timezone: string | null; hardware: Record<string, unknown>;
  ip_address: string | null; country: string | null; country_code: string | null; region: string | null;
  city: string | null; district: string | null; isp: string | null;
  is_vpn: boolean | null; is_hosting: boolean | null; is_mobile_network: boolean | null; lat?: number | null; lon?: number | null; load_ms?: number | null;
};
type AuthEvent = {
  id: string; user_id: string; event: string; display_name: string | null; device_type: string | null;
  os: string | null; browser: string | null; ip_address: string | null; country: string | null;
  city: string | null; is_vpn: boolean | null; created_at: string;
};

const RANGES = { '24h': 1, '7d': 7, '30d': 30 } as const;
type Range = keyof typeof RANGES;
const LIVE_MS = 90_000;

const fmtDur = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`);
const flag = (cc: string | null) => (cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : '');

function tally<T>(rows: T[], key: (r: T) => string | null | undefined) {
  const m = new Map<string, number>();
  rows.forEach((r) => { const k = key(r) || 'Unknown'; m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function BarList({ title, rows, total, limit = 10 }: { title: string; rows: [string, number][]; total: number; limit?: number }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex justify-between text-sm font-semibold"><span>{title}</span><span className="text-muted-foreground">Visits</span></div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
      <div className="space-y-1.5">
        {rows.slice(0, limit).map(([k, v]) => (
          <div key={k} className="relative flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
            <div className="absolute inset-y-0 left-0 rounded-md bg-primary/20" style={{ width: `${Math.max(4, (v / Math.max(1, rows[0][1])) * 100)}%` }} />
            <span className="relative truncate pr-2">{k}</span>
            <span className="relative tabular-nums">{v}{total ? <span className="ml-1 text-xs text-muted-foreground">({Math.round((v / total) * 100)}%)</span> : null}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function AdminPlatformAnalyticsPage() {
  const [range, setRange] = useState<Range>('7d');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const since = new Date(Date.now() - RANGES[range] * 86400_000).toISOString();
    const [v, e] = await Promise.all([
      (supabase as any).from('platform_visits').select('*').gte('entered_at', since).order('entered_at', { ascending: false }).limit(5000),
      (supabase as any).from('platform_auth_events').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(300),
    ]);
    if (v.error) { setError(v.error.message); return; }
    setError(null);
    setVisits(v.data ?? []);
    setEvents(e.data ?? []);
  }, [range]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 15_000); return () => window.clearInterval(t); }, []);

  // Realtime: new visits, time-spent updates and sign-in/out events.
  useEffect(() => {
    const ch = supabase
      .channel('admin-platform-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_visits' }, (p: any) => {
        const row = p.new as Visit;
        if (!row?.id) return;
        setVisits((prev) => {
          const i = prev.findIndex((x) => x.id === row.id);
          if (i === -1) return [row, ...prev];
          const next = prev.slice(); next[i] = row; return next;
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'platform_auth_events' }, (p: any) => {
        setEvents((prev) => [p.new as AuthEvent, ...prev].slice(0, 300));
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  // Member names for signed-in visits.
  useEffect(() => {
    const ids = [...new Set(visits.map((v) => v.user_id).filter(Boolean) as string[])].filter((id) => !names[id]);
    if (!ids.length) return;
    void (supabase as any).from('profiles').select('user_id, display_name, username').in('user_id', ids.slice(0, 200))
      .then(({ data }: any) => {
        if (!data) return;
        setNames((n) => ({ ...n, ...Object.fromEntries(data.map((p: any) => [p.user_id, p.display_name || `@${p.username}`])) }));
      });
  }, [visits, names]);

  const s = useMemo(() => {
    const visitors = new Set(visits.map((v) => v.visitor_id));
    const members = new Set(visits.map((v) => v.user_id).filter(Boolean));
    const totalTime = visits.reduce((a, v) => a + (v.duration_seconds || 0), 0);
    const byVisitor = tally(visits, (v) => v.visitor_id);
    const bounced = byVisitor.filter(([, n]) => n === 1).length;
    const live = visits.filter((v) => now - new Date(v.last_seen_at).getTime() < LIVE_MS);
    const liveVisitors = new Set(live.map((v) => v.visitor_id));
    const vpn = visits.filter((v) => v.is_vpn || v.is_hosting);
    const vpnVisitors = new Set(vpn.map((v) => v.visitor_id));

    // Time series: hourly for 24h, daily otherwise.
    const hourly = range === '24h';
    const buckets = new Map<string, { label: string; views: number; visitors: Set<string> }>();
    const steps = hourly ? 24 : RANGES[range];
    for (let i = steps - 1; i >= 0; i--) {
      const d = new Date(now - i * (hourly ? 3600_000 : 86400_000));
      const key = hourly ? d.toISOString().slice(0, 13) : d.toISOString().slice(0, 10);
      buckets.set(key, { label: hourly ? `${d.getHours()}:00` : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), views: 0, visitors: new Set() });
    }
    visits.forEach((v) => {
      const key = hourly ? v.entered_at.slice(0, 13) : v.entered_at.slice(0, 10);
      const b = buckets.get(key); if (b) { b.views++; b.visitors.add(v.visitor_id); }
    });
    const series = [...buckets.values()].map((b) => ({ label: b.label, views: b.views, visitors: b.visitors.size }));

    // Time spent per page.
    const pageTime = new Map<string, { n: number; t: number }>();
    visits.forEach((v) => { const p = pageTime.get(v.path) || { n: 0, t: 0 }; p.n++; p.t += v.duration_seconds || 0; pageTime.set(v.path, p); });

    return {
      visitors: visitors.size, members: members.size, views: visits.length, totalTime,
      avgVisitTime: visitors.size ? Math.round(totalTime / visitors.size) : 0,
      viewsPerVisitor: visitors.size ? (visits.length / visitors.size).toFixed(2) : '0',
      bounce: byVisitor.length ? Math.round((bounced / byVisitor.length) * 100) : 0,
      live, liveVisitors: liveVisitors.size, vpnVisitors: vpnVisitors.size, series,
      pageTime: [...pageTime.entries()].sort((a, b) => b[1].t - a[1].t),
      logins: events.filter((e) => e.event === 'login').length,
      logouts: events.filter((e) => e.event === 'logout').length,
    };
  }, [visits, events, now, range]);

  const sinceIso = useMemo(() => new Date(Date.now() - RANGES[range] * 86400_000).toISOString().slice(0, 16), [range]);
  const hw = (v: Visit, k: string) => (v.hardware?.[k] ?? null) as string | number | null;

  return (
    <div className="min-h-screen p-4 pb-24 text-foreground">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">M'Mora platform analytics</h1>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm"><Radio className="h-4 w-4 text-primary animate-pulse" />{s.liveVisitors} on now</span>
            {(Object.keys(RANGES) as Range[]).map((r) => (
              <Button key={r} size="sm" variant={r === range ? 'default' : 'ghost'} onClick={() => setRange(r)}>{r}</Button>
            ))}
            <Button size="icon" variant="ghost" onClick={() => void load()} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>
        {error && <Card className="p-3 text-sm text-destructive">{error}</Card>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[
            ['Visitors', s.visitors], ['Members', s.members], ['Page views', s.views], ['Views / visitor', s.viewsPerVisitor],
            ['Avg time / visitor', fmtDur(s.avgVisitTime)], ['Total time', fmtDur(s.totalTime)], ['Bounce rate', `${s.bounce}%`], ['VPN / proxy', s.vpnVisitors],
          ].map(([k, v]) => (
            <Card key={k as string} className="p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="text-xl font-bold tabular-nums">{v}</p></Card>
          ))}
        </div>

        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold">Visitors and page views</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="views" name="Page views" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                <Area type="monotone" dataKey="visitors" name="Visitors" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.15)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <AdminEngagementPanels visits={visits as any} names={names} now={now} sinceIso={sinceIso} />

        <div className="grid gap-3 md:grid-cols-2">
          <BarList title="Page" rows={tally(visits, (v) => v.path)} total={s.views} />
          <Card className="p-4">
            <div className="mb-3 flex justify-between text-sm font-semibold"><span>Time spent by page</span><span className="text-muted-foreground">Avg / total</span></div>
            <div className="space-y-1.5 text-sm">
              {s.pageTime.slice(0, 10).map(([p, { n, t }]) => (
                <div key={p} className="flex justify-between"><span className="truncate pr-2">{p}</span><span className="tabular-nums">{fmtDur(Math.round(t / n))} / {fmtDur(t)}</span></div>
              ))}
              {s.pageTime.length === 0 && <p className="text-muted-foreground">No data yet</p>}
            </div>
          </Card>
          <BarList title="Website address" rows={tally(visits, (v) => v.site_host || 'Unknown')} total={s.views} />
          <BarList title="Referral links (visits per member code)" rows={tally(visits.filter((v) => v.ref_code), (v) => v.ref_code)} total={Math.max(1, visits.filter((v) => v.ref_code).length)} />
          <BarList title="Source" rows={tally(visits, (v) => v.referrer_host || 'Direct')} total={s.views} />
          <BarList title="Device" rows={tally(visits, (v) => v.device_type)} total={s.views} />
          <BarList title="Operating system" rows={tally(visits, (v) => v.os)} total={s.views} />
          <BarList title="Browser" rows={tally(visits, (v) => v.browser)} total={s.views} />
          <BarList title="Country" rows={tally(visits, (v) => (v.country ? `${flag(v.country_code)} ${v.country}` : null))} total={s.views} />
          <BarList title="Region / city / area" rows={tally(visits, (v) => [v.district, v.city, v.region].filter(Boolean).join(', ') || null)} total={s.views} />
          <BarList title="Network provider" rows={tally(visits, (v) => v.isp)} total={s.views} />
          <BarList title="Network type" rows={tally(visits, (v) => (v.is_vpn ? 'VPN / proxy' : v.is_hosting ? 'Data centre / hosting' : v.is_mobile_network ? 'Mobile data' : v.country ? 'Home / office' : null))} total={s.views} />
          <BarList title="Hardware (cores · memory)" rows={tally(visits, (v) => (hw(v, 'cpu_cores') ? `${hw(v, 'cpu_cores')} cores · ${hw(v, 'memory_gb') ?? '?'} GB` : null))} total={s.views} />
          <BarList title="Graphics chip" rows={tally(visits, (v) => hw(v, 'gpu') as string | null)} total={s.views} />
        </div>

        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Sign-ins and sign-outs (live)</p>
            <span className="text-xs text-muted-foreground">{s.logins} in · {s.logouts} out</span>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto text-sm">
            {events.length === 0 && <p className="text-muted-foreground">No sign-ins recorded yet</p>}
            {events.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-2 border-b border-border/40 py-1.5">
                {e.event === 'login' ? <LogIn className="h-4 w-4 text-primary" /> : <LogOut className="h-4 w-4 text-muted-foreground" />}
                <span className="font-medium">{e.display_name || e.user_id.slice(0, 8)}</span>
                <span className="text-muted-foreground">{e.event === 'login' ? 'signed in' : 'signed out'}</span>
                <span className="text-xs text-muted-foreground">{[e.device_type, e.os, e.browser].filter(Boolean).join(' · ')}</span>
                <span className="text-xs text-muted-foreground">{[e.city, e.country].filter(Boolean).join(', ')} {e.ip_address}</span>
                {e.is_vpn && <Badge variant="destructive">VPN</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold">Recent visits ({s.live.length} live)</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="text-muted-foreground">
                <tr><th className="py-1">When</th><th>Who</th><th>Page</th><th>Time</th><th>Device</th><th>Hardware</th><th>IP</th><th>Location</th><th>Network</th></tr>
              </thead>
              <tbody>
                {visits.slice(0, 150).map((v) => {
                  const isLive = now - new Date(v.last_seen_at).getTime() < LIVE_MS;
                  return (
                    <tr key={v.id} className="border-t border-border/40 align-top">
                      <td className="py-1.5 pr-2 whitespace-nowrap">{isLive && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />}{new Date(v.entered_at).toLocaleString()}</td>
                      <td className="pr-2">{v.user_id ? names[v.user_id] || v.user_id.slice(0, 8) : `Guest ${v.visitor_id.slice(0, 6)}`}</td>
                      <td className="pr-2">{v.path}</td>
                      <td className="pr-2 tabular-nums">{fmtDur(v.duration_seconds)}</td>
                      <td className="pr-2">{[v.device_type, v.os, v.browser].filter(Boolean).join(' · ')}<br /><span className="text-muted-foreground">{v.screen} {v.language}</span></td>
                      <td className="pr-2 max-w-[180px]">{hw(v, 'cpu_cores') ?? '—'} cores · {hw(v, 'memory_gb') ?? '—'} GB<br /><span className="text-muted-foreground line-clamp-2">{(hw(v, 'gpu') as string) || '—'}</span></td>
                      <td className="pr-2 font-mono">{v.ip_address || '—'}</td>
                      <td className="pr-2">{flag(v.country_code)} {[v.district, v.city, v.region, v.country].filter(Boolean).join(', ') || '—'}<br /><span className="text-muted-foreground">{v.timezone}</span></td>
                      <td className="pr-2">{v.isp || '—'} {v.is_vpn && <Badge variant="destructive" className="ml-1">VPN</Badge>}{v.is_hosting && <Badge variant="secondary" className="ml-1">Hosting</Badge>}{v.is_mobile_network && <Badge variant="outline" className="ml-1">Mobile</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <NotificationHealthPanel />
        <p className="text-xs text-muted-foreground">Location comes from the visitor's public internet address, so it's usually accurate to the city, not the street. Browsers never reveal a device's local network address.</p>
      </div>
    </div>
  );
}
