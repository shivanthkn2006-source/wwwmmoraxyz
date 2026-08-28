/**
 * GROWTH ENGINE STATUS BANNER
 *
 * Shown at the top of the Growth Insights archive. Answers three questions the
 * archive alone could never answer:
 *   1. Is the engine running for me right now, and if not, why?
 *   2. When did it last run successfully for my account?
 *   3. If my archive is empty — what exactly is blocking it?
 *
 * "Run diagnostics" inspects the real inputs (pause flags, onboarding state,
 * focus areas, today's schedule and the actual card query) and prints a plain
 * language report. "Repair & turn on" rewrites the pause flags to working
 * defaults and immediately enqueues today's generation.
 *
 * Every network call is defensive: a failure degrades to a message, never a
 * blank or broken page.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, Download, Loader2, PauseCircle, Stethoscope, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { logGrowthAudit } from '@/lib/growthAudit';
import { FOCUS_AREAS, deviceTimeZone, SLOT_LABEL } from '@/lib/growthSlot';

interface MeStatus {
  timezone: string;
  local_date: string;
  paused_by_user: boolean;
  engine_paused: boolean;
  engine_paused_reason: string | null;
  shadow_mode: boolean;
  last_run_at: string | null;
  last_error: string | null;
  next_status: string;
  next: { slot: string; local_time: string } | null;
  schedule: Array<{ slot: string; status: string; local_time: string }>;
  focus_areas: string[];
  delivery_frequency: number;
}

interface DiagnosticLine {
  ok: boolean;
  label: string;
  detail: string;
}

function downloadDiagnostics(
  format: 'csv' | 'json',
  lines: DiagnosticLine[],
  status: MeStatus | null,
) {
  const generatedAt = new Date().toISOString();
  const filename = `growth-diagnostics-${generatedAt.slice(0, 10)}.${format}`;
  const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const content = format === 'json'
    ? JSON.stringify({ generatedAt, status, checks: lines }, null, 2)
    : [
        ['generated_at', 'result', 'check', 'detail'].map(csvCell).join(','),
        ...lines.map((line) => [generatedAt, line.ok ? 'pass' : 'fail', line.label, line.detail]
          .map(csvCell).join(',')),
      ].join('\n');
  const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const STATUS_COPY: Record<string, string> = {
  paused: 'Paused — nothing is being generated',
  failed: 'Last run reported an error',
  pending: 'A window has passed and its card is still generating',
  scheduled: 'Healthy — waiting for your next delivery window',
  complete: 'All of today’s windows have been delivered',
};

export const GrowthEngineStatusBanner: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<MeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreachable, setUnreachable] = useState(false);
  const [lastCardAt, setLastCardAt] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticLine[] | null>(null);
  const [busy, setBusy] = useState<'diagnose' | 'repair' | null>(null);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [statusRes, cardRes] = await Promise.all([
        supabase.functions.invoke('growth-dispatch', { body: { action: 'me-status' } }),
        supabase
          .from('growth_feed_items')
          .select('created_at')
          .eq('user_id', user.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      const payload = statusRes.data as { ok?: boolean; status?: MeStatus } | null;
      if (payload?.ok && payload.status) {
        setStatus(payload.status);
        setUnreachable(false);
      } else {
        setUnreachable(true);
      }
      setLastCardAt((cardRes.data as { created_at: string } | null)?.created_at ?? null);
    } catch {
      setUnreachable(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  /** Full "why is my archive empty" report, built from the real records. */
  const runDiagnostics = async () => {
    if (!user) return;
    setBusy('diagnose');
    try {
      const [prefRes, itemsRes, statusRes] = await Promise.all([
        supabase
          .from('growth_preferences')
          .select('paused, onboarded_at, focus_areas, reflection_styles, delivery_frequency, timezone')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('growth_feed_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase.functions.invoke('growth-dispatch', { body: { action: 'me-status' } }),
      ]);

      const pref = prefRes.data as Record<string, unknown> | null;
      const count = itemsRes.count ?? 0;
      const live = (statusRes.data as { status?: MeStatus } | null)?.status ?? null;
      if (live) setStatus(live);

      const focus = (pref?.focus_areas as string[] | null) ?? [];
      const styles = (pref?.reflection_styles as string[] | null) ?? [];
      const lines: DiagnosticLine[] = [
        {
          ok: Boolean(pref),
          label: 'Preferences record',
          detail: pref ? 'Found for your account.' : 'Missing — onboarding never saved anything.',
        },
        {
          ok: Boolean(pref?.onboarded_at),
          label: 'Onboarding',
          detail: pref?.onboarded_at
            ? `Completed ${new Date(String(pref.onboarded_at)).toLocaleString()}.`
            : 'Never completed, so the worker skips your account.',
        },
        {
          ok: pref?.paused !== true,
          label: 'Pause flag',
          detail: pref?.paused === true
            ? 'Your engine is paused — the worker skips paused accounts entirely.'
            : 'Not paused.',
        },
        {
          ok: focus.length > 0,
          label: 'Focus areas',
          detail: focus.length ? focus.join(', ') : 'Empty — generation has no topic to work from.',
        },
        {
          ok: styles.length > 0,
          label: 'Delivery styles',
          detail: styles.length ? styles.join(', ') : 'Empty — the card style cannot be chosen.',
        },
        {
          ok: !live?.engine_paused,
          label: 'Platform worker',
          detail: live?.engine_paused
            ? `Globally paused: ${live.engine_paused_reason ?? 'no reason recorded'}.`
            : live?.last_run_at
              ? `Last ran ${new Date(live.last_run_at).toLocaleString()}.`
              : unreachable ? 'Worker did not respond to the status check.' : 'Running.',
        },
        {
          ok: count > 0,
          label: 'Cards in your archive',
          detail: count > 0 ? `${count} card${count === 1 ? '' : 's'} stored.` : 'No cards have ever been written for you.',
        },
      ];
      setDiagnostics(lines);
      void logGrowthAudit('diagnostics_run', {
        failing: lines.filter((l) => !l.ok).map((l) => l.label), cards: count,
      });
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Diagnostics could not complete');
    } finally {
      setBusy(null);
    }
  };

  /** Resets the pause flags to working defaults and asks for today's card now. */
  const repair = async () => {
    if (!user) return;
    setBusy('repair');
    try {
      const { data: existing } = await supabase
        .from('growth_preferences')
        .select('focus_areas, reflection_styles, reflection_style, timezone, delivery_frequency')
        .eq('user_id', user.id)
        .maybeSingle();
      const pref = (existing as Record<string, unknown> | null) ?? null;
      const focus = ((pref?.focus_areas as string[] | null) ?? []).filter(Boolean);
      const styles = ((pref?.reflection_styles as string[] | null) ?? []).filter(Boolean);

      const { error } = await supabase.from('growth_preferences').upsert(
        {
          user_id: user.id,
          paused: false,
          onboarded_at: new Date().toISOString(),
          focus_areas: focus.length ? focus : [FOCUS_AREAS[0]],
          reflection_styles: styles.length ? styles : ['actionable'],
          reflection_style: styles[0] ?? (pref?.reflection_style as string) ?? 'actionable',
          delivery_frequency: Number(pref?.delivery_frequency ?? 5),
          timezone: (pref?.timezone as string) || deviceTimeZone(),
        },
        { onConflict: 'user_id' },
      );
      if (error) throw error;

      const { data } = await supabase.functions.invoke('growth-dispatch', {
        body: { action: 'regenerate' },
      });
      void logGrowthAudit('engine_repaired', {
        focus: focus.length ? focus : [FOCUS_AREAS[0]],
        regenerated: Boolean((data as { ok?: boolean } | null)?.ok),
      });
      toast.success(
        (data as { ok?: boolean } | null)?.ok
          ? 'Engine repaired — today’s card is generating'
          : 'Engine turned on — your next window will deliver',
      );
      setDiagnostics(null);
      await load();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Repair failed — please try again');
    } finally {
      setBusy(null);
    }
  };

  if (!user) return null;

  const paused = status?.paused_by_user || status?.engine_paused;
  const headline = loading
    ? 'Checking your engine…'
    : unreachable
      ? 'Engine status unavailable right now'
      : STATUS_COPY[status?.next_status ?? ''] ?? 'Engine status unknown';

  return (
    <section
      data-growth-engine-status
      data-engine-paused={paused ? 'true' : 'false'}
      className={`mb-4 rounded-xl border p-4 ${
        paused ? 'border-amber-500/50 bg-amber-500/5' : 'border-border bg-card'
      }`}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-primary">
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            : paused
              ? <PauseCircle className="h-4 w-4 text-amber-500" aria-hidden="true" />
              : <Activity className="h-4 w-4" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{headline}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {status?.paused_by_user && 'You paused your own insights. '}
            {status?.engine_paused && `Platform worker paused: ${status.engine_paused_reason ?? 'no reason recorded'}. `}
            {status?.last_error && !status.engine_paused && `Last error: ${status.last_error}. `}
            {lastCardAt
              ? `Last card delivered ${new Date(lastCardAt).toLocaleString()}.`
              : 'No card has been delivered to your account yet.'}
            {status?.last_run_at && ` Worker last ran ${new Date(status.last_run_at).toLocaleString()}.`}
          </p>
          {status?.next && !paused && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Next window: {SLOT_LABEL[status.next.slot as keyof typeof SLOT_LABEL] ?? status.next.slot} at{' '}
              {status.next.local_time} ({status.timezone}).
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button
              size="sm" variant="outline" disabled={busy !== null}
              onClick={() => void runDiagnostics()}
            >
              {busy === 'diagnose'
                ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                : <Stethoscope className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
              Run diagnostics
            </Button>
            <Button size="sm" disabled={busy !== null} onClick={() => void repair()}>
              {busy === 'repair'
                ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                : <Wrench className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
              Repair &amp; turn on
            </Button>
          </div>

          {diagnostics && (
            <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-background/60 p-3" data-growth-diagnostics>
              <p className="text-xs font-medium">Why your feed looks the way it does</p>
              {diagnostics.map((line) => (
                <p key={line.label} className="flex items-start gap-1.5 text-[11px]">
                  {line.ok
                    ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" aria-hidden="true" />
                    : <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" aria-hidden="true" />}
                  <span>
                    <span className="font-medium">{line.label}:</span>{' '}
                    <span className="text-muted-foreground">{line.detail}</span>
                  </span>
                </p>
              ))}
              {diagnostics.every((l) => l.ok) && (
                <p className="text-[11px] text-muted-foreground">
                  Everything checks out — cards will appear at your next delivery window.
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => downloadDiagnostics('csv', diagnostics, status)}>
                  <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadDiagnostics('json', diagnostics, status)}>
                  <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> JSON
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default GrowthEngineStatusBanner;
