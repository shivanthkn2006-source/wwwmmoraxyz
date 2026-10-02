// Admin analytics extras: who is online and where, feature taps, sign-up path, return rate, live map, speed and crashes.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import AdminVisitorMap, { type MapPoint } from './AdminVisitorMap';
import AdminPresenceHistory from './AdminPresenceHistory';

type V = {
  id: string; visitor_id: string; user_id: string | null; path: string; entered_at: string; last_seen_at: string;
  duration_seconds: number; device_type: string | null; os: string | null; city: string | null; country: string | null;
  lat?: number | null; lon?: number | null; load_ms?: number | null;
};
type Ev = { id: string; visitor_id: string; user_id: string | null; kind: string; name: string; path: string | null; device_type: string | null; created_at: string };

const LIVE_MS = 90_000;
const fmt = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`);
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');
const median = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

function Rows({ rows, empty, right }: { rows: [string, number][]; empty: string; right?: (n: number) => string }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const max = rows[0][1] || 1;
  return (
    <div className="space-y-1.5">
      {rows.slice(0, 12).map(([k, v]) => (
        <div key={k} className="relative flex justify-between rounded-md px-2 py-1.5 text-sm">
          <div className="absolute inset-y-0 left-0 rounded-md bg-primary/20" style={{ width: `${Math.max(4, (v / max) * 100)}%` }} />
          <span className="relative truncate pr-2">{k}</span><span className="relative tabular-nums">{right ? right(v) : v}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminEngagementPanels({ visits, names, now, sinceIso }: { visits: V[]; names: Record<string, string>; now: number; sinceIso: string }) {
  const [events, setEvents] = useState<Ev[]>([]);
  const [history, setHistory] = useState<{ user_id: string; entered_at: string }[]>([]);

  useEffect(() => {
    let alive = true;
    void (supabase as any).from('platform_events').select('*').gte('created_at', sinceIso).order('created_at', { ascending: false }).limit(5000)
      .then(({ data }: any) => { if (alive) setEvents(data ?? []); });
    return () => { alive = false; };
  }, [sinceIso]);

  useEffect(() => {
    const ch = supabase.channel('admin-platform-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'platform_events' }, (p: any) => setEvents((e) => [p.new as Ev, ...e].slice(0, 5000)))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const since = new Date(Date.now() - 70 * 86400_000).toISOString();
    void (supabase as any).from('platform_visits').select('user_id,entered_at').not('user_id', 'is', null).gte('entered_at', since).limit(20000)
      .then(({ data }: any) => setHistory(data ?? []));
  }, []);

  // City-centre positions (OpenStreetMap search) for visits recorded before exact positions existed; cached on this device.
  const [cityGeo, setCityGeo] = useState<Record<string, [number, number]>>(() => { try { return JSON.parse(localStorage.getItem('mmora-admin-citygeo') || '{}'); } catch { return {}; } });
  useEffect(() => {
    const known = new Set(visits.filter((v) => v.lat != null).map((v) => `${v.city}|${v.country}`));
    const need = [...new Set(visits.filter((v) => v.lat == null && v.city).map((v) => `${v.city}|${v.country}`))].filter((k) => !known.has(k) && !cityGeo[k]).slice(0, 5);
    if (!need.length) return;
    let alive = true;
    (async () => {
      const add: Record<string, [number, number]> = {};
      for (const k of need) {
        const [city, country] = k.split('|');
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`);
          const j = await r.json(); if (j[0]) add[k] = [Number(j[0].lat), Number(j[0].lon)];
        } catch { /* skip */ }
        await new Promise((res) => setTimeout(res, 1100)); // OSM fair-use: 1 request/second
      }
      if (!alive || !Object.keys(add).length) return;
      setCityGeo((c) => { const n = { ...c, ...add }; localStorage.setItem('mmora-admin-citygeo', JSON.stringify(n)); return n; });
    })();
    return () => { alive = false; };
  }, [visits, cityGeo]);

  const d = useMemo(() => {
    const who = (v: { user_id: string | null; visitor_id: string }) => (v.user_id ? names[v.user_id] || `Member ${v.user_id.slice(0, 6)}` : `Guest ${v.visitor_id.slice(0, 6)}`);

    // Online now: newest live visit per visitor, with session time today and recent taps.
    const today = new Date(now - 86400_000).toISOString();
    const latest = new Map<string, V>();
    visits.forEach((v) => { if (now - new Date(v.last_seen_at).getTime() < LIVE_MS) { const p = latest.get(v.visitor_id); if (!p || p.entered_at < v.entered_at) latest.set(v.visitor_id, v); } });
    const online = [...latest.values()].map((v) => {
      const mine = visits.filter((x) => x.visitor_id === v.visitor_id && x.entered_at >= today);
      const taps = events.filter((e) => e.visitor_id === v.visitor_id && e.kind === 'tap' && now - new Date(e.created_at).getTime() < 30 * 60_000);
      return { v, name: who(v), session: mine.reduce((a, x) => a + (x.duration_seconds || 0), 0), pages: new Set(mine.map((x) => x.path)).size, lastTap: taps[0]?.name ?? null, taps: taps.length };
    });

    // Feature taps.
    const taps = events.filter((e) => e.kind === 'tap');
    const t = new Map<string, Set<string>>(); const tc = new Map<string, number>(); const area = new Map<string, number>();
    taps.forEach((e) => {
      tc.set(e.name, (tc.get(e.name) || 0) + 1);
      if (!t.has(e.name)) t.set(e.name, new Set()); t.get(e.name)!.add(e.visitor_id);
      const a = e.name.split(' · ')[0]; area.set(a, (area.get(a) || 0) + 1);
    });
    const features = [...tc.entries()].sort((a, b) => b[1] - a[1]);
    const areas = [...area.entries()].sort((a, b) => b[1] - a[1]);

    // Sign-up path.
    const sawAuth = new Set(visits.filter((v) => v.path.startsWith('/auth') || v.path.startsWith('/signup')).map((v) => v.visitor_id));
    const signups = events.filter((e) => e.kind === 'signup').length;
    const homeMembers = new Set(visits.filter((v) => v.user_id && (v.path === '/' || v.path === '/home')).map((v) => v.user_id));
    const allVisitors = new Set(visits.map((v) => v.visitor_id)).size;

    // Return rate (members whose first visit is old enough to be measured).
    const days = new Map<string, Set<number>>(); const first = new Map<string, number>();
    history.forEach((h) => { const day = Math.floor(new Date(h.entered_at).getTime() / 86400_000); if (!days.has(h.user_id)) days.set(h.user_id, new Set()); days.get(h.user_id)!.add(day); first.set(h.user_id, Math.min(first.get(h.user_id) ?? day, day)); });
    const todayDay = Math.floor(now / 86400_000);
    const ret = [1, 7, 30].map((n) => {
      const cohort = [...first.entries()].filter(([, f]) => todayDay - f >= n);
      const back = cohort.filter(([u, f]) => { const s = days.get(u)!; for (let k = f + n; k <= Math.min(todayDay, f + n + (n === 1 ? 0 : n === 7 ? 2 : 5)); k++) if (s.has(k)) return true; return false; });
      return { n, cohort: cohort.length, back: back.length };
    });

    // Speed and crashes.
    const loads = visits.filter((v) => v.load_ms && v.load_ms > 0);
    const byDev = new Map<string, number[]>(); const byPage = new Map<string, number[]>();
    loads.forEach((v) => { const k = v.device_type || 'unknown'; (byDev.get(k) || byDev.set(k, []).get(k)!).push(v.load_ms!); (byPage.get(v.path) || byPage.set(v.path, []).get(v.path)!).push(v.load_ms!); });
    const errors = events.filter((e) => e.kind === 'error');
    const errPages = new Map<string, number>(); errors.forEach((e) => { const k = `${e.path || '?'} — ${e.name}`; errPages.set(k, (errPages.get(k) || 0) + 1); });

    return {
      online, features, areas, featureUsers: t, sawAuth: sawAuth.size, signups, home: homeMembers.size, allVisitors, ret,
      speedDev: [...byDev.entries()].map(([k, xs]) => [k, median(xs)] as [string, number]).sort((a, b) => b[1] - a[1]),
      speedPage: [...byPage.entries()].map(([k, xs]) => [k, median(xs)] as [string, number]).sort((a, b) => b[1] - a[1]),
      medianLoad: median(loads.map((v) => v.load_ms!)),
      errors: [...errPages.entries()].sort((a, b) => b[1] - a[1]), errorCount: errors.length,
      dots: online.filter((o) => o.v.lat != null && o.v.lon != null),
      mapPoints: (() => {
        const onlineIds = new Set(online.map((o) => o.v.visitor_id));
        const cityPos = new Map<string, [number, number]>(Object.entries(cityGeo));
        visits.forEach((v) => { if (v.lat != null && v.lon != null && v.city) cityPos.set(`${v.city}|${v.country}`, [v.lat, v.lon]); });
        const last = new Map<string, V>();
        visits.forEach((v) => { const k = v.user_id || v.visitor_id; const p = last.get(k); if (!p || p.last_seen_at < v.last_seen_at) last.set(k, v); });
        const pts: MapPoint[] = [];
        last.forEach((v, k) => {
          const a = v as any;
          const exact = v.lat != null && v.lon != null;
          const pos = exact ? [v.lat as number, v.lon as number] : cityPos.get(`${v.city}|${v.country}`);
          if (!pos) return;
          const mine = visits.filter((x) => (x.user_id || x.visitor_id) === k);
          const hw = a.hardware && typeof a.hardware === 'object' ? Object.entries(a.hardware).map(([hk, hv]) => `${hk}: ${hv}`).join(', ') : '';
          const net = [a.is_vpn && 'VPN/proxy', a.is_hosting && 'Data centre', a.is_mobile_network && 'Mobile data'].filter(Boolean).join(', ') || 'Home / office';
          const details: [string, string][] = ([
            ['User ID', v.user_id ?? 'Guest (not signed in)'],
            ['Visitor ID', v.visitor_id],
            ['Place', [a.district, v.city, a.region, v.country].filter(Boolean).join(', ')],
            ['IP address', a.ip_address ?? ''],
            ['Provider', a.isp ?? ''],
            ['Network', net],
            ['Device', [v.device_type, v.os, a.browser].filter(Boolean).join(' · ')],
            ['Screen', a.screen ?? ''], ['Language', a.language ?? ''], ['Timezone', a.timezone ?? ''],
            ['Hardware', hw],
            ['Current page', v.path],
            ['Pages this period', String(new Set(mine.map((x) => x.path)).size)],
            ['Time this period', fmt(mine.reduce((s, x) => s + (x.duration_seconds || 0), 0))],
            ['Taps this period', String(events.filter((e) => e.visitor_id === v.visitor_id && e.kind === 'tap').length)],
            ['Came from', a.referrer_host ?? 'Direct'], ['Website address', a.site_host ?? ''], ['Invite code', a.ref_code ?? ''],
            ['Load time', v.load_ms ? `${(v.load_ms / 1000).toFixed(1)}s` : ''],
            ['Last seen', new Date(v.last_seen_at).toLocaleString()],
          ] as [string, string][]).filter(([, val]) => val);
          pts.push({ key: k, lat: pos[0], lon: pos[1], name: who(v), userId: v.user_id, online: onlineIds.has(v.visitor_id), status: onlineIds.has(v.visitor_id) ? "online" : now - new Date(v.last_seen_at).getTime() < 15 * 60_000 ? "idle" : "offline", approx: !exact, details });
        });
        return pts;
      })(),
    };
  }, [visits, events, history, names, now, cityGeo]);

  const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${n}ms`);

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <p className="mb-2 text-sm font-semibold">Online now ({d.online.length})</p>
        {d.online.length === 0 ? <p className="text-sm text-muted-foreground">Nobody online in the last 90 seconds</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="text-muted-foreground"><tr><th className="py-1">Who</th><th>Page now</th><th>On this page</th><th>Today</th><th>Pages</th><th>Last tap (30 min)</th><th>Device</th><th>Where</th></tr></thead>
              <tbody>
                {d.online.map((o) => (
                  <tr key={o.v.visitor_id} className="border-t border-border/40">
                    <td className="py-1.5 pr-2 font-medium"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />{o.name}</td>
                    <td className="pr-2">{o.v.path}</td>
                    <td className="pr-2 tabular-nums">{fmt(Math.max(o.v.duration_seconds, Math.round((now - new Date(o.v.entered_at).getTime()) / 1000)))}</td>
                    <td className="pr-2 tabular-nums">{fmt(o.session)}</td>
                    <td className="pr-2 tabular-nums">{o.pages}</td>
                    <td className="pr-2">{o.lastTap ? `${o.lastTap} (${o.taps})` : '—'}</td>
                    <td className="pr-2">{[o.v.device_type, o.v.os].filter(Boolean).join(' · ')}</td>
                    <td className="pr-2">{[o.v.city, o.v.country].filter(Boolean).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <p className="mb-2 text-sm font-semibold">Live world map</p>
        <AdminVisitorMap points={d.mapPoints} />
        <p className="mt-1 text-xs text-muted-foreground">
          Green = online now · Yellow = idle (seen in the last 15 min) · Red = signed out / left. {d.mapPoints.length} visitors this period. Tap a pin for full details.
        </p>
      </Card>

      <AdminPresenceHistory visits={visits as any} names={names} now={now} sinceIso={sinceIso} />

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex justify-between text-sm font-semibold"><span>Feature taps</span><span className="text-muted-foreground">Taps</span></div>
          <Rows rows={d.features} empty="No taps recorded yet" right={(n) => String(n)} />
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex justify-between text-sm font-semibold"><span>Taps by area</span><span className="text-muted-foreground">Taps</span></div>
          <Rows rows={d.areas} empty="No taps recorded yet" />
        </Card>

        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">Sign-up path</p>
          {[
            ['All visitors', d.allVisitors, d.allVisitors],
            ['Opened the sign-in page', d.sawAuth, d.allVisitors],
            ['Created an account', d.signups, d.sawAuth],
            ['Members who reached Home', d.home, d.allVisitors],
          ].map(([k, v, base]) => (
            <div key={k as string} className="flex justify-between border-b border-border/40 py-1.5 text-sm">
              <span>{k}</span><span className="tabular-nums">{v as number} <span className="text-xs text-muted-foreground">{k === 'All visitors' ? '' : pct(v as number, base as number)}</span></span>
            </div>
          ))}
          <p className="mt-2 text-xs text-muted-foreground">Drop-off = the gap between each step. Accounts are counted from this update on.</p>
        </Card>

        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">Return rate</p>
          {d.ret.map((r) => (
            <div key={r.n} className="flex justify-between border-b border-border/40 py-1.5 text-sm">
              <span>Came back after {r.n} day{r.n > 1 ? 's' : ''}</span>
              <span className="tabular-nums">{r.cohort ? `${pct(r.back, r.cohort)} (${r.back}/${r.cohort})` : 'Not enough data yet'}</span>
            </div>
          ))}
          <p className="mt-2 text-xs text-muted-foreground">Measured from each member's first recorded visit.</p>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex justify-between text-sm font-semibold"><span>Load speed by device</span><span className="text-muted-foreground">Median {d.medianLoad ? ms(d.medianLoad) : '—'}</span></div>
          <Rows rows={d.speedDev} empty="No load times yet" right={ms} />
          <p className="mb-2 mt-4 text-sm font-semibold">Slowest pages</p>
          <Rows rows={d.speedPage} empty="No load times yet" right={ms} />
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex justify-between text-sm font-semibold"><span>Crashes and errors</span><span className="text-muted-foreground">{d.errorCount}</span></div>
          <Rows rows={d.errors} empty="No crashes recorded" />
        </Card>
      </div>
    </div>
  );
}
