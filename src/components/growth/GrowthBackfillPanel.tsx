/**
 * GROWTH BACKFILL PANEL (admin)
 *
 * Triggers safe, throttled backfills / bulk retries for specific dates and
 * delivery windows, and shows the run history of previous jobs.
 *
 * Safety contract (enforced again server-side, this UI only mirrors it):
 *   • existing insights are never overwritten — only missing rows are filled
 *   • dry run is the default, so an admin always previews before writing
 *   • date range, item cap and per-item throttle are all bounded
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, PlayCircle, History, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { logGrowthAudit } from '@/lib/growthAudit';

const SLOTS = ['morning', 'midday', 'afternoon', 'evening', 'night'] as const;
type Slot = (typeof SLOTS)[number];

interface JobRow {
  id: string;
  from_date: string;
  to_date: string;
  slots: string[] | null;
  dry_run: boolean;
  status: string;
  processed: number;
  written: number;
  skipped: number;
  errors: string[] | null;
  throttle_ms: number;
  finished_at: string | null;
  created_at: string;
}

const today = () => new Date().toISOString().slice(0, 10);

interface PlanEntry {
  userId: string;
  localDate: string;
  slot: string;
  decision: string;
  reason: string;
}

interface RunResult {
  jobId: string;
  version: string | null;
  dryRun: boolean;
  window: { fromDate: string; toDate: string; slots: string[] };
  users: number;
  affectedUsers: number;
  scanned: number;
  written: number;
  skipped: number;
  plan: PlanEntry[];
  planTruncated: boolean;
  errors: string[];
}

/** Triggers a client-side download without touching the DOM tree. */
function download(filename: string, body: string, mime: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function planToCsv(result: RunResult): string {
  const header = 'user_id,local_date,slot,decision,reason';
  const rows = result.plan.map((p) =>
    [p.userId, p.localDate, p.slot, p.decision, `"${p.reason.replace(/"/g, '""')}"`].join(','));
  return [header, ...rows].join('\n');
}

export default function GrowthBackfillPanel() {
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [slots, setSlots] = useState<Slot[]>([...SLOTS]);
  const [maxItems, setMaxItems] = useState(25);
  const [throttleMs, setThrottleMs] = useState(400);
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const { data } = await supabase
        .from('growth_backfill_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);
      setJobs((data as JobRow[] | null) ?? []);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => { void loadJobs(); }, [loadJobs]);

  const toggleSlot = (slot: Slot) =>
    setSlots((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]));

  const validate = (): boolean => {
    if (!slots.length) { toast.error('Select at least one delivery window'); return false; }
    if (toDate < fromDate) { toast.error('End date must not be before the start date'); return false; }
    return true;
  };

  /**
   * Always executes against the live deployment (the worker echoes its version
   * and the job id it actually created) and records the run in the audit log.
   */
  const run = async () => {
    if (!validate()) return;
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('growth-dispatch', {
        body: { action: 'backfill', fromDate, toDate, slots, maxItems, throttleMs, dryRun },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'Backfill rejected');
      const s = data.summary ?? {};
      if (!data.jobId) throw new Error('Worker did not return a job id — deployment may be stale');
      const next: RunResult = {
        jobId: data.jobId,
        version: data.version ?? s.version ?? null,
        dryRun,
        window: data.window ?? { fromDate, toDate, slots },
        users: Number(s.users ?? 0),
        affectedUsers: Number(s.affectedUsers ?? 0),
        scanned: Number(s.scanned ?? 0),
        written: Number(s.written ?? 0),
        skipped: Number(s.skipped ?? 0),
        plan: Array.isArray(s.plan) ? (s.plan as PlanEntry[]) : [],
        planTruncated: Boolean(s.planTruncated),
        errors: Array.isArray(s.errors) ? s.errors : [],
      };
      setResult(next);
      void logGrowthAudit(dryRun ? 'backfill_previewed' : 'backfill_executed', {
        jobId: next.jobId, window: next.window, written: next.written, version: next.version,
      });
      toast.success(
        `${dryRun ? 'Dry run' : 'Backfill'} ${next.jobId.slice(0, 8)}: ${next.written} ` +
        `${dryRun ? 'would be written' : 'written'}, ${next.skipped} skipped across ${next.users} users`,
      );
      await loadJobs();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Backfill failed');
    } finally {
      setRunning(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="h-4 w-4 text-primary" aria-hidden="true" />
          Backfill &amp; bulk retry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <p className="text-muted-foreground">
          Fills only missing insights for the selected dates and windows. Existing cards are never
          overwritten, so re-running a job is safe.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="bf-from" className="text-xs">From</Label>
            <Input id="bf-from" type="date" value={fromDate} max={today()} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bf-to" className="text-xs">To</Label>
            <Input id="bf-to" type="date" value={toDate} max={today()} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Delivery windows</Label>
          <div className="flex flex-wrap gap-1.5">
            {SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                aria-pressed={slots.includes(slot)}
                onClick={() => toggleSlot(slot)}
                className={`rounded-full border px-2.5 py-1 capitalize transition ${
                  slots.includes(slot)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="bf-max" className="text-xs">Max items</Label>
            <Input
              id="bf-max" type="number" min={1} max={200} value={maxItems}
              onChange={(e) => setMaxItems(Number(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bf-throttle" className="text-xs">Throttle (ms / item)</Label>
            <Input
              id="bf-throttle" type="number" min={100} max={5000} step={100} value={throttleMs}
              onChange={(e) => setThrottleMs(Number(e.target.value) || 100)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
          <div>
            <Label htmlFor="bf-dry" className="text-xs">Dry run</Label>
            <p className="text-[10px] text-muted-foreground">Preview counts without writing insights</p>
          </div>
          <Switch id="bf-dry" checked={dryRun} onCheckedChange={setDryRun} />
        </div>

        {!dryRun && (
          <p className="flex items-start gap-1.5 text-[10px] text-amber-500">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            This will generate and publish real insights for the selected users and windows.
          </p>
        )}

        <Button
          size="sm" className="w-full" disabled={running}
          onClick={() => { if (validate()) setConfirmOpen(true); }}
        >
          {running
            ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            : <PlayCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
          {dryRun ? 'Preview backfill' : 'Run backfill'}
        </Button>

        {result && (
          <div className="space-y-1.5 rounded-lg border border-primary/40 bg-primary/5 p-2.5" data-growth-backfill-result>
            <p className="font-medium">
              {result.dryRun ? 'Dry run complete' : 'Backfill complete'} · job {result.jobId.slice(0, 8)}
            </p>
            <p className="text-muted-foreground">
              window {result.window.fromDate} → {result.window.toDate} · {result.window.slots.join(', ')} ·
              worker {result.version ?? 'unknown build'}
            </p>
            <p className="text-muted-foreground">
              {result.users} members scanned · {result.affectedUsers} affected ·{' '}
              {result.written} {result.dryRun ? 'would be written' : 'written'} · {result.skipped} skipped
              {result.planTruncated ? ' · report truncated' : ''}
            </p>
            {result.errors.length > 0 && <p className="text-destructive">{result.errors.join(' | ')}</p>}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm" variant="outline" className="h-7 text-[11px]"
                disabled={!result.plan.length}
                onClick={() => download(`growth-backfill-${result.jobId}.csv`, planToCsv(result), 'text/csv')}
              >
                <Download className="mr-1 h-3 w-3" aria-hidden="true" /> CSV
              </Button>
              <Button
                size="sm" variant="outline" className="h-7 text-[11px]"
                onClick={() => download(
                  `growth-backfill-${result.jobId}.json`,
                  JSON.stringify(result, null, 2),
                  'application/json',
                )}
              >
                <Download className="mr-1 h-3 w-3" aria-hidden="true" /> JSON
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1.5 border-t border-border pt-3">
          <p className="font-medium">Recent jobs</p>
          {loadingJobs && <p className="text-muted-foreground">Loading job history…</p>}
          {!loadingJobs && jobs.length === 0 && (
            <p className="text-muted-foreground">No backfills have been run yet.</p>
          )}
          {jobs.map((job) => (
            <div key={job.id} className="rounded-lg border border-border p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {job.from_date}{job.to_date !== job.from_date ? ` → ${job.to_date}` : ''}
                  {job.dry_run ? ' · dry run' : ''}
                </span>
                <span className={job.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}>
                  {job.status}
                </span>
              </div>
              <p className="text-muted-foreground">
                scanned {job.processed} · written {job.written} · skipped {job.skipped} · {job.throttle_ms} ms
              </p>
              {job.errors?.length ? <p className="text-destructive">{job.errors.join(' | ')}</p> : null}
              <p className="text-[10px] text-muted-foreground">
                {new Date(job.created_at).toLocaleString()} · {(job.slots ?? []).join(', ')}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dryRun ? 'Preview this backfill?' : 'Run this backfill for real?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dryRun
                ? 'Nothing is written. The worker scans the window below and returns the exact members and slots that would be filled, with a downloadable report.'
                : 'Insights will be generated and published for every missing slot in the window below. Existing cards are never overwritten.'}
              <br />
              <span className="mt-2 block font-medium text-foreground">
                {fromDate} → {toDate} · {slots.join(', ')} · max {maxItems} items · {throttleMs} ms throttle
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={running} onClick={(e) => { e.preventDefault(); void run(); }}>
              {running ? 'Running…' : dryRun ? 'Run preview' : 'Run backfill'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
