/**
 * ADMIN BUG REPORT INBOX
 *
 * Admin-only view of every report filed through /bug-report. Reads and writes
 * are guarded by RLS (`has_role(auth.uid(), 'admin')`), so a non-admin session
 * simply sees nothing even if this component were mounted.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Inbox, Loader2, RefreshCw } from 'lucide-react';
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

const STATUSES = ['open', 'triaged', 'in_progress', 'resolved', 'closed'] as const;

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
}

export const BugReportInbox: React.FC = () => {
  const [rows, setRows] = useState<AdminReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('platform_error_logs')
      .select('id, created_at, user_id, route, user_message, category, severity, status, admin_note')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filter !== 'all') query = query.eq('status', filter);
    const { data, error } = await query;
    if (error) {
      console.error('[BugReportInbox] load failed', error);
      toast.error('Could not load the report inbox.');
    } else {
      setRows((data ?? []) as AdminReportRow[]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (id: string, patch: { status?: string; admin_note?: string }) => {
    setSavingId(id);
    const { error } = await supabase.from('platform_error_logs').update(patch).eq('id', id);
    setSavingId(null);
    if (error) {
      console.error('[BugReportInbox] update failed', error);
      toast.error('Could not update the report.');
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    toast.success('Report updated.');
  };

  return (
    <Card className="mt-10">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4" aria-hidden="true" /> Report inbox
          </CardTitle>
          <CardDescription>Every report filed across the platform.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-[140px]" aria-label="Filter by status">
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
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports match this filter.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{(r.status ?? 'open').replace('_', ' ')}</Badge>
                {r.category ? <Badge variant="secondary">{r.category}</Badge> : null}
                {r.severity ? <Badge variant="secondary">{r.severity}</Badge> : null}
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                {r.route ? <span className="text-muted-foreground">· {r.route}</span> : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{r.user_message || '(no description)'}</p>
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
                  className="h-8 flex-1 min-w-[180px]"
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
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default BugReportInbox;
