/**
 * ProviderHealthPanel — settings/diagnostics dialog for the 5-tier cascade.
 *
 * Shows:
 *   • API-key presence (GROQ, GOOGLE_AI_STUDIO, OPENROUTER, LOVABLE)
 *   • Live health ping for every tier (ok / latency / reason)
 *   • Per-request tier selected (last 25)
 *   • 24h tier distribution + monthly projection (Lovable last-resort guard)
 *   • Structured fallback reason histogram
 *
 * Mounted in ZoeFeatureStatusPanel; Ctrl+Shift+Z opens it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  getCascadeRecords,
  summarizeCascade,
  clearCascadeMetrics,
  TIER_LABELS,
  type CascadeRecord,
} from '@/utils/cascadeMetrics';

interface HealthTier {
  tier: number;
  name: string;
  provider: string;
  model: string;
  envKey: string;
  keyPresent: boolean;
}

interface HealthAttempt {
  tier: number;
  name: string;
  provider: string;
  ok: boolean;
  status: number | null;
  reasonCode: string;
  reasonText: string;
  latencyMs: number;
}

interface HealthResponse {
  ok: boolean;
  keys: Record<string, boolean>;
  tiers: HealthTier[];
  attempts?: HealthAttempt[];
  summary?: {
    healthyTiers: number[];
    degradedTiers: number[];
    missingKeyTiers: number[];
    primaryHealthy: number | null;
  };
  checkedAt: string;
}

const REASON_LABELS: Record<string, string> = {
  success: 'OK',
  missing_key: 'Missing API key',
  rate_limit: 'Rate limited (429)',
  auth_error: 'Auth error (401/403)',
  payment_required: 'Credits exhausted (402)',
  bad_request: 'Bad request (400)',
  server_error: 'Upstream 5xx',
  network_error: 'Network error',
  empty_response: 'Empty response',
  timeout: 'Timeout',
  unknown_error: 'Unknown error',
};

function badge(ok: boolean, neutral = false) {
  if (neutral) return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  return ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />;
}

export default function ProviderHealthPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pingError, setPingError] = useState<string | null>(null);
  const [records, setRecords] = useState<CascadeRecord[]>(() => getCascadeRecords());

  const refreshRecords = useCallback(() => setRecords(getCascadeRecords()), []);

  useEffect(() => {
    const onMetric = () => refreshRecords();
    window.addEventListener('zoe:cascade-metric', onMetric);
    return () => window.removeEventListener('zoe:cascade-metric', onMetric);
  }, [refreshRecords]);

  const runHealthCheck = useCallback(async (ping: boolean) => {
    setLoading(true);
    setPingError(null);
    try {
      const { data, error } = await supabase.functions.invoke('provider-health', {
        body: { ping },
      });
      if (error) throw error;
      setHealth(data as HealthResponse);
    } catch (e: any) {
      setPingError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial: light fetch (no ping) so we at least know key presence.
  useEffect(() => { runHealthCheck(false); }, [runHealthCheck]);

  const summary = useMemo(() => summarizeCascade(24), [records]);
  const recentRequests = records.slice(-25).reverse();

  return (
    <div className="space-y-4 text-sm">
      {/* ── API Keys ── */}
      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">API keys</h3>
          <button
            onClick={() => runHealthCheck(false)}
            className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Retry init
          </button>
        </div>
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {(['GROQ_API_KEY', 'GOOGLE_AI_STUDIO_KEY', 'OPENROUTER_API_KEY', 'LOVABLE_API_KEY'] as const).map(k => {
            const present = !!health?.keys?.[k];
            return (
              <li key={k} className="flex items-center gap-2 rounded-md bg-black/30 px-2 py-1.5">
                {badge(present)}
                <span className="font-mono text-xs">{k}</span>
                <span className={`ml-auto text-xs ${present ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {present ? 'present' : 'missing'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Tier health ── */}
      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Provider cascade health</h3>
          <button
            onClick={() => runHealthCheck(true)}
            className="rounded-md bg-fuchsia-600/40 px-2 py-1 text-xs hover:bg-fuchsia-600/60"
            disabled={loading}
          >
            {loading ? 'Pinging…' : 'Live ping all tiers'}
          </button>
        </div>
        {pingError && <p className="mt-2 text-xs text-rose-300">{pingError}</p>}
        <ul className="mt-2 space-y-1.5">
          {(health?.tiers ?? []).map(t => {
            const attempt = health?.attempts?.find(a => a.tier === t.tier);
            const status: 'ok' | 'warn' | 'fail' =
              !t.keyPresent ? 'warn' :
              attempt ? (attempt.ok ? 'ok' : 'fail') : 'warn';
            return (
              <li key={t.tier} className="rounded-md border border-white/5 bg-black/30 px-2 py-1.5">
                <div className="flex items-center gap-2">
                  {badge(status === 'ok', status === 'warn')}
                  <span className="font-medium">{t.name}</span>
                  <span className="ml-auto text-xs text-white/60">
                    {attempt ? `${attempt.latencyMs}ms` : (t.keyPresent ? 'untested' : 'no key')}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-white/50">
                  <span className="font-mono">{t.model}</span>
                  {attempt && !attempt.ok && (
                    <> · <span className="text-rose-300">{REASON_LABELS[attempt.reasonCode] ?? attempt.reasonCode}</span></>
                  )}
                  {attempt && attempt.reasonText && !attempt.ok && (
                    <> — {attempt.reasonText.slice(0, 120)}</>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
        {health?.summary && (
          <p className="mt-2 text-[11px] text-white/50">
            Healthy: {health.summary.healthyTiers.join(', ') || '—'} ·
            Degraded: {health.summary.degradedTiers.join(', ') || '—'} ·
            Missing key: {health.summary.missingKeyTiers.join(', ') || '—'}
          </p>
        )}
      </section>

      {/* ── 24h tier distribution + quota projection ── */}
      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">24h tier distribution</h3>
          <button
            onClick={() => { clearCascadeMetrics(); refreshRecords(); }}
            className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
        <p className="mt-1 text-[11px] text-white/50">
          Total {summary.total} req · ~{summary.monthlyProjection.estTotal}/mo projected ·
          Lovable T5 reliance: <span className={summary.lovableReliancePct > 25 ? 'text-amber-300' : 'text-emerald-300'}>
            {summary.lovableReliancePct.toFixed(1)}%
          </span> (~{summary.monthlyProjection.estLovableT5}/mo paid)
        </p>
        <ul className="mt-2 space-y-1">
          {summary.byTier.map(b => (
            <li key={b.tier} className="flex items-center gap-2">
              <span className="w-44 text-xs">{TIER_LABELS[b.tier]}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded bg-white/10">
                <div
                  className={`absolute inset-y-0 left-0 ${b.tier === 5 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${b.pct.toFixed(1)}%` }}
                />
              </div>
              <span className="w-20 text-right text-[11px] text-white/60">
                {b.count} ({b.pct.toFixed(0)}%)
                {b.avgLatencyMs != null && <> · {b.avgLatencyMs}ms</>}
              </span>
            </li>
          ))}
        </ul>
        {summary.failurePct > 0 && (
          <p className="mt-2 text-[11px] text-rose-300">
            Fully-failed requests: {summary.failurePct.toFixed(1)}%
          </p>
        )}
      </section>

      {/* ── Fallback reason histogram ── */}
      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <h3 className="font-semibold">Why we fell back (24h)</h3>
        {Object.keys(summary.fallbackReasons).length === 0 ? (
          <p className="mt-1 text-xs text-white/50">No fallbacks recorded.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {Object.entries(summary.fallbackReasons)
              .sort((a, b) => b[1] - a[1])
              .map(([code, n]) => (
                <li key={code} className="flex items-center justify-between text-xs">
                  <span>{REASON_LABELS[code] ?? code}</span>
                  <span className="font-mono text-white/60">{n}</span>
                </li>
              ))}
          </ul>
        )}
      </section>

      {/* ── Per-request log ── */}
      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <h3 className="font-semibold">Recent requests (last 25)</h3>
        {recentRequests.length === 0 ? (
          <p className="mt-1 text-xs text-white/50">No recorded requests yet. Send a message to Zoe to populate.</p>
        ) : (
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
            {recentRequests.map((r, i) => (
              <li key={`${r.at}-${i}`} className="flex items-center gap-2 text-[11px]">
                <span className="text-white/40">{new Date(r.at).toLocaleTimeString()}</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono">
                  {r.selectedTier ? `T${r.selectedTier}` : '✗'}
                </span>
                <span className="text-white/60">{r.surface}</span>
                {r.latencyMs != null && <span className="ml-auto text-white/40">{r.latencyMs}ms</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
