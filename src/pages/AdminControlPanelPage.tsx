/**
 * ADMIN CONTROL PANEL (admin-only)
 *
 * Three operational surfaces in one page:
 *   1. User activity — sign-ups, last activity, post/loop counts.
 *   2. DHF generation logs — the raw run log with cache hits and errors.
 *   3. Moderation queue — abuse/spam reports filed by members, with
 *      review actions.
 *
 * Every read here is protected by row-level security: a non-admin gets empty
 * result sets, and the page says so plainly rather than pretending to work.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Loader2, ShieldAlert, Users, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EssaySchedulerPanel from '@/components/admin/EssaySchedulerPanel';

interface ActivityRow {
  userId: string;
  username: string;
  createdAt: string | null;
  lastSeen: string | null;
  posts: number;
  /** Birth details are the gate for personalised DHF Daily Compass cards. */
  birthDate: string | null;
}

interface RunRow {
  id: string;
  userId: string | null;
  postDate: string | null;
  slots: number | null;
  cacheHit: boolean | null;
  error: string | null;
  createdAt: string;
}

interface ReportRow {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  notes: string | null;
  status: string;
  /** Real moderator-set flag, persisted on the row (not a text guess). */
  is_spam: boolean;
  created_at: string;
}


const statusTone: Record<string, string> = {
  open: 'bg-red-500/15 text-red-400',
  reviewing: 'bg-amber-500/15 text-amber-400',
  actioned: 'bg-emerald-500/15 text-emerald-400',
  dismissed: 'bg-muted text-muted-foreground',
};

