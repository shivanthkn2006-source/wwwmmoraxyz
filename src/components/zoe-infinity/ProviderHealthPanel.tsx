/**
 * ProviderHealthPanel — settings/diagnostics dialog for the 5-tier cascade.
 * Adds: alerts on degraded tiers, full-cascade live test, JSON diagnostics
 * download, scheduled health auto-poll, and live emotion-driver signals.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Trash2, Download, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  getCascadeRecords,
  summarizeCascade,
  clearCascadeMetrics,
  TIER_LABELS,
  type CascadeRecord,
} from '@/utils/cascadeMetrics';
import {
  getRuntimeSignals,
  subscribeRuntimeSignals,
  refreshHormoneSnapshot,
  recomputeFusion,
  type RuntimeSignals,
} from '@/utils/zoeRuntimeSignalBus';
import { RECALL_THRESHOLD, RECALL_BLOCKLIST } from '@/utils/zoeRecallPolicy';
import { GENESIS_STAGES } from '@/hooks/useZoeGenesisStateMachine';

interface HealthTier { tier: number; name: string; provider: string; model: string; envKey: string; keyPresent: boolean; }
interface HealthAttempt { tier: number; name: string; provider: string; ok: boolean; status: number | null; reasonCode: string; reasonText: string; latencyMs: number; }
interface HealthResponse {
  ok: boolean;
  keys: Record<string, boolean>;
  tiers: HealthTier[];
  attempts?: HealthAttempt[];
  summary?: { healthyTiers: number[]; degradedTiers: number[]; missingKeyTiers: number[]; primaryHealthy: number | null; };
  mode?: 'default' | 't1-primary';
  strategy?: string;
  cascadeOrder?: string;
  checkedAt: string;
}

const REASON_LABELS: Record<string, string> = {
  success: 'OK', missing_key: 'Missing API key', rate_limit: 'Rate limited (429)',
  auth_error: 'Auth error (401/403)', payment_required: 'Credits exhausted (402)',
  bad_request: 'Bad request (400)', server_error: 'Upstream 5xx', network_error: 'Network error',
  empty_response: 'Empty response', timeout: 'Timeout', unknown_error: 'Unknown error',
};

const AUTO_POLL_MS = 5 * 60_000;

function badge(ok: boolean, neutral = false) {
  if (neutral) return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  return ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />;
}

export default function ProviderHealthPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pingError, setPingError] = useState<string | null>(null);
  const [records, setRecords] = useState<CascadeRecord[]>(() => getCascadeRecords());
  const [autoPoll, setAutoPoll] = useState(false);
  const [cascadeTest, setCascadeTest] = useState<{ running: boolean; result?: any; error?: string }>({ running: false });
  const [signals, setSignals] = useState<RuntimeSignals>(() => getRuntimeSignals());
  const lastAlertRef = useRef<string>('');

  const refreshRecords = useCallback(() => setRecords(getCascadeRecords()), []);

  useEffect(() => {
    const onMetric = () => refreshRecords();
    window.addEventListener('zoe:cascade-metric', onMetric);
    return () => window.removeEventListener('zoe:cascade-metric', onMetric);
  }, [refreshRecords]);

  useEffect(() => subscribeRuntimeSignals(setSignals), []);

  const runHealthCheck = useCallback(async (ping: boolean) => {
    setLoading(true); setPingError(null);
    try {
      const { data, error } = await supabase.functions.invoke('provider-health', { body: { ping, mode: 't1-primary' } });
      if (error) throw error;
      setHealth(data as HealthResponse);
    } catch (e: any) { setPingError(e?.message ?? String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { runHealthCheck(false); }, [runHealthCheck]);

  // Auto-poll
  useEffect(() => {
    if (!autoPoll) return;
    const t = setInterval(() => runHealthCheck(true), AUTO_POLL_MS);
    return () => clearInterval(t);
  }, [autoPoll, runHealthCheck]);

  // Alert on degraded tiers (toast via window event)
  useEffect(() => {
    if (!health?.summary) return;
    const degraded = health.summary.degradedTiers;
    const sig = degraded.join(',');
    if (degraded.length > 0 && sig !== lastAlertRef.current) {
      lastAlertRef.current = sig;
      const reasons = (health.attempts ?? [])
        .filter(a => degraded.includes(a.tier) && !a.ok)
        .map(a => `T${a.tier}:${REASON_LABELS[a.reasonCode] ?? a.reasonCode}`)
        .join(' · ');
      window.dispatchEvent(new CustomEvent('zoe:tier-alert', {
        detail: { degraded, reasons, at: Date.now() },
      }));
      console.warn('[ProviderHealth] ⚠️ Degraded tiers:', degraded, reasons);
    }
  }, [health]);

  const summary = useMemo(() => summarizeCascade(24), [records]);
  const recentRequests = records.slice(-25).reverse();

  const runFullCascadeTest = useCallback(async () => {
    setCascadeTest({ running: true });
    try {
      const t0 = performance.now();
      const { data, error } = await supabase.functions.invoke('zoe-infinity-brain', {
        body: {
          messages: [{ role: 'user', content: 'Cascade probe: reply with just OK.' }],
          mode: 'fast',
          determinism: { mode: 'deterministic', temperature: 0, topP: 1, reasoningEffort: 'low', requireCitations: false, requireCritique: false },
        },
      });
      if (error) throw error;
      setCascadeTest({
        running: false,
        result: {
          latencyMs: Math.round(performance.now() - t0),
          selectedTier: data?._diag?.selectedTier ?? null,
          attempts: data?._diag?.attempts ?? [],
          response: (data?.response ?? '').slice(0, 80),
        },
      });
    } catch (e: any) {
      setCascadeTest({ running: false, error: e?.message ?? String(e) });
    }
  }, []);

  const downloadDiagnostics = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      health,
      summary24h: summary,
      recentRecords: records.slice(-25),
      runtimeSignals: signals,
      cascadeTest: cascadeTest.result ?? null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zoe-cascade-diagnostics-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [health, summary, records, signals, cascadeTest]);

  const degradedCount = health?.summary?.degradedTiers?.length ?? 0;

  return (
    <div className="space-y-4 text-sm">
      {/* Alert banner */}
      {degradedCount > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> {degradedCount} tier{degradedCount>1?'s':''} degraded</div>
          <p className="mt-1 text-[11px] text-amber-200/80">
            {(health?.attempts ?? []).filter(a => !a.ok && health?.summary?.degradedTiers.includes(a.tier))
              .map(a => `T${a.tier}: ${REASON_LABELS[a.reasonCode] ?? a.reasonCode}`).join(' · ')}
          </p>
        </div>
      )}

      {/* Strategy + T5 warning */}
      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Cascade strategy</h3>
          <span className="rounded bg-emerald-600/20 px-2 py-0.5 text-[11px] text-emerald-300">{health?.mode ?? 't1-primary'}</span>
        </div>
        <p className="mt-1 text-xs text-white/70">{health?.strategy ?? 'T1 primary → T2 → T3 → T4 → T5 last-resort fallback'}</p>
        <p className="mt-1 text-[11px] text-white/50">{health?.cascadeOrder}</p>
        {summary.lovableReliancePct > 25 && (
          <p className="mt-2 text-xs text-amber-300">
            <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
            T5 reliance is {summary.lovableReliancePct.toFixed(1)}% — T1/T2/T3/T4 are being bypassed more than expected.
          </p>
        )}
      </section>


      {/* Quick actions */}
      <section className="flex flex-wrap gap-2">
        <button onClick={runFullCascadeTest} disabled={cascadeTest.running}
          className="flex items-center gap-1.5 rounded-md bg-fuchsia-600/40 px-3 py-1.5 text-xs hover:bg-fuchsia-600/60 disabled:opacity-50">
          <Zap className="h-3.5 w-3.5" /> {cascadeTest.running ? 'Testing…' : 'Run full cascade test'}
        </button>
        <button onClick={downloadDiagnostics}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600/30 px-3 py-1.5 text-xs hover:bg-emerald-600/50">
          <Download className="h-3.5 w-3.5" /> Download diagnostics JSON
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-white/70">
          <input type="checkbox" checked={autoPoll} onChange={e => setAutoPoll(e.target.checked)} />
          Auto-poll every 5min
        </label>
      </section>

      {/* Cascade test result */}
      {cascadeTest.result && (
        <section className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-3">
          <h3 className="font-semibold">Last cascade test — T{cascadeTest.result.selectedTier ?? '?'} in {cascadeTest.result.latencyMs}ms</h3>
          <p className="mt-1 text-[11px] text-white/60 italic">"{cascadeTest.result.response}"</p>
          <ul className="mt-2 space-y-1 text-[11px]">
            {(cascadeTest.result.attempts as any[]).map((a, i) => (
              <li key={i} className="flex items-center gap-2">
                {badge(a.ok)}
                <span className="font-mono">T{a.tier}</span>
                <span className="text-white/60">{a.provider}/{a.model}</span>
                <span className="ml-auto text-white/40">{a.latencyMs}ms · {REASON_LABELS[a.reasonCode] ?? a.reasonCode}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {cascadeTest.error && <p className="text-xs text-rose-300">Test failed: {cascadeTest.error}</p>}

      {/* ── API Keys ── */}
      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">API keys</h3>
          <button onClick={() => runHealthCheck(false)} disabled={loading}
            className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Retry init
          </button>
        </div>
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {(['GROQ_API_KEY','GOOGLE_AI_STUDIO_KEY','OPENROUTER_API_KEY','LOVABLE_API_KEY'] as const).map(k => {
            const present = !!health?.keys?.[k];
            return (
              <li key={k} className="flex items-center gap-2 rounded-md bg-black/30 px-2 py-1.5">
                {badge(present)}
                <span className="font-mono text-xs">{k}</span>
                <span className={`ml-auto text-xs ${present ? 'text-emerald-300' : 'text-rose-300'}`}>{present ? 'present' : 'missing'}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Tier health ── */}
      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Provider cascade health</h3>
          <button onClick={() => runHealthCheck(true)} disabled={loading}
            className="rounded-md bg-fuchsia-600/40 px-2 py-1 text-xs hover:bg-fuchsia-600/60">
            {loading ? 'Pinging…' : 'Live ping all tiers'}
          </button>
        </div>
        {pingError && <p className="mt-2 text-xs text-rose-300">{pingError}</p>}
        <ul className="mt-2 space-y-1.5">
          {(health?.tiers ?? []).map(t => {
            const attempt = health?.attempts?.find(a => a.tier === t.tier);
            const status: 'ok' | 'warn' | 'fail' = !t.keyPresent ? 'warn' : attempt ? (attempt.ok ? 'ok' : 'fail') : 'warn';
            return (
              <li key={t.tier} className="rounded-md border border-white/5 bg-black/30 px-2 py-1.5">
                <div className="flex items-center gap-2">
                  {badge(status === 'ok', status === 'warn')}
                  <span className="font-medium">{t.name}</span>
                  <span className="ml-auto text-xs text-white/60">{attempt ? `${attempt.latencyMs}ms` : (t.keyPresent ? 'untested' : 'no key')}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-white/50">
                  <span className="font-mono">{t.model}</span>
                  {attempt && !attempt.ok && <> · <span className="text-rose-300">{REASON_LABELS[attempt.reasonCode] ?? attempt.reasonCode}</span></>}
                  {attempt && attempt.reasonText && !attempt.ok && <> — {attempt.reasonText.slice(0, 120)}</>}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Live emotion-driver signals ── */}
      <section className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Live emotion-driver signals</h3>
          <button onClick={() => { refreshHormoneSnapshot(); recomputeFusion({ memoryHit: true }); }}
            className="rounded-md bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20">Refresh</button>
        </div>
        <ul className="mt-2 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
          <li className="rounded bg-black/30 px-2 py-1.5">
            {badge(true)} <b>Hormones:</b> {signals.hormones.phase}
            <div className="mt-0.5 text-[10px] text-white/50">
              dop {signals.hormones.dopamine.toFixed(2)} · oxy {signals.hormones.oxytocin.toFixed(2)} ·
              cort {signals.hormones.cortisol.toFixed(2)} · mel {signals.hormones.melatonin.toFixed(2)}
              {signals.hormones.lazyMode && ' · 🌙 LAZY'}
            </div>
          </li>
          <li className="rounded bg-black/30 px-2 py-1.5">
            {badge(true)} <b>Fusion:</b> {signals.fusion.emotion} @ {signals.fusion.intensity.toFixed(2)}
            <div className="mt-0.5 text-[10px] text-white/50">src: {signals.fusion.source}</div>
          </li>
          <li className="rounded bg-black/30 px-2 py-1.5">
            {badge(true)} <b>Recall policy:</b> threshold {RECALL_THRESHOLD}, blocklist {RECALL_BLOCKLIST.length} terms
          </li>
          <li className="rounded bg-black/30 px-2 py-1.5">
            {badge(true)} <b>Genesis SM:</b> {GENESIS_STAGES.join(' → ')}
          </li>
          <li className="rounded bg-black/30 px-2 py-1.5 sm:col-span-2">
            {badge(!signals.urgentCall, signals.urgentCall)} <b>Urgent call:</b> {signals.urgentCall ? 'ACTIVE' : 'idle'}
            <span className="ml-2 text-[10px] text-white/40">updated {new Date(signals.at).toLocaleTimeString()}</span>
          </li>
        </ul>
      </section>

      {/* ── 24h distribution ── */}
      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">24h tier distribution</h3>
          <button onClick={() => { clearCascadeMetrics(); refreshRecords(); }}
            className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20">
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
                <div className={`absolute inset-y-0 left-0 ${b.tier === 5 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${b.pct.toFixed(1)}%` }} />
              </div>
              <span className="w-20 text-right text-[11px] text-white/60">{b.count} ({b.pct.toFixed(0)}%){b.avgLatencyMs != null && <> · {b.avgLatencyMs}ms</>}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Fallback reasons ── */}
      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <h3 className="font-semibold">Why we fell back (24h)</h3>
        {Object.keys(summary.fallbackReasons).length === 0 ? (
          <p className="mt-1 text-xs text-white/50">No fallbacks recorded.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {Object.entries(summary.fallbackReasons).sort((a,b) => b[1]-a[1]).map(([code, n]) => (
              <li key={code} className="flex items-center justify-between text-xs">
                <span>{REASON_LABELS[code] ?? code}</span>
                <span className="font-mono text-white/60">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Recent requests ── */}
      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <h3 className="font-semibold">Recent requests (last 25)</h3>
        {recentRequests.length === 0 ? (
          <p className="mt-1 text-xs text-white/50">No recorded requests yet. Send a message to Zoe to populate.</p>
        ) : (
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
            {recentRequests.map((r, i) => (
              <li key={`${r.at}-${i}`} className="flex items-center gap-2 text-[11px]">
                <span className="text-white/40">{new Date(r.at).toLocaleTimeString()}</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono">{r.selectedTier ? `T${r.selectedTier}` : '✗'}</span>
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
