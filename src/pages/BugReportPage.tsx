/**
 * BUG REPORT PAGE
 *
 * The real destination behind the floating bug icon. Users file a report with
 * a category and severity, and see every report they have already filed with
 * its current status. Technical context (route, device, recent app state) is
 * attached silently, exactly as the floating reporter does.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bug, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformStore } from '@/store/usePlatformStore';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import BugReportInbox from '@/components/admin/BugReportInbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CATEGORIES = [
  { value: 'bug', label: 'Something is broken' },
  { value: 'visual', label: 'Layout or visual glitch' },
  { value: 'performance', label: 'Slow or unresponsive' },
  { value: 'content', label: 'Wrong or missing content' },
  { value: 'idea', label: 'Suggestion / idea' },
] as const;

const SEVERITIES = [
  { value: 'low', label: 'Low — cosmetic' },
  { value: 'normal', label: 'Normal — annoying' },
  { value: 'high', label: 'High — blocks me' },
  { value: 'critical', label: 'Critical — data or security' },
] as const;

interface ReportRow {
  id: string;
  created_at: string;
  route: string | null;
  user_message: string | null;
  category: string | null;
  severity: string | null;
  status: string | null;
  admin_note: string | null;
}

function deviceInfo() {
  if (typeof navigator === 'undefined') return {};
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string } };
  return {
    userAgent: nav.userAgent,
    language: nav.language,
    hardwareConcurrency: nav.hardwareConcurrency ?? null,
    deviceMemory: nav.deviceMemory ?? null,
    connection: nav.connection?.effectiveType ?? null,
    viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null,
    dpr: typeof window !== 'undefined' ? window.devicePixelRatio : null,
    online: nav.onLine,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

const STATUS_TONE: Record<string, string> = {
  open: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  triaged: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  in_progress: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  closed: 'bg-muted text-muted-foreground border-border',
};

export const BugReportPage: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [where, setWhere] = useState('');
  const [category, setCategory] = useState<string>('bug');
  const [severity, setSeverity] = useState<string>('normal');
  const [sending, setSending] = useState(false);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = useIsAdmin();

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('platform_error_logs')
      .select('id, created_at, route, user_message, category, severity, status, admin_note')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('[BugReportPage] load failed', error);
      toast.error('Could not load your reports.');
    } else {
      setRows((data ?? []) as ReportRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) void load(uid);
      else setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [load]);

  const canSubmit = useMemo(() => Boolean(userId) && message.trim().length >= 5 && !sending, [userId, message, sending]);

  const submit = async () => {
    if (!userId) {
      toast.error('Sign in to send a report.');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('platform_error_logs').insert({
        user_id: userId,
        route: where.trim() || (typeof window !== 'undefined' ? window.location.pathname : null),
        device_info: deviceInfo(),
        zustand_state_snapshot: JSON.parse(
          JSON.stringify({ current: usePlatformStore.getState().voiceStatus ?? null }),
        ),
        user_message: message.trim(),
        category,
        severity,
      });
      if (error) throw error;
      toast.success('Report sent. Thank you — we captured the technical details.');
      setMessage('');
      setWhere('');
      await load(userId);
    } catch (e) {
      console.error('[BugReportPage] submit failed', e);
      toast.error('Could not send the report. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-32">
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/home" aria-label="Back to home feed">
            <ArrowLeft className="mr-1 h-4 w-4" /> Home
          </Link>
        </Button>
      </div>

      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <Bug className="h-5 w-5" aria-hidden="true" /> Report a problem
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Describe what happened in your own words. We attach the page, your device details and the
        app's recent state automatically, so nothing has to be explained twice.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">New report</CardTitle>
          <CardDescription>Five characters minimum. Be as specific as you like.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="bug-category">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="bug-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="bug-severity">
                Severity
              </label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger id="bug-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="bug-where">
              Where did it happen? (optional)
            </label>
            <Input
              id="bug-where"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="/home, growth insights, Zoe orb…"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="bug-message">
              What went wrong?
            </label>
            <Textarea
              id="bug-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. the feed went blank after I liked a post"
              rows={6}
              maxLength={2000}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={!canSubmit}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send report
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your reports</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => userId && load(userId)}
          disabled={!userId || loading}
        >
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No reports yet. Anything you send will appear here with its status.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className={STATUS_TONE[r.status ?? 'open'] ?? ''}>
                      {(r.status ?? 'open').replace('_', ' ')}
                    </Badge>
                    {r.category ? <Badge variant="secondary">{r.category}</Badge> : null}
                    {r.severity ? <Badge variant="secondary">{r.severity}</Badge> : null}
                    <span className="text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    {r.route ? <span className="text-muted-foreground">· {r.route}</span> : null}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{r.user_message || '(no description)'}</p>
                  {r.admin_note ? (
                    <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                      Team note: {r.admin_note}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {isAdmin ? <BugReportInbox /> : null}
    </div>
  );
};

export default BugReportPage;
