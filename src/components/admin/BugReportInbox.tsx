/**
 * ADMIN BUG REPORT INBOX
 *
 * Admin-only view of every report filed through /bug-report. Reads and writes
 * are guarded by RLS (`has_role(auth.uid(), 'admin')`), so a non-admin session
 * simply sees nothing even if this component were mounted.
 *
 * Features: keyword / reporter / status / severity filters, pagination, CSV +
 * PDF export, realtime inserts and updates, per-report audit trail and an
 * auto-triage action that asks the Lovable AI gateway for a root-cause fix.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  History,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  exportBugReportsCsv,
  exportBugReportsPdf,
  type ExportableReport,
} from '@/lib/bugReportExport';

const STATUSES = ['open', 'triaged', 'in_progress', 'resolved', 'closed'] as const;
const SEVERITIES = ['low', 'normal', 'high', 'critical'] as const;
const PAGE_SIZE = 10;

const SELECT_COLS =
  'id, created_at, user_id, route, user_message, category, severity, status, admin_note, autofix_state, autofix_summary, autofix_suggestion';

interface AdminReportRow {
  id: string;
  created_at: string;
  user_id: string | null;
  route: string | null;
  user_message: string | null;
  category: string | null;
  severity: string | null;
  status: string | null;
  admin_note: string | null;
  autofix_state: string | null;
  autofix_summary: string | null;
  autofix_suggestion: string | null;
}

interface AuditRow {
  id: string;
  created_at: string;
  actor_label: string | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
}

/** Resolve display names for the reporter column (no FK, so a second read). */
async function loadReporters(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', ids);
  const map: Record<string, string> = {};
  for (const p of data ?? []) {
    map[(p as { id: string }).id] =
      (p as { display_name?: string | null }).display_name ||
      (p as { username?: string | null }).username ||
      (p as { id: string }).id.slice(0, 8);
  }
  return map;
}

