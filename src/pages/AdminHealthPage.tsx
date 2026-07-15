import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Activity, Radio, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { checkRootAdminStatus } from '@/components/security/securityConfig';
import { subscribePerf, getPerfEntries, type PerfEntry } from '@/utils/perfLogger';

type RtState = 'connecting' | 'open' | 'closed' | 'error';

const AdminHealthPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rtState, setRtState] = useState<RtState>('connecting');
  const [entries, setEntries] = useState<PerfEntry[]>(getPerfEntries());
  const [backendStats, setBackendStats] = useState<{
    profiles: number | null;
    posts: number | null;
    notifications: number | null;
    checkedAt: number;
  }>({ profiles: null, posts: null, notifications: null, checkedAt: 0 });

  // Gate access
  useEffect(() => {
    (async () => {
      if (!user) {
        navigate('/auth');
        return;
      }
      const { isAdmin } = await checkRootAdminStatus(user.id);
      if (!isAdmin) {
        toast.error('Admin access required');
        navigate('/home');
        return;
      }
      setAllowed(true);
    })();
  }, [user, navigate]);

  // Perf subscription
  useEffect(() => subscribePerf(setEntries), []);

  // Realtime connection probe
  useEffect(() => {
    if (!allowed) return;
    const channel = supabase
      .channel(`admin-health-probe:${Math.random().toString(36).slice(2, 8)}`)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRtState('open');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRtState('error');
        else if (status === 'CLOSED') setRtState('closed');
        else setRtState('connecting');
      });
    return () => { supabase.removeChannel(channel); };
  }, [allowed]);

  const refreshStats = async () => {
    try {
      const [p, po, n] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
      ]);
      setBackendStats({
        profiles: p.count ?? null,
        posts: po.count ?? null,
        notifications: n.count ?? null,
        checkedAt: Date.now(),
      });
    } catch (e: any) {
      toast.error(`Stats error: ${e?.message ?? 'unknown'}`);
    }
  };

  useEffect(() => { if (allowed) refreshStats(); }, [allowed]);

  if (allowed === null) {
    return <div className="p-8 text-muted-foreground">Verifying admin access…</div>;
  }

  const apiEntries = entries.filter((e) => e.kind === 'api').slice(0, 20);
  const pageEntries = entries.filter((e) => e.kind === 'page').slice(0, 10);
  const apiFailures = entries.filter((e) => e.kind === 'api' && !e.ok).slice(0, 10);
  const avgApi = apiEntries.length
    ? Math.round(apiEntries.reduce((s, e) => s + e.durationMs, 0) / apiEntries.length)
    : 0;

  const rtBadge =
    rtState === 'open' ? <Badge className="bg-emerald-600">Live</Badge>
    : rtState === 'error' ? <Badge variant="destructive">Error</Badge>
    : rtState === 'closed' ? <Badge variant="secondary">Closed</Badge>
    : <Badge variant="outline">Connecting…</Badge>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Health & Status</h1>
            <p className="text-sm text-muted-foreground">Admin-only realtime, API, and backend diagnostics</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refreshStats}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Radio className="h-4 w-4" /> Realtime channel
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">{rtState}</span>
            {rtBadge}
          </div>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" /> Avg API latency
          </div>
          <div className="text-2xl font-semibold">{avgApi}ms</div>
          <div className="text-xs text-muted-foreground">{apiEntries.length} recent calls</div>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> Recent API failures
          </div>
          <div className="text-2xl font-semibold text-destructive">{apiFailures.length}</div>
          <div className="text-xs text-muted-foreground">last {entries.length} events</div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Backend counts</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <StatCell label="profiles" value={backendStats.profiles} />
          <StatCell label="posts" value={backendStats.posts} />
          <StatCell label="notifications" value={backendStats.notifications} />
        </div>
        {backendStats.checkedAt > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            Last checked {new Date(backendStats.checkedAt).toLocaleTimeString()}
          </p>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Recent page loads</h2>
        {pageEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No page load metrics yet — navigate around to populate.</p>
        ) : (
          <ul className="text-sm divide-y divide-border">
            {pageEntries.map((e, i) => (
              <li key={i} className="py-2 flex justify-between gap-4">
                <span className="truncate">{e.label}</span>
                <span className="tabular-nums text-muted-foreground">{e.durationMs.toFixed(0)}ms</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Recent API calls</h2>
        {apiEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API calls captured yet.</p>
        ) : (
          <ul className="text-xs divide-y divide-border font-mono">
            {apiEntries.map((e, i) => (
              <li key={i} className="py-2 flex justify-between gap-4">
                <span className="truncate">
                  {e.ok ? '✓' : '✗'} [{e.status}] {e.label}
                </span>
                <span className="tabular-nums text-muted-foreground">{e.durationMs.toFixed(0)}ms</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {apiFailures.length > 0 && (
        <Card className="p-4 border-destructive/50">
          <h2 className="font-semibold mb-3 text-destructive">Recent failures</h2>
          <ul className="text-xs divide-y divide-border font-mono">
            {apiFailures.map((e, i) => (
              <li key={i} className="py-2 flex justify-between gap-4">
                <span className="truncate">[{e.status}] {e.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {new Date(e.at).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

const StatCell = ({ label, value }: { label: string; value: number | null }) => (
  <div className="rounded-md border border-border p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold tabular-nums">{value ?? '—'}</div>
  </div>
);

export default AdminHealthPage;
