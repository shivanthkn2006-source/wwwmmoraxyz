/**
 * /admin — STAFF-ONLY DASHBOARD
 *
 * One screen for staff: run the God Mode platform scan (client checks plus the
 * admin-only `zoe-god-mode` function, which answers 403 for everyone else),
 * see live platform health counts, and jump to the other admin surfaces.
 *
 * Access is gated on `has_role(uid,'admin')`; row-level security and the edge
 * function's own claim check remain the real boundary underneath. The spoken
 * command "Zoe run god mode scan" navigates here and fires `zoe-run-god-scan`,
 * which this page listens for.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Loader2, RefreshCw, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageSeo from '@/components/seo/PageSeo';
import {
  runGodModePlatformScan,
  formatReportMarkdown,
  type PlatformScanReport,
  type ScanProgress,
} from '@/features/zoe-godmode/platformScan';

const ADMIN_LINKS: Array<{ path: string; label: string; hint: string }> = [
  { path: '/admin/overview', label: 'Overview', hint: 'Real counts across the platform' },
  { path: '/admin/memory', label: "Zoe's memory", hint: 'Preferences, timeline and orb history per member' },
  { path: '/admin/health', label: 'Health', hint: 'Edge functions and uptime' },
  { path: '/admin/invites', label: 'Invites', hint: 'Beta codes and referrals' },
  { path: '/admin/sentinel', label: 'Sentinel', hint: 'Threats, blocks and night watch' },
  { path: '/admin/search-index', label: 'Search index', hint: 'Zoe search queue health' },
  { path: '/admin/control-panel', label: 'Control panel', hint: 'Feature flags and switches' },
  { path: '/zoe/brain', label: "Zoe's brain", hint: 'Answer latency and API status' },
];

type ServerScan = {
  overallHealth?: number;
  overallStatus?: string;
  results?: Array<{ category: string; status: string; message: string }>;
} | null;

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [report, setReport] = useState<PlatformScanReport | null>(null);
  const [server, setServer] = useState<ServerScan>(null);
  const [serverNote, setServerNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    void supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' })
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  const runScan = useCallback(async () => {
    if (!user || running) return;
    setRunning(true);
    setServerNote(null);
    setProgress(null);
    try {
      const clientReport = await runGodModePlatformScan((p) => setProgress(p));
      setReport(clientReport);
    } catch (error) {
      setServerNote(error instanceof Error ? error.message : 'Client scan failed.');
    }
    try {
      const { data, error } = await supabase.functions.invoke('zoe-god-mode', {
        body: { action: 'full_scan', userId: user.id, options: { autoFix: false, verbose: false } },
      });
      if (error) {
        setServer(null);
        setServerNote(`Server scan unavailable: ${error.message}`);
      } else {
        setServer((data as { scan?: ServerScan })?.scan ?? (data as ServerScan));
      }
    } catch (error) {
      setServer(null);
      setServerNote(error instanceof Error ? error.message : 'Server scan failed.');
    }
    setRunning(false);
  }, [user, running]);

  // "Zoe run god mode scan" navigates here and fires this event.
  useEffect(() => {
    const onRun = () => { void runScan(); };
    window.addEventListener('zoe-run-god-scan', onRun as EventListener);
    return () => window.removeEventListener('zoe-run-god-scan', onRun as EventListener);
  }, [runScan]);

  const copyReport = useCallback(async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(formatReportMarkdown(report));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }, [report]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <PageSeo title="Staff dashboard" description="Staff-only platform health and scans." />
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <h1 className="text-lg font-medium">Staff only</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          This dashboard is for the platform owner. Your account does not have staff access.
        </p>
        <Link to="/home"><Button variant="outline" size="sm">Back home</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <PageSeo title="Staff dashboard" description="Run the God Mode scan and watch platform health." />
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/home" aria-label="Back home"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="text-xl font-medium">Staff dashboard</h1>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> God Mode scan
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void runScan()} disabled={running}>
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">{running ? 'Scanning' : 'Run scan'}</span>
              </Button>
              {report && (
                <Button size="sm" variant="outline" onClick={() => void copyReport()}>
                  {copied ? 'Copied' : 'Copy report'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {running && progress && (
              <p className="text-muted-foreground">{progress.current ?? 'Checking…'} ({progress.completed}/{progress.total})</p>
            )}
            {!running && !report && (
              <p className="text-muted-foreground">
                Nothing scanned yet. Press Run scan, or say “Zoe run god mode scan”.
              </p>
            )}
            {report && (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  {report.checks.filter((r) => r.status === 'pass').length} passed ·{' '}
                  {report.checks.filter((r) => r.status === 'warn').length} warnings ·{' '}
                  {report.checks.filter((r) => r.status === 'fail').length} failing
                </p>
                <ul className="space-y-1">
                  {report.checks
                    .filter((r) => r.status !== 'pass')
                    .slice(0, 12)
                    .map((r, i) => (
                      <li key={`${r.id}-${i}`} className="text-muted-foreground">
                        {r.status === 'fail' ? '✗' : '⚠'} {r.label} — {r.detail ?? 'no detail'}
                      </li>
                    ))}
                </ul>
              </div>
            )}
            {server && (
              <p className="text-muted-foreground">
                Server scan: {server.overallStatus ?? 'unknown'}
                {typeof server.overallHealth === 'number' ? ` · ${Math.round(server.overallHealth)}%` : ''}
              </p>
            )}
            {serverNote && <p className="text-muted-foreground">{serverNote}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Platform health</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {ADMIN_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="rounded-md border border-border px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                <div className="text-sm">{link.label}</div>
                <div className="text-xs text-muted-foreground">{link.hint}</div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
