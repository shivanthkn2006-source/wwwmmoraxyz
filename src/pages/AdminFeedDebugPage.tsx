import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { checkRootAdminStatus } from '@/components/security/securityConfig';
import { getPostsStorageObjectPath } from '@/lib/mediaUtils';
import { toast } from 'sonner';

type FeedLogRow = {
  id: string;
  created_at: string;
  status: string | null;
  message: string | null;
  error_code: string | null;
  route: string | null;
  context: Record<string, any> | null;
};

const AdminFeedDebugPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<FeedLogRow[]>([]);
  const [loading, setLoading] = useState(false);

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

  const refresh = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('feed_diagnostics_log')
        .select('id, created_at, status, message, error_code, route, context')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setRows(((data || []) as FeedLogRow[]).filter((row) => {
        const step = String(row.context?.step || '').toLowerCase();
        return row.route === '/home' || step.includes('loop') || step.includes('post') || step.includes('feed');
      }));
    } catch (err: any) {
      toast.error(err?.message || 'Could not load feed diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (allowed) refresh(); }, [allowed]);

  const grouped = useMemo(() => ({
    total: rows.length,
    loop: rows.filter(r => String(r.context?.step || '').includes('loops')).length,
    post: rows.filter(r => String(r.context?.step || '').includes('post')).length,
    decode: rows.filter(r => String(r.context?.decode_status || '')).length,
  }), [rows]);

  if (allowed === null) return <div className="p-8 text-muted-foreground">Verifying admin access…</div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Feed Debug</h1>
            <p className="text-sm text-muted-foreground">Recent loops/post errors with media links and decode status</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total" value={grouped.total} />
        <Stat label="Loops" value={grouped.loop} />
        <Stat label="Posts" value={grouped.post} />
        <Stat label="Decode" value={grouped.decode} />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Post</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Media</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No feed errors logged yet.</TableCell>
              </TableRow>
            ) : rows.map((row) => {
              const ctx = row.context || {};
              const mediaUrl = ctx.media_url as string | undefined;
              const posterUrl = ctx.poster_url as string | undefined;
              const storagePath = (ctx.storage_path as string | undefined) || getPostsStorageObjectPath(mediaUrl);
              return (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-xs">{ctx.step || row.route || 'feed'}</div>
                    {ctx.media_type && <Badge variant="outline" className="mt-1 text-[10px]">{ctx.media_type}</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {ctx.post_id ? String(ctx.post_id).slice(0, 8) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'error' ? 'destructive' : 'secondary'}>{ctx.decode_status || row.status || 'unknown'}</Badge>
                    {row.error_code && <div className="mt-1 text-xs text-destructive">{row.error_code}</div>}
                  </TableCell>
                  <TableCell className="max-w-[220px] space-y-1 text-xs">
                    {mediaUrl && <DebugLink href={mediaUrl} label="media" />}
                    {posterUrl && <DebugLink href={posterUrl} label="poster" />}
                    {storagePath && <div className="break-all font-mono text-muted-foreground">{storagePath}</div>}
                  </TableCell>
                  <TableCell className="max-w-[320px] break-words text-xs">{row.message || '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <Card className="p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-semibold tabular-nums">{value}</div>
  </Card>
);

const DebugLink = ({ href, label }: { href: string; label: string }) => (
  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
    {label} <ExternalLink className="h-3 w-3" />
  </a>
);

export default AdminFeedDebugPage;