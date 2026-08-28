/**
 * GROWTH CARD ALERT HOST
 *
 * Top-of-screen alert shown the moment a new insight card is generated.
 * Mounted once, globally, inside PlatformLayout and crash-isolated there, so it
 * fires on every route without touching any existing component.
 *
 * Lifetime = reading time of the card at a normal pace (~200 wpm, clamped to
 * 6-20s) shown as a draining progress bar. Hovering, focusing or touching the
 * alert pauses the timer so it can always be finished; dismissing or letting it
 * run out marks the card as announced, permanently, on this device.
 *
 * Guards, in order: signed in -> engine flag -> alert flag -> member not paused
 * -> member has alerts enabled. Any failure leaves the UI untouched.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, X, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useGrowthFlags } from '@/hooks/useGrowthFlags';
import { useGrowthAlertEngine } from '@/hooks/useGrowthAlertEngine';
import { useGrowthAlertQueue } from '@/hooks/useGrowthUnread';
import { dismissGrowthAlert, type GrowthAlert } from '@/lib/growthAlertStore';
import { showGrowthPush } from '@/lib/growthPush';
import { GROWTH_FLAGS } from '@/lib/growthFlags';
import { SLOT_LABEL } from '@/lib/growthSlot';

interface Prefs {
  paused: boolean;
  notify_on_new_insight: boolean;
  notify_push: boolean;
  notify_digest: string;
}

function AlertBanner({ alert, onOpen }: { alert: GrowthAlert; onOpen: (a: GrowthAlert) => void }) {
  const [remaining, setRemaining] = useState(alert.durationMs);
  const [paused, setPaused] = useState(false);
  const startedRef = useRef(Date.now());
  const leftRef = useRef(alert.durationMs);

  useEffect(() => {
    if (paused) return;
    startedRef.current = Date.now();
    const tick = window.setInterval(() => {
      const left = leftRef.current - (Date.now() - startedRef.current);
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(tick);
        dismissGrowthAlert(alert.id);
      }
    }, 100);
    return () => {
      window.clearInterval(tick);
      leftRef.current = Math.max(0, leftRef.current - (Date.now() - startedRef.current));
    };
  }, [paused, alert.id]);

  const pct = Math.max(0, Math.min(100, (remaining / alert.durationMs) * 100));

  return (
    <div
      role="status"
      aria-live="polite"
      data-growth-alert
      data-growth-alert-slot={alert.slot}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      className="pointer-events-auto w-[min(92vw,26rem)] overflow-hidden rounded-2xl border border-border bg-card/95 text-card-foreground shadow-lg backdrop-blur-md"
    >
      <div className="flex items-start gap-3 p-3.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Lightbulb className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            New insight · {SLOT_LABEL[alert.slot as keyof typeof SLOT_LABEL] ?? alert.category}
          </p>
          <p className="truncate text-sm font-semibold">{alert.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{alert.content}</p>
          <button
            type="button"
            onClick={() => onOpen(alert)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            Read it now <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          aria-label="Dismiss insight alert"
          onClick={() => dismissGrowthAlert(alert.id)}
          className="rounded-full p-1 text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="h-1 w-full bg-muted" aria-hidden="true">
        <div
          className="h-full bg-primary transition-[width] duration-100 ease-linear"
          style={{ width: `${pct}%` }}
          data-growth-alert-progress
        />
      </div>
    </div>
  );
}

export const GrowthCardAlertHost: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isEnabled } = useGrowthFlags();
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) { setPrefs(null); return; }
      try {
        const { data } = await supabase
          .from('growth_preferences')
          .select('paused, notify_on_new_insight, notify_push, notify_digest')
          .eq('user_id', user.id)
          .maybeSingle();
        if (active) setPrefs((data as Prefs | null) ?? null);
      } catch {
        if (active) setPrefs(null);
      }
    })();
    return () => { active = false; };
  }, [user?.id]);

  const alertsOn =
    Boolean(user) &&
    isEnabled(GROWTH_FLAGS.engine) &&
    isEnabled(GROWTH_FLAGS.alerts) &&
    !prefs?.paused &&
    prefs?.notify_on_new_insight !== false &&
    prefs?.notify_digest !== 'off';

  // Instant device pushes fire per-card. Daily digests are aggregated by the
  // worker at the member's final local window, so emitting here would bypass
  // the selected frequency and produce multiple mobile alerts.
  const pushOn = alertsOn && isEnabled(GROWTH_FLAGS.push) &&
    prefs?.notify_push !== false && prefs?.notify_digest === 'instant';

  const onNewAlert = useCallback(
    (a: GrowthAlert) => {
      if (!pushOn) return;
      void showGrowthPush({
        title: a.title,
        body: a.content,
        tag: a.id,
        onClickUrl: '/growth-insights',
      });
    },
    [pushOn],
  );

  useGrowthAlertEngine(alertsOn, onNewAlert);

  const { queue } = useGrowthAlertQueue();

  const open = useCallback(
    (a: GrowthAlert) => {
      dismissGrowthAlert(a.id);
      navigate('/growth-insights');
    },
    [navigate],
  );

  if (!alertsOn || queue.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[10000] flex flex-col items-center gap-2 px-3"
      data-growth-alert-host
    >
      {queue.map((a) => (
        <AlertBanner key={a.id} alert={a} onOpen={open} />
      ))}
    </div>
  );
};

export default GrowthCardAlertHost;