export const BugReportInbox: React.FC = () => {
  const [rows, setRows] = useState<AdminReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('all');
  const [severity, setSeverity] = useState<string>('all');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [reporterInput, setReporterInput] = useState('');
  const [reporter, setReporter] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [triagingId, setTriagingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<Record<string, AuditRow[]>>({});
  const [exporting, setExporting] = useState(false);
  const loadRef = useRef<() => void>(() => {});

  // Debounce the free-text filters so typing does not hammer the database.
  useEffect(() => {
    const t = setTimeout(() => {
      setKeyword(keywordInput.trim());
      setReporterInput((v) => v);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [keywordInput]);

  useEffect(() => {
    const t = setTimeout(() => {
      setReporter(reporterInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [reporterInput]);

  /** Turn the reporter search box into a user_id filter list. */
  const resolveReporterIds = useCallback(async (): Promise<string[] | null> => {
    if (!reporter) return null;
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .or(`username.ilike.%${reporter}%,display_name.ilike.%${reporter}%`)
      .limit(200);
    const ids = (data ?? []).map((p) => (p as { id: string }).id);
    if (/^[0-9a-f-]{8,}$/i.test(reporter)) ids.push(reporter);
    return ids;
  }, [reporter]);

  const buildQuery = useCallback(
    async (from: number, to: number) => {
      let query = supabase
        .from('platform_error_logs')
        .select(SELECT_COLS, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (status !== 'all') query = query.eq('status', status);
      if (severity !== 'all') query = query.eq('severity', severity);
      if (keyword) query = query.or(`user_message.ilike.%${keyword}%,route.ilike.%${keyword}%`);
      const ids = await resolveReporterIds();
      if (ids) query = query.in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      return query;
    },
    [status, severity, keyword, resolveReporterIds],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const query = await buildQuery(from, from + PAGE_SIZE - 1);
    const { data, error, count } = await query;
    if (error) {
      console.error('[BugReportInbox] load failed', error);
      toast.error('Could not load the report inbox.');
    } else {
      const list = (data ?? []) as AdminReportRow[];
      setRows(list);
      setTotal(count ?? list.length);
      setNames(await loadReporters([...new Set(list.map((r) => r.user_id).filter(Boolean) as string[])]));
    }
    setLoading(false);
  }, [buildQuery, page]);

  useEffect(() => {
    loadRef.current = () => void load();
    void load();
  }, [load]);

  // Realtime: new reports and status changes land without a manual refresh.
  useEffect(() => {
    const channel = supabase
      .channel('admin-bug-report-inbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_error_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') toast.info('New bug report received.');
          loadRef.current();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const exportable = useCallback(
    (list: AdminReportRow[]): ExportableReport[] =>
      list.map((r) => ({
        id: r.id,
        created_at: r.created_at,
        reporter: r.user_id ? names[r.user_id] ?? r.user_id : 'anonymous',
        route: r.route,
        category: r.category,
        severity: r.severity,
        status: r.status,
        user_message: r.user_message,
        admin_note: r.admin_note,
        autofix_summary: r.autofix_summary,
      })),
    [names],
  );

  /** Exports respect the active filters, not just the visible page. */
  const collectForExport = useCallback(async (): Promise<ExportableReport[]> => {
    const query = await buildQuery(0, 999);
    const { data, error } = await query;
    if (error) {
      console.error('[BugReportInbox] export query failed', error);
      toast.error('Could not gather the reports to export.');
      return [];
    }
    const list = (data ?? []) as AdminReportRow[];
    const map = await loadReporters([...new Set(list.map((r) => r.user_id).filter(Boolean) as string[])]);
    return list.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      reporter: r.user_id ? map[r.user_id] ?? r.user_id : 'anonymous',
      route: r.route,
      category: r.category,
      severity: r.severity,
      status: r.status,
      user_message: r.user_message,
      admin_note: r.admin_note,
      autofix_summary: r.autofix_summary,
    }));
  }, [buildQuery]);

  const doExport = async (kind: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const list = await collectForExport();
      if (list.length === 0) {
        toast.error('Nothing to export for these filters.');
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === 'csv') exportBugReportsCsv(list, `bug-reports-${stamp}.csv`);
      else await exportBugReportsPdf(list, `bug-reports-${stamp}.pdf`);
      toast.success(`Exported ${list.length} report(s).`);
    } catch (e) {
      console.error('[BugReportInbox] export failed', e);
      toast.error('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  /** All admin writes go through the edge function so audit + email always run. */
  const update = async (id: string, patch: { status?: string; admin_note?: string }) => {
    setSavingId(id);
    const { data, error } = await supabase.functions.invoke('bug-report-pipeline', {
      body: { action: 'admin_action', report_id: id, ...patch },
    });
    setSavingId(null);
    if (error || (data && data.ok === false)) {
      console.error('[BugReportInbox] update failed', error ?? data);
      toast.error('Could not update the report.');
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setAudit((prev) => ({ ...prev, [id]: [] }));
    toast.success(
      data?.email?.sent ? 'Report updated — reporter emailed.' : 'Report updated.',
    );
  };

  const triage = async (id: string) => {
    setTriagingId(id);
    const { data, error } = await supabase.functions.invoke('bug-report-pipeline', {
      body: { action: 'triage', report_id: id },
    });
    setTriagingId(null);
    if (error || (data && data.ok === false)) {
      console.error('[BugReportInbox] triage failed', error ?? data);
      toast.error('Auto-triage could not run.');
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              autofix_state: 'proposed',
              autofix_summary: data.summary,
              autofix_suggestion: data.suggestion,
              status: r.status === 'open' ? 'triaged' : r.status,
            }
          : r,
      ),
    );
    toast.success('Auto-triage complete.');
  };

  const toggleAudit = async (id: string) => {
    if (audit[id]?.length) {
      setAudit((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    const { data, error } = await supabase
      .from('bug_report_audit_log')
      .select('id, created_at, actor_label, action, from_status, to_status, note')
      .eq('report_id', id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('[BugReportInbox] audit load failed', error);
      toast.error('Could not load the audit trail.');
      return;
    }
    const list = (data ?? []) as AuditRow[];
    if (list.length === 0) toast.info('No audit entries yet for this report.');
    setAudit((prev) => ({ ...prev, [id]: list }));
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const summary = useMemo(
    () => `${total} report${total === 1 ? '' : 's'} · page ${page + 1} of ${pageCount}`,
    [total, page, pageCount],
  );

  return (
    <Card className="mt-10">
      <CardHeader className="space-y-3">
        <div className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="h-4 w-4" aria-hidden="true" /> Report inbox
            </CardTitle>
            <CardDescription>{summary} · live updates on</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={exporting} onClick={() => void doExport('csv')}>
              <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
            <Button variant="ghost" size="sm" disabled={exporting} onClick={() => void doExport('pdf')}>
              <FileText className="mr-1 h-4 w-4" /> PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-9 pl-8"
              placeholder="Search text or page…"
              aria-label="Search reports by keyword"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
            />
          </div>
          <Input
            className="h-9"
            placeholder="Reporter name or ID…"
            aria-label="Filter by reporter"
            value={reporterInput}
            onChange={(e) => setReporterInput(e.target.value)}
          />
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={severity}
            onValueChange={(v) => {
              setSeverity(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9" aria-label="Filter by severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports match these filters.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{(r.status ?? 'open').replace('_', ' ')}</Badge>
                {r.category ? <Badge variant="secondary">{r.category}</Badge> : null}
                {r.severity ? <Badge variant="secondary">{r.severity}</Badge> : null}
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                <span className="text-muted-foreground">
                  · {r.user_id ? names[r.user_id] ?? r.user_id.slice(0, 8) : 'anonymous'}
                </span>
                {r.route ? <span className="text-muted-foreground">· {r.route}</span> : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{r.user_message || '(no description)'}</p>

              {r.autofix_summary ? (
                <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">
                  <p className="font-medium">Auto-triage · {r.autofix_state}</p>
                  <p className="mt-1 text-muted-foreground">{r.autofix_summary}</p>
                  {r.autofix_suggestion ? (
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{r.autofix_suggestion}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select value={r.status ?? 'open'} onValueChange={(v) => void update(r.id, { status: v })}>
                  <SelectTrigger className="h-8 w-[150px]" aria-label="Set status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="h-8 min-w-[180px] flex-1"
                  placeholder="Note back to the reporter…"
                  value={notes[r.id] ?? r.admin_note ?? ''}
                  onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                  maxLength={500}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={savingId === r.id}
                  onClick={() => void update(r.id, { admin_note: notes[r.id] ?? r.admin_note ?? '' })}
                >
                  {savingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save note'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={triagingId === r.id}
                  onClick={() => void triage(r.id)}
                >
                  {triagingId === r.id ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-1 h-4 w-4" />
                  )}
                  Auto-fix
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void toggleAudit(r.id)}>
                  <History className="mr-1 h-4 w-4" /> Audit
                </Button>
              </div>

              {audit[r.id]?.length ? (
                <ul className="mt-3 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                  {audit[r.id].map((a) => (
                    <li key={a.id}>
                      <span className="text-foreground">{a.actor_label ?? 'system'}</span> · {a.action}
                      {a.from_status || a.to_status ? ` · ${a.from_status ?? '—'} → ${a.to_status ?? '—'}` : ''} ·{' '}
                      {new Date(a.created_at).toLocaleString()}
                      {a.note ? ` · “${a.note}”` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">{summary}</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page + 1 >= pageCount || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BugReportInbox;
