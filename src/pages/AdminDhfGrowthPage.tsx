/**
 * ADMIN — DHF GROWTH, ZOE RECOMMENDATIONS & PLATFORM ACTIVITY
 *
 * One console showing, per member: how much real DHF data exists, how many Zoe
 * recommendations (live + shadow) were produced, and how active they are on the
 * platform. Includes text/date filters, CSV export, the nightly synthetic
 * crawler controls and its findings.
 *
 * All reads are row-level-security gated: non-admins see nothing.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Loader2, Radar, ListTree, GitCompare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import useIsAdmin from '@/hooks/useIsAdmin';
import { ROUTE_REGISTRY } from '@/config/routeRegistry';

interface GrowthRow {
  userId: string;
  username: string;
  createdAt: string | null;
  dhfPosts: number;
  memories: number;
  sensorEvents: number;
  lineageEntries: number;
  shadowRecs: number;
  lastActivity: string | null;
}

interface CrawlRun {
  id: string;
  trigger: string;
  started_at: string;
  finished_at: string | null;
  routes_checked: number;
  findings_count: number;
  status: string;
  summary: Record<string, unknown> | null;
}

interface ShadowRow {
  id: string;
  user_id: string;
  source: string;
  basis: string | null;
  recommendation: string;
  live_recommendation: string | null;
  confidence: number;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface CrawlFinding {
  id: string;
  route: string | null;
  finding_type: string;
  severity: string;
  http_status: number | null;
  duration_ms: number | null;
  detail: string | null;
}

const countBy = (rows: { user_id: string }[] | null) => {
  const map = new Map<string, number>();
  for (const row of rows ?? []) map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1);
  return map;
};

export default function AdminDhfGrowthPage() {
  const isAdmin = useIsAdmin();
  const [rows, setRows] = useState<GrowthRow[]>([]);
  const [runs, setRuns] = useState<CrawlRun[]>([]);
  const [findings, setFindings] = useState<CrawlFinding[]>([]);
  const [shadowRows, setShadowRows] = useState<ShadowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [since, setSince] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profiles, posts, memories, events, lineage, shadow, runRows] = await Promise.all([
        supabase.from('profiles').select('id, username, created_at').limit(1000),
        supabase.from('dhf_daily_posts').select('user_id').limit(5000),
        supabase.from('mmora_memories').select('user_id').limit(5000),
        supabase.from('behavioral_events').select('user_id, created_at').order('created_at', { ascending: false }).limit(5000),
        supabase.from('dhf_lineage_ledger').select('user_id').limit(5000),
        supabase.from('zoe_shadow_recommendations').select('*').order('created_at', { ascending: false }).limit(2000),
        supabase.from('zoe_crawl_runs').select('*').order('started_at', { ascending: false }).limit(10),
      ]);

      const postCount = countBy(posts.data as { user_id: string }[] | null);
      const memoryCount = countBy(memories.data as { user_id: string }[] | null);
      const eventCount = countBy(events.data as { user_id: string }[] | null);
      const lineageCount = countBy(lineage.data as { user_id: string }[] | null);
      const shadowCount = countBy(shadow.data as { user_id: string }[] | null);
      setShadowRows(((shadow.data ?? []) as ShadowRow[]).slice(0, 50));

      const lastActivity = new Map<string, string>();
      for (const e of (events.data ?? []) as { user_id: string; created_at: string }[]) {
        if (!lastActivity.has(e.user_id)) lastActivity.set(e.user_id, e.created_at);
      }

      setRows(
        ((profiles.data ?? []) as { id: string; username: string | null; created_at: string | null }[]).map((p) => ({
          userId: p.id,
          username: p.username ?? p.id.slice(0, 8),
          createdAt: p.created_at,
          dhfPosts: postCount.get(p.id) ?? 0,
          memories: memoryCount.get(p.id) ?? 0,
          sensorEvents: eventCount.get(p.id) ?? 0,
          lineageEntries: lineageCount.get(p.id) ?? 0,
          shadowRecs: shadowCount.get(p.id) ?? 0,
          lastActivity: lastActivity.get(p.id) ?? null,
        })),
      );
      setRuns((runRows.data ?? []) as CrawlRun[]);

      const latest = (runRows.data ?? [])[0] as CrawlRun | undefined;
      if (latest) {
        const { data } = await supabase
          .from('zoe_crawl_findings')
          .select('*')
          .eq('run_id', latest.id)
          .order('severity')
          .limit(200);
        setFindings((data ?? []) as CrawlFinding[]);
      } else {
        setFindings([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
    else if (isAdmin === false) setLoading(false);
  }, [isAdmin, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cutoff = since ? new Date(since).getTime() : 0;
    return rows
      .filter((r) => (!q ? true : r.username.toLowerCase().includes(q) || r.userId.includes(q)))
      .filter((r) => (!cutoff ? true : r.lastActivity ? new Date(r.lastActivity).getTime() >= cutoff : false))
      .sort((a, b) => b.dhfPosts + b.memories - (a.dhfPosts + a.memories));
  }, [rows, query, since]);

  const exportCsv = () => {
    const header = ['user_id', 'username', 'joined', 'dhf_posts', 'memories', 'sensor_events', 'lineage_entries', 'shadow_recommendations', 'last_activity'];
    const body = filtered.map((r) =>
      [r.userId, r.username, r.createdAt ?? '', r.dhfPosts, r.memories, r.sensorEvents, r.lineageEntries, r.shadowRecs, r.lastActivity ?? ''].join(','),
    );
    const blob = new Blob([[header.join(','), ...body].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dhf-growth-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncRoutes = async () => {
    setBusy('routes');
    try {
      const payload = ROUTE_REGISTRY.map((r) => ({
        path: r.path,
        label: r.label,
        route_group: r.group,
        dynamic: r.dynamic,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('platform_routes').upsert(payload, { onConflict: 'path' });
      if (error) throw error;
      toast.success(`Synced ${payload.length} routes into the crawler registry`);
    } catch (e) {
      toast.error(`Route sync failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const runCrawler = async () => {
    setBusy('crawl');
    try {
      const { data, error } = await supabase.functions.invoke('zoe-synthetic-crawler', { body: { trigger: 'manual' } });
      if (error) throw error;
      toast.success(`Crawl complete — ${data?.routesChecked ?? 0} routes, ${data?.findings ?? 0} findings`);
      await load();
    } catch (e) {
      toast.error(`Crawl failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const runShadowMode = async () => {
    setBusy('shadow');
    try {
      const { data, error } = await supabase.functions.invoke('zoe-shadow-mode', {
        body: { replayRoutes: true, limitUsers: 25 },
      });
      if (error) throw error;
      toast.success(`Shadow replay complete — ${data?.generated ?? 0} recommendations from ${data?.users ?? 0} members`);
      await load();
    } catch (e) {
      toast.error(`Shadow replay failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>DHF Growth Console — Admin</title>
        <meta name="description" content="Per-member DHF growth, Zoe recommendations, platform activity and nightly crawler findings." />
      </Helmet>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin/overview" aria-label="Back to admin overview"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold">DHF Growth Console</h1>
              <p className="text-sm text-muted-foreground">Real DHF data, Zoe recommendations and crawler health.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Radar className="w-4 h-4" /> Synthetic crawler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => void syncRoutes()} disabled={busy !== null}>
                {busy === 'routes' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ListTree className="w-4 h-4 mr-2" />}
                Sync {ROUTE_REGISTRY.length} routes
              </Button>
              <Button size="sm" onClick={() => void runCrawler()} disabled={busy !== null}>
                {busy === 'crawl' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Radar className="w-4 h-4 mr-2" />}
                Run crawl now
              </Button>
            </div>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No crawl has run yet.</p>
            ) : (
              <div className="space-y-2">
                {runs.slice(0, 5).map((run) => (
                  <div key={run.id} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
                    <span>{new Date(run.started_at).toLocaleString()} · {run.trigger}</span>
                    <span className="text-muted-foreground">
                      {run.routes_checked} routes · {run.findings_count} findings · {run.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {findings.length > 0 && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {findings.map((f) => (
                  <div key={f.id} className="flex items-start gap-2 text-xs border-b border-border/50 py-1.5">
                    <Badge variant={f.severity === 'critical' ? 'destructive' : 'secondary'}>{f.finding_type}</Badge>
                    <span className="font-mono">{f.route ?? '—'}</span>
                    <span className="text-muted-foreground flex-1">{f.detail}</span>
                    {f.duration_ms !== null && <span className="text-muted-foreground">{f.duration_ms}ms</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><GitCompare className="w-4 h-4" /> Shadow mode — generated vs live</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Button size="sm" onClick={() => void runShadowMode()} disabled={busy !== null}>
                {busy === 'shadow' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitCompare className="w-4 h-4 mr-2" />}
                Replay routes + DHF history
              </Button>
              <span className="text-xs text-muted-foreground">
                Recommendations are generated from real DHF rows only and stored for comparison — never shown to members.
              </span>
            </div>
            {shadowRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shadow recommendations yet — run a replay.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {shadowRows.map((row) => (
                  <div key={row.id} className="border border-border rounded-md p-3 text-xs space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{row.source}</Badge>
                      <span className="font-mono">{row.user_id.slice(0, 8)}</span>
                      <span className="text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
                      <span className="text-muted-foreground">confidence {Number(row.confidence).toFixed(2)}</span>
                    </div>
                    <p><span className="text-muted-foreground">Shadow:</span> {row.recommendation}</p>
                    <p><span className="text-muted-foreground">Live:</span> {row.live_recommendation ?? '— none delivered —'}</p>
                    {row.basis && (
                      <details>
                        <summary className="cursor-pointer text-muted-foreground">Evidence used</summary>
                        <pre className="whitespace-pre-wrap mt-1 opacity-80">{row.basis}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Members ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input className="max-w-xs" placeholder="Filter by username or id" value={query} onChange={(e) => setQuery(e.target.value)} />
              <Input className="max-w-[200px]" type="date" value={since} onChange={(e) => setSince(e.target.value)} aria-label="Active since" />
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Member</th>
                      <th className="py-2 pr-4">DHF posts</th>
                      <th className="py-2 pr-4">Memories</th>
                      <th className="py-2 pr-4">Sensor events</th>
                      <th className="py-2 pr-4">Lineage</th>
                      <th className="py-2 pr-4">Shadow recs</th>
                      <th className="py-2">Last activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.userId} className="border-t border-border/60">
                        <td className="py-2 pr-4">{r.username}</td>
                        <td className="py-2 pr-4">{r.dhfPosts}</td>
                        <td className="py-2 pr-4">{r.memories}</td>
                        <td className="py-2 pr-4">{r.sensorEvents}</td>
                        <td className="py-2 pr-4">{r.lineageEntries}</td>
                        <td className="py-2 pr-4">{r.shadowRecs}</td>
                        <td className="py-2">{r.lastActivity ? new Date(r.lastActivity).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
