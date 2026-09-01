/**
 * DHF GENERATION STATUS (admin)
 *
 * One row per member: their local timezone, how many of the day's cards exist,
 * whether they were served from cache, and how many prompts failed or are still
 * missing. "Re-run" calls the admin-only `dhf-compass-rerun` edge function to
 * fill exactly that member's gaps.
 *
 * Access is enforced by row-level security and by the edge function's own
 * has_role('admin') check — non-admins see an empty table and a clear message.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COMPASS_SLOT_COUNT } from '@/lib/dhfCompass';

interface Row {
  userId: string;
  timezone: string;
  localDate: string;
  generated: number;
  cached: boolean;
  failed: number;
  missing: number;
}

function localDateIn(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default function AdminDhfGenerationPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prefsRes, postsRes, runsRes] = await Promise.all([
        supabase.from('growth_preferences').select('user_id, timezone').limit(500),
        supabase.from('dhf_daily_posts').select('user_id, post_date, slot_time').limit(5000),
        supabase
          .from('dhf_generation_runs')
          .select('user_id, post_date, error, cache_hit, slots_generated')
          .order('created_at', { ascending: false })
          .limit(2000),
      ]);

      if (prefsRes.error && postsRes.error) {
        setDenied(true);
        setRows([]);
        return;
      }
      setDenied(false);

      const zones = new Map<string, string>();
      for (const p of prefsRes.data ?? []) {
        if (p.user_id) zones.set(p.user_id, (p as { timezone?: string }).timezone || 'UTC');
      }

      const ids = new Set<string>([...zones.keys()]);
      for (const p of postsRes.data ?? []) if (p.user_id) ids.add(p.user_id);

      const next: Row[] = [];
      for (const userId of ids) {
        const tz = zones.get(userId) || 'UTC';
        const date = localDateIn(tz);
        const slots = new Set(
          (postsRes.data ?? [])
            .filter((p) => p.user_id === userId && p.post_date === date)
            .map((p) => String((p as { slot_time?: string }).slot_time ?? '')),
        );
        const runs = (runsRes.data ?? []).filter((r) => r.user_id === userId && r.post_date === date);
        const failed = runs.filter((r) => !!r.error).length;
        const cached = runs.some((r) => (r as { cache_hit?: boolean }).cache_hit === true);
        next.push({
          userId,
          timezone: tz,
          localDate: date,
          generated: slots.size,
          cached,
          failed,
          missing: Math.max(0, COMPASS_SLOT_COUNT - slots.size),
        });
      }
      next.sort((a, b) => b.missing - a.missing || b.failed - a.failed);
      setRows(next);
    } catch (e) {
      console.error('[AdminDhfGenerationPage] load failed', e);
      setDenied(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const rerun = async (row: Row) => {
    setBusy(row.userId);
    try {
      const { data, error } = await supabase.functions.invoke('dhf-compass-rerun', {
        body: { userId: row.userId, timezone: row.timezone, date: row.localDate },
      });
      if (error) throw error;
      const generated = (data as { generated?: number } | null)?.generated ?? 0;
      toast.success(`Re-run complete — ${generated} card(s) generated.`);
      await load();
    } catch (e) {
      console.error('[AdminDhfGenerationPage] re-run failed', e);
      toast.error('Re-run failed. Check the function logs.');
    } finally {
      setBusy(null);
    }
  };

  const totals = useMemo(() => ({
    members: rows.length,
    complete: rows.filter((r) => r.missing === 0).length,
    failing: rows.filter((r) => r.failed > 0).length,
  }), [rows]);

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Helmet>
        <title>DHF Generation Status | Admin</title>
        <meta name="description" content="Per-member DHF card generation status, cache hits, failed prompts and manual re-run controls." />
      </Helmet>

      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" /> DHF generation — today by member local date
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{totals.members} members</Badge>
              <Badge variant="secondary">{totals.complete} complete</Badge>
              <Badge variant={totals.failing ? 'destructive' : 'secondary'}>{totals.failing} with failures</Badge>
              <Badge variant="secondary">{COMPASS_SLOT_COUNT} cards/day</Badge>
            </div>

            {denied ? (
              <p className="text-sm text-muted-foreground">
                No data visible. This page is restricted to admin accounts.
              </p>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">Loading generation status…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members with DHF activity yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="border-b border-border/60">
                      <th className="py-2 pr-3 font-medium">User ID</th>
                      <th className="py-2 pr-3 font-medium">Timezone</th>
                      <th className="py-2 pr-3 font-medium">Generated</th>
                      <th className="py-2 pr-3 font-medium">Cached</th>
                      <th className="py-2 pr-3 font-medium">Failed</th>
                      <th className="py-2 pr-3 font-medium">Missing</th>
                      <th className="py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.userId} className="border-b border-border/30">
                        <td className="py-2 pr-3 font-mono">{r.userId.slice(0, 8)}…</td>
                        <td className="py-2 pr-3">{r.timezone}</td>
                        <td className="py-2 pr-3">{r.generated}/{COMPASS_SLOT_COUNT}</td>
                        <td className="py-2 pr-3">{r.cached ? 'yes' : 'no'}</td>
                        <td className="py-2 pr-3">{r.failed > 0 ? <span className="text-destructive">{r.failed}</span> : 0}</td>
                        <td className="py-2 pr-3">{r.missing}</td>
                        <td className="py-2">
                          <Button
                            size="sm"
                            variant={r.missing > 0 || r.failed > 0 ? 'default' : 'outline'}
                            disabled={busy === r.userId}
                            onClick={() => void rerun(r)}
                          >
                            {busy === r.userId ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                            Re-run failed
                          </Button>
                        </td>
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
