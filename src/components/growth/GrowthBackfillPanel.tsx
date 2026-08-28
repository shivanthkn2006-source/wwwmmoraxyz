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
import { Loader2, PlayCircle, History, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

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

export default function GrowthBackfillPanel() {
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [slots, setSlots] = useState<Slot[]>([...SLOTS]);
  const [maxItems, setMaxItems] = useState(25);
  const [throttleMs, setThrottleMs] = useState(400);
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [jobs, setJobs] = useState<JobRow[]>([]);
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

  const run = async () => {
    if (!slots.length) { toast.error('Select at least one delivery window'); return; }
    if (toDate < fromDate) { toast.error('End date must not be before the start date'); return; }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('growth-dispatch', {
        body: { action: 'backfill', fromDate, toDate, slots, maxItems, throttleMs, dryRun },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'Backfill rejected');
      const s = data.summary;
      toast.success(
        `${dryRun ? 'Dry run' : 'Backfill'}: ${s.written} ${dryRun ? 'would be written' : 'written'}, ` +
        `${s.skipped} skipped across ${s.users} users`,
      );
      await loadJobs();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Backfill failed');
    } finally {
      setRunning(false);
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

        <Button size="sm" className="w-full" disabled={running} onClick={() => void run()}>
          {running
            ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            : <PlayCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
          {dryRun ? 'Preview backfill' : 'Run backfill'}
        </Button>

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
    </Card>
  );
}
