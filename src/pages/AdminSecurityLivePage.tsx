/**
 * Live security dashboard (admin only). Refreshes every 30s and on any new
 * threat event. Numbers come from the admin-only admin_security_overview().
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';

type Overview = {
  tables_total: number;
  tables_without_rls: string[];
  tables_rls_no_policy: string[];
  open_read_policies: number;
  admins: number;
  threats_24h: number;
  blocks_active: number;
  security_logs_24h: number;
  vr_world_events_24h: number;
  generated_at: string;
};

export default function AdminSecurityLivePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [threats, setThreats] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [ov, th] = await Promise.all([
      (supabase as any).rpc('admin_security_overview'),
      (supabase as any).from('sentinel_threat_events').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    if (ov.error) setError(ov.error.message);
    else { setError(null); setData(ov.data as Overview); }
    setThreats(th.data ?? []);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 30_000);
    const ch = supabase
      .channel('admin-security-live')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'sentinel_threat_events' }, () => void load())
      .subscribe();
    return () => { clearInterval(t); void supabase.removeChannel(ch); };
  }, [load]);

  const healthy = data && data.tables_without_rls.length === 0 && data.admins === 1;
  const stat = (label: string, value: number | string, bad = false) => (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${bad ? 'text-destructive' : 'text-foreground'}`}>{value}</div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {healthy ? <ShieldCheck className="text-primary" /> : <ShieldAlert className="text-destructive" />}
          <h1 className="text-xl font-semibold">Live security</h1>
          {data && <Badge variant="outline">Updated {new Date(data.generated_at).toLocaleTimeString()}</Badge>}
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </header>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stat('Tables', data.tables_total)}
            {stat('Tables without protection', data.tables_without_rls.length, data.tables_without_rls.length > 0)}
            {stat('Locked tables with no rules', data.tables_rls_no_policy.length)}
            {stat('Open-read rules', data.open_read_policies)}
            {stat('Admins', data.admins, data.admins !== 1)}
            {stat('Threats (24h)', data.threats_24h, data.threats_24h > 0)}
            {stat('Active blocks', data.blocks_active)}
            {stat('VR world commands (24h)', data.vr_world_events_24h)}
          </div>
          {data.tables_without_rls.length > 0 && (
            <Card className="p-4 text-sm"><b>Unprotected:</b> {data.tables_without_rls.join(', ')}</Card>
          )}
        </>
      )}
      <Card className="p-4">
        <h2 className="font-medium mb-2">Latest threats</h2>
        {threats.length === 0 ? <p className="text-sm text-muted-foreground">None recorded.</p> : (
          <ul className="space-y-1 text-sm">
            {threats.map((t) => (
              <li key={t.id} className="flex justify-between gap-2 border-b border-border py-1">
                <span className="truncate">{t.threat_type ?? t.event_type ?? 'event'} · {t.severity ?? ''}</span>
                <span className="text-muted-foreground shrink-0">{new Date(t.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
