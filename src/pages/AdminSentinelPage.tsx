/**
 * SENTINEL (admin-only)
 *
 * The operator's live view of the platform:
 *   1. Live now — who is on the platform this minute, from which country /
 *      region / city, on what IP, browser, OS and hardware.
 *   2. Sign-ups — the newest accounts with their first-seen location.
 *   3. Threats — tamper attempts (inspector, source view, page saving) with
 *      the device behind them and whether they were auto-blocked.
 *   4. Blocks — the live block list, with a one-click release.
 *
 * Every read is protected by row-level security: a non-admin gets nothing back
 * and the page says so plainly instead of pretending to work.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Loader2, ShieldAlert, Globe, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SessionRow {
  id: string;
  user_id: string | null;
  ip_address: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  browser: string | null;
  browser_version?: string | null;
  os: string | null;
  os_version?: string | null;
  device_type: string | null;
  device_vendor?: string | null;
  device_model: string | null;
  device_fingerprint: string | null;
  hardware: Record<string, unknown> | null;
  last_activity_at: string | null;
  started_at: string | null;
  is_active: boolean | null;
}

interface ThreatRow {
  id: string;
  user_id: string | null;
  threat_type: string;
  severity: string;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  device_fingerprint: string | null;
  page_url: string | null;
  blocked: boolean;
  created_at: string;
}

interface BlockRow {
  id: string;
  user_id: string | null;
  device_fingerprint: string | null;
  ip_address: string | null;
  reason: string;
  severity: string;
  active: boolean;
  created_at: string;
}

interface SignupRow {
  id: string;
  username: string | null;
  created_at: string | null;
}

const severityTone: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-amber-500/15 text-amber-400',
  high: 'bg-orange-500/15 text-orange-400',
  critical: 'bg-red-500/15 text-red-400',
};

const when = (iso: string | null): string => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
};

const place = (row: { country?: string | null; region?: string | null; city?: string | null }): string =>
  [row.city, row.region, row.country].filter(Boolean).join(', ') || 'Unknown location';

const hardwareValue = (value: unknown, suffix = ''): string =>
  value === null || value === undefined || value === '' ? 'Unavailable' : `${String(value)}${suffix}`;

const AdminSentinelPage: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [threats, setThreats] = useState<ThreatRow[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);


  useEffect(() => {
    let alive = true;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    void supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => {
      if (alive) setIsAdmin(Boolean(data));
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
    const [s, t, b, u] = await Promise.all([
      supabase
        .from('sentinel_sessions')
        .select(
          'id,user_id,ip_address,country,region,city,browser,browser_version,os,os_version,device_type,device_vendor,device_model,device_fingerprint,hardware,last_activity_at,started_at,is_active',
        )
        .gte('last_activity_at', cutoff)
        .order('last_activity_at', { ascending: false })
        .limit(200),
      supabase
        .from('sentinel_threat_events')
        .select(
          'id,user_id,threat_type,severity,ip_address,country,city,device_fingerprint,page_url,blocked,created_at',
        )
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('sentinel_blocks')
        .select('id,user_id,device_fingerprint,ip_address,reason,severity,active,created_at')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('profiles')
        .select('id,username,created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    setSessions((s.data as SessionRow[] | null) ?? []);
    setThreats((t.data as ThreatRow[] | null) ?? []);
    setBlocks((b.data as BlockRow[] | null) ?? []);
    setSignups((u.data as SignupRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  // Keep the live board honest without hammering the backend.
  useEffect(() => {
    if (!isAdmin) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 60_000);
    return () => clearInterval(timer);
  }, [isAdmin, load]);

  const release = useCallback(
    async (id: string) => {
      setReleasing(id);
      const { error } = await supabase
        .from('sentinel_blocks')
        .update({ active: false, released_by: user?.id ?? null, released_at: new Date().toISOString() })
        .eq('id', id);
      setReleasing(null);
      if (error) {
        toast.error('Could not lift that block.');
        return;
      }
      toast.success('Block lifted.');
      setBlocks((prev) => prev.filter((row) => row.id !== id));
    },
    [user?.id],
  );

  /**
   * Fires the real tamper pipeline end-to-end — the same edge function, geo
   * resolution and hardware fingerprint an intruder would trigger. Severities
   * stay low on purpose so an operator self-test never earns a block.
   */
  const runProbe = useCallback(async () => {
    setProbing(true);
    try {
      for (const type of ['view_source_attempt', 'page_save_attempt', 'context_menu_probe'] as const) {
        await reportThreat(type, 'low', { path: '/admin/sentinel', origin: 'operator_probe' });
      }
      toast.success('Probe fired — refreshing the board.');
      await load();
    } catch {
      toast.error('The probe could not reach Sentinel.');
    } finally {
      setProbing(false);
    }
  }, [load]);

  const liveCount = useMemo(() => sessions.filter((s) => s.is_active !== false).length, [sessions]);

  const countries = useMemo(
    () => new Set(sessions.map((s) => s.country).filter(Boolean)).size,
    [sessions],
  );

  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-3">
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Not available</h1>
          <p className="text-sm text-muted-foreground">This area is restricted to platform operators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <Helmet>
        <title>Sentinel — Operator Console</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Sentinel</h1>
            <p className="text-xs text-muted-foreground">
              {liveCount} live · {countries} countries · {blocks.length} active blocks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void runProbe()} disabled={probing}>
            {probing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />}
            Run probe
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} aria-label="Refresh">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </header>


      <Tabs defaultValue="live">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="signups">Sign-ups</TabsTrigger>
          <TabsTrigger value="threats">Threats</TabsTrigger>
          <TabsTrigger value="blocks">Blocks</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-3 space-y-2">
          {sessions.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nobody is online right now.</p>
          )}
          {sessions.map((s) => {
            const hw = (s.hardware ?? {}) as Record<string, unknown>;
            return (
              <Card key={s.id}>
                <CardContent className="space-y-3 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{s.user_id ? s.user_id.slice(0, 8) : 'Visitor'}</span>
                    <Badge variant="outline" className="text-[10px]">{when(s.last_activity_at)}</Badge>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" /> {place(s)} · {s.ip_address ?? 'no IP'}
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/60 pt-3 text-[11px] sm:grid-cols-3">
                    <div><span className="block text-muted-foreground">Browser</span><span>{hardwareValue(s.browser)} {s.browser_version ?? ''}</span></div>
                    <div><span className="block text-muted-foreground">Operating system</span><span>{hardwareValue(s.os)} {s.os_version ?? ''}</span></div>
                    <div><span className="block text-muted-foreground">Device</span><span>{hardwareValue(s.device_type)}</span></div>
                    <div><span className="block text-muted-foreground">CPU</span><span>{hardwareValue(hw.cores, ' cores')}</span></div>
                    <div><span className="block text-muted-foreground">Memory</span><span>{hardwareValue(hw.memoryGb, ' GB')}</span></div>
                    <div><span className="block text-muted-foreground">Screen</span><span>{hardwareValue(hw.screen)}</span></div>
                    <div className="col-span-2 sm:col-span-3">
                      <span className="block text-muted-foreground">GPU</span>
                      <span className="break-words">{hardwareValue(s.device_model ?? hw.gpuModel)}{s.device_vendor ? ` · ${s.device_vendor}` : ''}</span>
                    </div>
                    <div><span className="block text-muted-foreground">Pixel ratio</span><span>{hardwareValue(hw.pixelRatio)}</span></div>
                    <div><span className="block text-muted-foreground">Touch points</span><span>{hardwareValue(hw.touchPoints)}</span></div>
                    <div><span className="block text-muted-foreground">Connection</span><span>{hardwareValue(hw.connection)}</span></div>
                    <div><span className="block text-muted-foreground">Platform</span><span>{hardwareValue(hw.platform)}</span></div>
                    <div><span className="block text-muted-foreground">Time zone</span><span>{hardwareValue(hw.timezone)}</span></div>
                    <div><span className="block text-muted-foreground">Languages</span><span>{hardwareValue(hw.languages)}</span></div>
                    <div><span className="block text-muted-foreground">App mode</span><span>{hw.standalone === true ? 'Installed' : 'Browser'}</span></div>
                    <div className="col-span-2 sm:col-span-3">
                      <span className="block text-muted-foreground">Device fingerprint</span>
                      <span className="break-all font-mono">{hardwareValue(s.device_fingerprint)}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <span className="block text-muted-foreground">User agent</span>
                      <span className="break-words">{hardwareValue(hw.userAgent)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="signups" className="mt-3 space-y-2">
          {signups.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex items-center justify-between p-3 text-sm">
                <span className="font-medium">{row.username ?? row.id.slice(0, 8)}</span>
                <span className="text-xs text-muted-foreground">{when(row.created_at)}</span>
              </CardContent>
            </Card>
          ))}
          {signups.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">No sign-ups yet.</p>
          )}
        </TabsContent>

        <TabsContent value="threats" className="mt-3 space-y-2">
          {threats.map((t) => (
            <Card key={t.id} className={t.blocked ? 'border-red-500/40' : undefined}>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="flex items-center justify-between gap-2 text-sm">
                  <span>{t.threat_type.replace(/_/g, ' ')}</span>
                  <span className="flex items-center gap-1">
                    {t.blocked && <Badge className="bg-red-500/15 text-[10px] text-red-400">blocked</Badge>}
                    <Badge className={`text-[10px] ${severityTone[t.severity] ?? ''}`}>{t.severity}</Badge>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5 p-3 pt-0 text-xs text-muted-foreground">
                <p>
                  {place(t)} · {t.ip_address ?? 'no IP'} · {when(t.created_at)}
                </p>
                <p>
                  {t.user_id ? `user ${t.user_id.slice(0, 8)}` : 'anonymous'} · fp{' '}
                  {t.device_fingerprint?.slice(0, 10) ?? '—'} · {t.page_url ?? '—'}
                </p>
              </CardContent>
            </Card>
          ))}
          {threats.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">No threats recorded.</p>
          )}
        </TabsContent>

        <TabsContent value="blocks" className="mt-3 space-y-2">
          {blocks.map((b) => (
            <Card key={b.id}>
              <CardContent className="space-y-2 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Ban className="h-4 w-4 text-red-400" />
                  <span className="font-medium">
                    {b.user_id ? `user ${b.user_id.slice(0, 8)}` : `device ${b.device_fingerprint?.slice(0, 10)}`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{b.reason}</p>
                <p className="text-[11px] text-muted-foreground">
                  {b.ip_address ?? 'no IP'} · {when(b.created_at)}
                </p>
                <Button size="sm" variant="outline" disabled={releasing === b.id} onClick={() => void release(b.id)}>
                  {releasing === b.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  Lift block
                </Button>
              </CardContent>
            </Card>
          ))}
          {blocks.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">No active blocks.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSentinelPage;
