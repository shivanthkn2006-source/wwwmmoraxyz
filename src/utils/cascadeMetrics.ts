/**
 * cascadeMetrics — client-side ring buffer of provider-tier selections.
 *
 * Edge functions emit `_diag: { selectedTier, attempts }` on every response.
 * We store the last N records in localStorage so the diagnostics panel can show:
 *   • which tier served each request
 *   • how often Lovable (T5, paid) was reached
 *   • a rough monthly-quota estimate to flag when Groq/Gemini quotas are saturating
 */

const STORAGE_KEY = 'zoe.cascade.metrics.v1';
const MAX_RECORDS = 250;

export interface CascadeAttempt {
  tier: number;
  ok: boolean;
  reasonCode: string;
  latencyMs: number;
}

export interface CascadeRecord {
  surface: string;
  selectedTier: number | null;
  attempts: CascadeAttempt[];
  latencyMs: number | null;
  at: number; // epoch ms
}

function safeLoad(): CascadeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeSave(records: CascadeRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-MAX_RECORDS)));
  } catch {
    /* quota — ignore */
  }
}

export function recordCascadeAttempt(rec: CascadeRecord): void {
  if (typeof window === 'undefined') return;
  const all = safeLoad();
  all.push(rec);
  safeSave(all);
  window.dispatchEvent(new CustomEvent('zoe:cascade-metric', { detail: rec }));
}

export function getCascadeRecords(): CascadeRecord[] {
  return safeLoad();
}

export function clearCascadeMetrics(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export interface TierSummary {
  tier: number;
  count: number;
  pct: number;
  avgLatencyMs: number | null;
}

export interface CascadeSummary {
  total: number;
  byTier: TierSummary[];
  lovableReliancePct: number;        // pct of requests where T5 served
  failurePct: number;                 // pct where no tier served
  lookbackHours: number;
  monthlyProjection: {
    estTotal: number;
    estLovableT5: number;
  };
  fallbackReasons: Record<string, number>;
}

export function summarizeCascade(lookbackHours = 24): CascadeSummary {
  const records = safeLoad();
  const cutoff = Date.now() - lookbackHours * 3_600_000;
  const recent = records.filter(r => r.at >= cutoff);
  const total = recent.length;

  const buckets = new Map<number, { count: number; lat: number[] }>();
  for (let i = 1; i <= 5; i++) buckets.set(i, { count: 0, lat: [] });
  let failures = 0;
  let lovableT5 = 0;
  const fallbackReasons: Record<string, number> = {};

  for (const rec of recent) {
    if (rec.selectedTier == null) failures++;
    else {
      const b = buckets.get(rec.selectedTier);
      if (b) {
        b.count++;
        if (rec.latencyMs != null) b.lat.push(rec.latencyMs);
      }
      if (rec.selectedTier === 5) lovableT5++;
    }
    // Tally fallback reasons from attempts that were tried before success
    for (const a of rec.attempts) {
      if (!a.ok && a.reasonCode) {
        fallbackReasons[a.reasonCode] = (fallbackReasons[a.reasonCode] ?? 0) + 1;
      }
    }
  }

  const byTier: TierSummary[] = [];
  for (let i = 1; i <= 5; i++) {
    const b = buckets.get(i)!;
    byTier.push({
      tier: i,
      count: b.count,
      pct: total ? (b.count / total) * 100 : 0,
      avgLatencyMs: b.lat.length ? Math.round(b.lat.reduce((s, x) => s + x, 0) / b.lat.length) : null,
    });
  }

  // Naive monthly projection: scale the lookback window to 30 days.
  const scale = (30 * 24) / lookbackHours;
  const monthlyProjection = {
    estTotal: Math.round(total * scale),
    estLovableT5: Math.round(lovableT5 * scale),
  };

  return {
    total,
    byTier,
    lovableReliancePct: total ? (lovableT5 / total) * 100 : 0,
    failurePct: total ? (failures / total) * 100 : 0,
    lookbackHours,
    monthlyProjection,
    fallbackReasons,
  };
}

export const TIER_LABELS: Record<number, string> = {
  1: 'T1 · Groq Llama-3.1-8B (primary)',
  2: 'T2 · Gemini 2.0 Flash',
  3: 'T3 · Llama-70B speed',
  4: 'T4 · OpenRouter Llama',
  5: 'T5 · Lovable Gateway (last-resort fallback)',
};
