/**
 * TODAY'S GROWTH STATUS
 *
 * One panel that answers "is anything missing today?" for the signed-in member:
 * delivery windows and their state, missing prompts, worker errors, retry
 * budget and the next scheduled attempt, plus a manual catch-up button.
 *
 * It also runs a client-side composition check: if today's cards exist but the
 * surrounding feed rendered none of them, the panel warns instead of silently
 * showing an incomplete feed.
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGrowthDelivery } from '@/hooks/useGrowthDelivery';

interface Props {
  className?: string;
  /** Verify that the surrounding feed actually rendered Growth cards. */
  verifyComposition?: boolean;
  compact?: boolean;
}

const STATUS_TONE: Record<string, string> = {
  delivered: 'text-primary',
  shadow: 'text-muted-foreground',
  pending: 'text-amber-500',
  scheduled: 'text-muted-foreground',
};

/**
 * Confirms Growth cards were composed into whatever surface is on screen.
 * Returns true only when cards were expected and none rendered.
 */
export function useGrowthRenderAudit(expected: number, active: boolean) {
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!active || expected <= 0) { setMissing(false); return; }
    if (typeof document === 'undefined') return;
    // Give the feed a frame or two to mount its slides before judging it.
    const timer = window.setTimeout(() => {
      const rendered = document.querySelectorAll('[data-growth-insight],[data-growth-card]').length;
      setMissing(rendered === 0);
    }, 1_500);
    return () => window.clearTimeout(timer);
  }, [expected, active]);
  return missing;
}

export default function GrowthTodayStatusPanel({ className = '', verifyComposition = false, compact = false }: Props) {
  const {
    status, loading, error, running, result, gaps,
    retryCount, maxRetries, nextRetryAt, runCatchUp, refresh,
  } = useGrowthDelivery();

  const delivered = (status?.schedule ?? []).filter((s) => s.item).length;
  const compositionMissing = useGrowthRenderAudit(delivered, verifyComposition);

  if (loading && !status) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking today's growth delivery…
        </CardContent>
      </Card>
    );
  }

  if (error || !status) {
    return (
      <Card className={className}>
        <CardContent className="space-y-2 py-5 text-xs text-muted-foreground">
          <p>Today's growth status is unavailable right now.</p>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  const paused = status.paused_by_user || status.engine_paused;

  return (
    <Card className={className} data-testid="growth-today-status">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          Today's growth status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          <span>{status.local_date} · {status.timezone}</span>
          <span>Delivered {delivered}/{status.schedule.length}</span>
          <span className={gaps.length ? 'text-amber-500' : 'text-primary'}>
            {gaps.length ? `${gaps.length} missing prompt${gaps.length === 1 ? '' : 's'}` : 'No gaps'}
          </span>
          {paused && <span className="text-destructive">Paused</span>}
        </div>

        {!compact && (
          <ul className="space-y-1">
            {status.schedule.map((entry) => (
              <li key={entry.slot} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{entry.label} · {entry.local_time}</span>
                <span className={STATUS_TONE[entry.status] ?? 'text-muted-foreground'}>
                  {entry.item ? entry.status : entry.passed ? 'missing' : 'scheduled'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {status.last_error && (
          <p className="flex items-start gap-1 text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Last worker error: {status.last_error}</span>
          </p>
        )}
        {status.engine_paused_reason && (
          <p className="text-destructive">Engine paused: {status.engine_paused_reason}</p>
        )}

        {compositionMissing && (
          <p className="flex items-start gap-1 text-amber-500" data-testid="growth-composition-warning">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Growth cards exist for today but none rendered in this feed. Refresh to restore them.</span>
          </p>
        )}

        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            Automatic retries used {retryCount}/{maxRetries}
            {nextRetryAt ? ` · next attempt ${new Date(nextRetryAt).toLocaleTimeString()}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => void runCatchUp('manual')} disabled={running}>
            {running
              ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              : <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />}
            Catch up now
          </Button>
          <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={running}>
            Refresh status
          </Button>
        </div>

        {result && (
          <p
            className={`flex items-start gap-1 ${result.ok ? 'text-primary' : 'text-destructive'}`}
            data-testid="growth-catchup-result"
            role="status"
          >
            {result.ok
              ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            <span>{result.message} <span className="text-muted-foreground">({new Date(result.at).toLocaleTimeString()})</span></span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