export default function AdminControlPanelPage() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [reportFilter, setReportFilter] = useState<'all' | 'open' | 'spam' | 'reviewing' | 'actioned' | 'dismissed'>('open');


  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        setDenied(true);
        return;
      }
      const { data: adminRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', auth.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (!adminRow) {
        setDenied(true);
        return;
      }
      setDenied(false);
      setAdminId(auth.user.id);

      const [profilesRes, postsRes, runsRes, reportsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, username, created_at, updated_at, date_of_birth, birth_date')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('posts').select('user_id').limit(5000),
        supabase
          .from('dhf_generation_runs')
          .select('id, user_id, post_date, slots_generated, cache_hit, error, created_at')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('content_reports')
          .select('id, reporter_id, target_type, target_id, reason, notes, status, is_spam, created_at')
          .order('created_at', { ascending: false })
          .limit(200),
      ]);

      const postCounts = new Map<string, number>();
      (postsRes.data ?? []).forEach((p: { user_id: string | null }) => {
        if (p.user_id) postCounts.set(p.user_id, (postCounts.get(p.user_id) ?? 0) + 1);
      });

      setActivity(
        (profilesRes.data ?? []).map((p: Record<string, unknown>) => ({
          userId: String(p.user_id),
          username: (p.username as string) ?? '—',
          createdAt: (p.created_at as string) ?? null,
          lastSeen: (p.updated_at as string) ?? null,
          posts: postCounts.get(String(p.user_id)) ?? 0,
          birthDate: ((p.date_of_birth as string) ?? (p.birth_date as string)) || null,
        })),
      );

      setRuns(
        (runsRes.data ?? []).map((r: Record<string, unknown>) => ({
          id: String(r.id),
          userId: (r.user_id as string) ?? null,
          postDate: (r.post_date as string) ?? null,
          slots: (r.slots_generated as number) ?? null,
          cacheHit: (r.cache_hit as boolean) ?? null,
          error: (r.error as string) ?? null,
          createdAt: String(r.created_at),
        })),
      );

      setReports((reportsRes.data as ReportRow[]) ?? []);
    } catch (error) {
      console.error('[AdminControlPanel] load failed', error);
      toast.error('Could not load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setReportStatus = async (id: string, status: 'reviewing' | 'actioned' | 'dismissed') => {
    setBusy(id);
    const { error } = await supabase
      .from('content_reports')
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: adminId })
      .eq('id', id);
    setBusy(null);
    if (error) {
      toast.error(`Update failed: ${error.message}`);
      return;
    }
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`Report marked ${status}.`);
  };

  /**
   * The spam flag is a real persisted column, not a guess from the reason text.
   * Flagging also moves an untouched report into review so the queue reflects
   * that a human has looked at it.
   */
  const toggleSpam = async (report: ReportRow) => {
    const next = !report.is_spam;
    setBusy(report.id);
    const { error } = await supabase
      .from('content_reports')
      .update({
        is_spam: next,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        ...(next && report.status === 'open' ? { status: 'reviewing' } : {}),
      })
      .eq('id', report.id);
    setBusy(null);
    if (error) {
      toast.error(`Spam flag failed: ${error.message}`);
      return;
    }
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id
          ? { ...r, is_spam: next, status: next && r.status === 'open' ? 'reviewing' : r.status }
          : r,
      ),
    );
    toast.success(next ? 'Flagged as spam.' : 'Spam flag removed.');
  };

  const stats = useMemo(
    () => ({
      members: activity.length,
      active7d: activity.filter(
        (a) => a.lastSeen && Date.now() - new Date(a.lastSeen).getTime() < 7 * 864e5,
      ).length,
      missingBirth: activity.filter((a) => !a.birthDate).length,
      failedRuns: runs.filter((r) => r.error).length,
      openReports: reports.filter((r) => r.status === 'open').length,
    }),
    [activity, runs, reports],
  );

  /** Flagged rows first; unflagged rows whose reason reads like spam are only a hint. */
  const isSpam = (r: ReportRow) => r.is_spam || /spam|scam|bot/i.test(r.reason);

  const visibleReports = useMemo(() => {
    if (reportFilter === 'all') return reports;
    if (reportFilter === 'spam') return reports.filter(isSpam);
    return reports.filter((r) => r.status === reportFilter);
  }, [reports, reportFilter]);


  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Helmet>
        <title>Admin Control Panel | M'Mora</title>
        <meta name="description" content="Admin view of member activity, DHF generation logs and abuse reports." />
      </Helmet>

      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/sentinel">Sentinel</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>

        </div>

        <h1 className="text-xl font-semibold">Admin Control Panel</h1>

        {denied ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              This page is restricted to platform admins. Your account does not have the admin role.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: 'Members', value: stats.members, icon: Users },
                { label: 'Active 7d', value: stats.active7d, icon: Activity },
                { label: 'No birth details', value: stats.missingBirth, icon: ShieldAlert },
                { label: 'Failed DHF runs', value: stats.failedRuns, icon: ShieldAlert },
                { label: 'Open reports', value: stats.openReports, icon: ShieldAlert },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold leading-none">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="activity">
              <TabsList>
                <TabsTrigger value="activity">User activity</TabsTrigger>
                <TabsTrigger value="dhf">DHF logs</TabsTrigger>
                <TabsTrigger value="reports">Moderation</TabsTrigger>
                <TabsTrigger value="essays">Essays</TabsTrigger>
              </TabsList>

              <TabsContent value="activity">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Members</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto p-0">
                    <table className="w-full text-left text-xs">
                      <thead className="text-muted-foreground">
                        <tr><th className="p-3">Member</th><th className="p-3">Joined</th><th className="p-3">Last active</th><th className="p-3">Posts</th><th className="p-3">Birth details</th></tr>
                      </thead>
                      <tbody>
                        {activity.map((row) => (
                          <tr key={row.userId} className="border-t border-border/50">
                            <td className="p-3 font-medium">{row.username}</td>
                            <td className="p-3">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</td>
                            <td className="p-3">{row.lastSeen ? new Date(row.lastSeen).toLocaleString() : '—'}</td>
                            <td className="p-3">{row.posts}</td>
                            <td className="p-3">
                              {row.birthDate ? (
                                <Badge className="bg-emerald-500/15 text-emerald-400">{row.birthDate}</Badge>
                              ) : (
                                <Badge className="bg-amber-500/15 text-amber-400">missing</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!activity.length && !loading && (
                          <tr><td className="p-4 text-muted-foreground" colSpan={5}>No members visible.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dhf">
                <Card>
                  <CardHeader><CardTitle className="text-sm">DHF generation runs</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto p-0">
                    <table className="w-full text-left text-xs">
                      <thead className="text-muted-foreground">
                        <tr><th className="p-3">When</th><th className="p-3">Member</th><th className="p-3">Date</th><th className="p-3">Slots</th><th className="p-3">Result</th></tr>
                      </thead>
                      <tbody>
                        {runs.map((run) => (
                          <tr key={run.id} className="border-t border-border/50">
                            <td className="p-3">{new Date(run.createdAt).toLocaleString()}</td>
                            <td className="p-3 font-mono">{run.userId?.slice(0, 8) ?? '—'}</td>
                            <td className="p-3">{run.postDate ?? '—'}</td>
                            <td className="p-3">{run.slots ?? 0}</td>
                            <td className="p-3">
                              {run.error ? (
                                <Badge className="bg-red-500/15 text-red-400">{run.error.slice(0, 60)}</Badge>
                              ) : run.cacheHit ? (
                                <Badge className="bg-sky-500/15 text-sky-400">cached</Badge>
                              ) : (
                                <Badge className="bg-emerald-500/15 text-emerald-400">generated</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!runs.length && !loading && (
                          <tr><td className="p-4 text-muted-foreground" colSpan={5}>No runs logged yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="essays">
                <EssaySchedulerPanel
                  adminId={adminId}
                  members={activity.map((row) => ({ userId: row.userId, username: row.username }))}
                />
              </TabsContent>

              <TabsContent value="reports">
                <Card>
                  <CardHeader className="space-y-3">
                    <CardTitle className="text-sm">Spam &amp; abuse reports</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      {(['open', 'spam', 'reviewing', 'actioned', 'dismissed', 'all'] as const).map((key) => {
                        const count =
                          key === 'all'
                            ? reports.length
                            : key === 'spam'
                              ? reports.filter(isSpam).length
                              : reports.filter((r) => r.status === key).length;
                        return (
                          <Button
                            key={key}
                            size="sm"
                            variant={reportFilter === key ? 'default' : 'outline'}
                            onClick={() => setReportFilter(key)}
                          >
                            {key} ({count})
                          </Button>
                        );
                      })}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {visibleReports.map((report) => (
                      <div key={report.id} className="rounded-lg border border-border/60 p-3 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={statusTone[report.status] ?? ''}>{report.status}</Badge>
                          <span className="font-medium">{report.target_type}</span>
                          <span className="font-mono text-muted-foreground">{report.target_id.slice(0, 8)}</span>
                          {report.is_spam ? (
                            <Badge className="bg-orange-500/15 text-orange-400">spam</Badge>
                          ) : (
                            /spam|scam|bot/i.test(report.reason) && (
                              <Badge className="bg-muted text-muted-foreground">looks like spam</Badge>
                            )
                          )}
                          {report.target_type === 'post' && (
                            <Link
                              to={`/?post=${report.target_id}`}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              view
                            </Link>
                          )}
                          <span className="ml-auto text-muted-foreground">{new Date(report.created_at).toLocaleString()}</span>
                        </div>
                        <p className="mt-2">{report.reason}</p>
                        {report.notes && <p className="mt-1 text-muted-foreground">{report.notes}</p>}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          reported by <span className="font-mono">{report.reporter_id.slice(0, 8)}</span>
                        </p>
                        <div className="mt-2 flex gap-2">
                          {(['reviewing', 'actioned', 'dismissed'] as const).map((next) => (
                            <Button
                              key={next}
                              size="sm"
                              variant="outline"
                              disabled={busy === report.id || report.status === next}
                              onClick={() => void setReportStatus(report.id, next)}
                            >
                              {next}
                            </Button>
                          ))}
                          <Button
                            size="sm"
                            variant={report.is_spam ? 'default' : 'outline'}
                            disabled={busy === report.id}
                            onClick={() => void toggleSpam(report)}
                          >
                            {report.is_spam ? 'unflag spam' : 'flag spam'}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {!visibleReports.length && !loading && (
                      <p className="p-2 text-xs text-muted-foreground">
                        {reports.length ? 'No reports match this filter.' : 'No reports filed. Nothing to moderate.'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
