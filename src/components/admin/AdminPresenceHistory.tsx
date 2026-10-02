// Online / offline history: every visit session (came online → went offline) plus sign-in / sign-out events, newest first.
// Folded by default; opens as a drop-down so the admin can read what happened while away.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Visit = { id: string; visitor_id: string; user_id: string | null; path: string; entered_at: string; last_seen_at: string; duration_seconds: number; device_type: string | null; os: string | null; city: string | null; country: string | null } & Record<string, any>;
type AuthEv = { id: string; user_id: string; event: string; display_name: string | null; device_type: string | null; os: string | null; browser: string | null; ip_address: string | null; country: string | null; city: string | null; is_vpn: boolean | null; created_at: string };

type Row = {
  key: string; at: number; kind: 'session' | 'auth'; who: string; userId: string | null; status: string;
  start: string; end: string; duration: string; pages: string; device: string; place: string; ip: string; network: string; site: string;
};

const SESSION_GAP_MS = 5 * 60_000;
const LIVE_MS = 90_000;
const PAGE = 100;
const fmt = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`);
const time = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminPresenceHistory({ visits, names, now, sinceIso }: { visits: Visit[]; names: Record<string, string>; now: number; sinceIso: string }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'members' | 'guests'>('all');
  const [limit, setLimit] = useState(PAGE);
  const [auth, setAuth] = useState<AuthEv[]>([]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void (supabase as any).from('platform_auth_events').select('*').gte('created_at', sinceIso).order('created_at', { ascending: false }).limit(2000)
      .then(({ data }: any) => { if (alive) setAuth(data ?? []); });
    return () => { alive = false; };
  }, [open, sinceIso]);

  const rows = useMemo<Row[]>(() => {
    if (!open) return [];
    const who = (uid: string | null, vid: string) => (uid ? names[uid] || `Member ${uid.slice(0, 6)}` : `Guest ${vid.slice(0, 6)}`);
    // Split each visitor's page visits into sessions: a gap over 5 minutes means they went offline.
    const byVisitor = new Map<string, Visit[]>();
    visits.forEach((v) => { const k = v.user_id || v.visitor_id; (byVisitor.get(k) || byVisitor.set(k, []).get(k)!).push(v); });
    const out: Row[] = [];
    byVisitor.forEach((list) => {
      list.sort((a, b) => a.entered_at.localeCompare(b.entered_at));
      let cur: Visit[] = [];
      const flush = () => {
        if (!cur.length) return;
        const f = cur[0]; const l = cur.reduce((m, x) => (x.last_seen_at > m.last_seen_at ? x : m), cur[0]);
        const endMs = new Date(l.last_seen_at).getTime();
        const live = now - endMs < LIVE_MS;
        const net = [f.is_vpn && 'VPN/proxy', f.is_hosting && 'Data centre', f.is_mobile_network && 'Mobile data'].filter(Boolean).join(', ') || 'Home / office';
        out.push({
          key: `s-${f.id}`, at: new Date(f.entered_at).getTime(), kind: 'session', who: who(f.user_id, f.visitor_id), userId: f.user_id,
          status: live ? 'Online now' : now - endMs < 15 * 60_000 ? 'Idle' : 'Went offline',
          start: time(f.entered_at), end: live ? '—' : time(l.last_seen_at),
          duration: fmt(Math.max(0, Math.round((endMs - new Date(f.entered_at).getTime()) / 1000))),
          pages: [...new Set(cur.map((x) => x.path))].join(', '),
          device: [f.device_type, f.os, f.browser].filter(Boolean).join(' · '),
          place: [f.city, f.region, f.country].filter(Boolean).join(', '),
          ip: f.ip_address ?? '', network: net, site: f.site_host ?? '',
        });
        cur = [];
      };
      list.forEach((v) => {
        const prevEnd = cur.length ? Math.max(...cur.map((x) => new Date(x.last_seen_at).getTime())) : 0;
        if (cur.length && new Date(v.entered_at).getTime() - prevEnd > SESSION_GAP_MS) flush();
        cur.push(v);
      });
      flush();
    });
    auth.forEach((e) => out.push({
      key: `a-${e.id}`, at: new Date(e.created_at).getTime(), kind: 'auth', who: e.display_name || names[e.user_id] || `Member ${e.user_id.slice(0, 6)}`, userId: e.user_id,
      status: e.event === 'login' ? 'Signed in' : e.event === 'logout' ? 'Signed out' : e.event,
      start: time(e.created_at), end: '', duration: '', pages: '',
      device: [e.device_type, e.os, e.browser].filter(Boolean).join(' · '), place: [e.city, e.country].filter(Boolean).join(', '),
      ip: e.ip_address ?? '', network: e.is_vpn ? 'VPN/proxy' : '', site: '',
    }));
    return out
      .filter((r) => filter === 'all' || (filter === 'members' ? !!r.userId : !r.userId))
      .sort((a, b) => b.at - a.at);
  }, [open, visits, auth, names, now, filter]);

  const dot = (s: string) => (s === 'Online now' || s === 'Signed in' ? 'bg-green-500' : s === 'Idle' ? 'bg-yellow-400' : 'bg-red-500');

  return (
    <Card className="p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left text-sm font-semibold">
        <span>Online / offline history</span>
        <span className="text-xs text-muted-foreground">{open ? '▾ Hide' : '▸ Show'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {(['all', 'members', 'guests'] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? 'secondary' : 'ghost'} onClick={() => { setFilter(f); setLimit(PAGE); }}>
                {f === 'all' ? 'Everyone' : f === 'members' ? 'Members' : 'Guests'}
              </Button>
            ))}
            <span className="text-muted-foreground">{rows.length} entries in this period · newest first</span>
          </div>
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">Nothing recorded in this period</p> : (
            <div className="max-h-[32rem] overflow-auto">
              <table className="w-full min-w-[1100px] text-left text-xs">
                <thead className="sticky top-0 bg-card text-muted-foreground">
                  <tr><th className="py-1">Who</th><th>Status</th><th>Came online</th><th>Went offline</th><th>Time</th><th>Pages</th><th>Device</th><th>Place</th><th>IP</th><th>Network</th><th>Address</th></tr>
                </thead>
                <tbody>
                  {rows.slice(0, limit).map((r) => (
                    <tr key={r.key} className="border-t border-border/40 align-top">
                      <td className="py-1.5 pr-2 font-medium">{r.who}{r.userId && <span className="block text-[10px] text-muted-foreground">{r.userId.slice(0, 8)}</span>}</td>
                      <td className="whitespace-nowrap pr-2"><span className={`mr-1 inline-block h-2 w-2 rounded-full ${dot(r.status)}`} />{r.status}</td>
                      <td className="whitespace-nowrap pr-2">{r.start}</td>
                      <td className="whitespace-nowrap pr-2">{r.end}</td>
                      <td className="pr-2 tabular-nums">{r.duration}</td>
                      <td className="max-w-[16rem] pr-2 break-words">{r.pages}</td>
                      <td className="pr-2">{r.device}</td>
                      <td className="pr-2">{r.place}</td>
                      <td className="pr-2 tabular-nums">{r.ip}</td>
                      <td className="pr-2">{r.network}</td>
                      <td className="pr-2">{r.site}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > limit && (
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => setLimit((l) => l + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more</Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
