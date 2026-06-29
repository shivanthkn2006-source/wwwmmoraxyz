/**
 * Daily deep-root scan scheduler.
 * Runs an automatic scan at most once per 24h (relative to last run) that:
 *  1. Pings /provider-health (with ping=true)
 *  2. Probes the live zoe-infinity-brain cascade with a tiny prompt
 *  3. Reads runtime signals (hormones · fusion · urgent call)
 *  4. Records a compact result row to localStorage history (max 30 entries)
 * Exposes runDeepRootScanNow() for manual runs and getDeepRootScanHistory().
 */
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getRuntimeSignals } from '@/utils/zoeRuntimeSignalBus';

export interface DeepRootScanResult {
  at: string;
  ok: boolean;
  health: { healthy: number[]; degraded: number[]; missing: number[]; primary: number | null } | null;
  cascade: { selectedTier: number | null; latencyMs: number; attempts: number; ok: boolean } | null;
  signals: { hormonesPhase: string; fusion: string; urgentCall: boolean };
  notes?: string;
}

const LS_KEY = 'zoe_deep_root_scan_history_v1';
const MAX_ENTRIES = 30;
const ONE_DAY_MS = 24 * 60 * 60_000;

export function getDeepRootScanHistory(): DeepRootScanResult[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as DeepRootScanResult[]) : [];
  } catch { return []; }
}

function appendHistory(entry: DeepRootScanResult) {
  const cur = getDeepRootScanHistory();
  cur.push(entry);
  while (cur.length > MAX_ENTRIES) cur.shift();
  try { localStorage.setItem(LS_KEY, JSON.stringify(cur)); } catch {}
  window.dispatchEvent(new CustomEvent('zoe:deep-root-scan', { detail: entry }));
}

export async function runDeepRootScanNow(): Promise<DeepRootScanResult> {
  const sig = getRuntimeSignals();
  const entry: DeepRootScanResult = {
    at: new Date().toISOString(),
    ok: false,
    health: null,
    cascade: null,
    signals: {
      hormonesPhase: sig.hormones.phase,
      fusion: `${sig.fusion.emotion}@${sig.fusion.intensity.toFixed(2)}`,
      urgentCall: sig.urgentCall,
    },
  };

  try {
    const { data: hData } = await supabase.functions.invoke('provider-health', { body: { ping: true } });
    if (hData?.summary) {
      entry.health = {
        healthy: hData.summary.healthyTiers ?? [],
        degraded: hData.summary.degradedTiers ?? [],
        missing: hData.summary.missingKeyTiers ?? [],
        primary: hData.summary.primaryHealthy ?? null,
      };
    }
  } catch (e: any) {
    entry.notes = `health: ${e?.message ?? e}`;
  }

  try {
    const t0 = performance.now();
    const { data: bData, error: bErr } = await supabase.functions.invoke('zoe-infinity-brain', {
      body: {
        messages: [{ role: 'user', content: 'Cascade probe: reply with just OK.' }],
        mode: 'fast',
        determinism: { mode: 'deterministic', temperature: 0, topP: 1, reasoningEffort: 'low', requireCitations: false, requireCritique: false },
      },
    });
    if (bErr) throw bErr;
    entry.cascade = {
      selectedTier: bData?._diag?.selectedTier ?? null,
      latencyMs: Math.round(performance.now() - t0),
      attempts: Array.isArray(bData?._diag?.attempts) ? bData._diag.attempts.length : 0,
      ok: !!bData?.response,
    };
  } catch (e: any) {
    entry.notes = (entry.notes ? entry.notes + ' | ' : '') + `cascade: ${e?.message ?? e}`;
  }

  entry.ok = !!entry.cascade?.ok && (entry.health?.healthy.length ?? 0) > 0;
  appendHistory(entry);
  return entry;
}

export function useDeepRootScanScheduler() {
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      const hist = getDeepRootScanHistory();
      const last = hist[hist.length - 1];
      const lastAt = last ? new Date(last.at).getTime() : 0;
      if (Date.now() - lastAt >= ONE_DAY_MS) {
        if (!cancelled) runDeepRootScanNow().catch(() => {});
      }
    };
    const initial = setTimeout(check, 30_000);
    const t = setInterval(check, 60 * 60_000); // hourly gate; only fires once per 24h
    return () => { cancelled = true; clearTimeout(initial); clearInterval(t); };
  }, []);
}

export default useDeepRootScanScheduler;
