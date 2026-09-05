/**
 * Zoe Brain Dashboard — measured, not decorative.
 *
 * Uptime and response time come from `brainTelemetry` (recorded on every orb
 * turn), failing intents come from the same store, and the integration grid
 * comes from a live `zoe-api-status` probe. Nothing here is hard-coded.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Activity, RefreshCw, Plug, AlertTriangle, Timer, Gauge, ExternalLink, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  subscribeBrainStats,
  formatDuration,
  clearBrainTelemetry,
  type BrainStats,
} from '@/features/zoe-brain/brainTelemetry';
import { fetchApiStatus, apiHealthWord, type ApiStatusReport } from '@/features/zoe-brain/apiStatus';
import {
  getFailureHistory,
  clearFailureHistory,
  timeAgo,
  type FailureRecord,
} from '@/features/zoe-brain/apiFailureLog';
import { guideFor } from '@/features/zoe-brain/reconnectGuide';

const HEALTH_STYLES: Record<string, string> = {
  live: 'border-emerald-500/40 text-emerald-400',
  configured: 'border-amber-500/40 text-amber-400',
  failing: 'border-destructive/50 text-destructive',
  missing: 'border-muted-foreground/30 text-muted-foreground',
};


const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string; hint?: string }> = ({
  icon,
  label,
  value,
  hint,
}) => (
  <Card className="p-4 bg-card/60 backdrop-blur border-border/60">
    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
      {icon}
      {label}
    </div>
    <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
  </Card>
);

const ZoeBrainDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [apis, setApis] = useState<ApiStatusReport | null>(null);
  const [loadingApis, setLoadingApis] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => subscribeBrainStats(setStats), []);

  const loadApis = useCallback(async (force = false) => {
    setLoadingApis(true);
    setApiError(null);
    try {
      setApis(await fetchApiStatus({ probe: true, force }));
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingApis(false);
    }
  }, []);

  useEffect(() => {
    void loadApis(false);
  }, [loadApis]);

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <Helmet>
        <title>Zoe Brain Dashboard | M'Mora</title>
        <meta
          name="description"
          content="Live view of Zoe's brain: uptime, response time, failing intents and the health of every connected integration."
        />
        <link rel="canonical" href="/zoe/brain" />
      </Helmet>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Zoe Brain Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Measured from real turns on this device and a live probe of every integration.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadApis(true)} disabled={loadingApis}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingApis ? 'animate-spin' : ''}`} /> Re-probe APIs
          </Button>
          <Button variant="ghost" size="sm" onClick={clearBrainTelemetry}>
            Reset metrics
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Metric
          icon={<Timer className="w-3.5 h-3.5" />}
          label="Uptime (session)"
          value={stats ? formatDuration(stats.sessionUptimeMs) : '—'}
          hint={stats ? `tracking since ${formatDuration(stats.trackedSinceMs)} ago` : undefined}
        />
        <Metric
          icon={<Gauge className="w-3.5 h-3.5" />}
          label="Avg response"
          value={stats && stats.totalTurns ? `${stats.avgLatencyMs} ms` : '—'}
          hint={stats && stats.totalTurns ? `p95 ${stats.p95LatencyMs} ms` : 'no turns recorded yet'}
        />
        <Metric
          icon={<Activity className="w-3.5 h-3.5" />}
          label="Success rate"
          value={stats && stats.totalTurns ? `${stats.successRate}%` : '—'}
          hint={stats ? `${stats.totalTurns} turns · ${stats.errorTurns} errors` : undefined}
        />
        <Metric
          icon={<Plug className="w-3.5 h-3.5" />}
          label="Integrations live"
          value={apis ? `${apis.apis.filter((a) => apiHealthWord(a) === 'live').length}/${apis.apis.length}` : '—'}
          hint={apis ? `checked ${new Date(apis.checkedAt).toLocaleTimeString()}` : loadingApis ? 'probing…' : undefined}
        />
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Intents
        </h2>
        {!stats || !stats.intents.length ? (
          <Card className="p-4 text-sm text-muted-foreground">
            No turns recorded yet on this device. Talk to Zoe and this fills in immediately.
          </Card>
        ) : (
          <div className="grid gap-2">
            {stats.intents.map((i) => (
              <Card key={i.intent} className="p-3 flex flex-wrap items-center gap-3">
                <span className="font-medium text-sm">{i.intent}</span>
                <Badge variant="outline" className={i.errors ? 'border-destructive/50 text-destructive' : 'border-emerald-500/40 text-emerald-400'}>
                  {i.successRate}% ok
                </Badge>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {i.total} turns · avg {i.avgLatencyMs} ms · p95 {i.p95LatencyMs} ms
                </span>
                {i.errors > 0 && (
                  <span className="text-xs text-destructive truncate max-w-full">
                    {i.errors} error(s){i.lastError ? ` — ${i.lastError}` : ''}
                  </span>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Plug className="w-4 h-4 text-primary" /> Integrations
        </h2>
        {apiError && (
          <Card className="p-4 text-sm text-destructive mb-3">Couldn't reach the integration probe: {apiError}</Card>
        )}
        <div className="grid md:grid-cols-2 gap-2">
          {(apis?.apis ?? []).map((a) => {
            const health = apiHealthWord(a);
            return (
              <Card key={a.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{a.label}</span>
                  <Badge variant="outline" className={HEALTH_STYLES[health]}>
                    {health}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{a.capability}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {a.provider}
                  {a.probe.latencyMs != null ? ` · ${a.probe.latencyMs} ms` : ''} · {a.probe.detail}
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">via {a.edgeFunctions.join(', ')}</p>
              </Card>
            );
          })}
          {!apis && loadingApis && <Card className="p-4 text-sm text-muted-foreground">Probing integrations…</Card>}
        </div>
      </section>
    </div>
  );
};

export default ZoeBrainDashboardPage;
