// ═══════════════════════════════════════════════════════════════════════════
// Zoe Metacognition — strict parser, tunable confidence gate, metrics tracker.
// Shared by zoe-core-intelligence and any other function emitting the
// metacognitive JSON contract.
// ═══════════════════════════════════════════════════════════════════════════

export const BRAIN_REGIONS = [
  'PREFRONTAL_CORTEX',
  'AMYGDALA',
  'HIPPOCAMPUS',
  'ACC',
] as const;

export type BrainRegion = typeof BRAIN_REGIONS[number];

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

export interface Metacognition {
  internal_monologue: string[];
  monologue_regions: string[];
  confidence: number;
  threshold: number;
  uncertain_claims: string[];
  clarifying_question: string | null;
  final_response: string;
  withheld: boolean;
  parse_ok: boolean;
  parse_error: string | null;
  backtracked: boolean;
  discarded_assumption: string | null;
  difficulty: 'trivial' | 'moderate' | 'hard' | null;
}

/** Clamp any incoming threshold into a sane, deterministic band. */
export function resolveThreshold(raw?: unknown): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : DEFAULT_CONFIDENCE_THRESHOLD;
  return Math.min(0.95, Math.max(0.05, n));
}

function toStringArray(value: unknown, limit = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0)
    .slice(0, limit);
}

/** Pull the `[REGION]` tag out of a monologue line, if present. */
export function extractRegions(monologue: string[]): string[] {
  const found: string[] = [];
  for (const line of monologue) {
    const m = line.match(/^\s*\[?([A-Z_]{3,24})\]?\s*[:\-]/);
    const tag = m?.[1];
    if (tag && (BRAIN_REGIONS as readonly string[]).includes(tag)) found.push(tag);
  }
  return found;
}

/** Extract the outermost balanced JSON object from arbitrary model output. */
function isolateJson(raw: string): string | null {
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Never throws. Any malformed / prose / partial output degrades to a safe
 * fallback where the raw text becomes the final response.
 */
export function parseMetacognition(raw: string, thresholdInput?: number): Metacognition {
  const threshold = resolveThreshold(thresholdInput);

  const fallback = (error: string | null): Metacognition => ({
    internal_monologue: [],
    monologue_regions: [],
    confidence: threshold,
    threshold,
    uncertain_claims: [],
    clarifying_question: null,
    final_response: (raw || '').trim(),
    withheld: false,
    parse_ok: false,
    parse_error: error,
    backtracked: false,
    discarded_assumption: null,
    difficulty: null,
  });

  if (!raw || !raw.trim()) return fallback('empty_output');

  const json = isolateJson(raw);
  if (!json) return fallback('no_json_object');

  let obj: Record<string, unknown>;
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fallback('not_an_object');
    }
    obj = parsed as Record<string, unknown>;
  } catch (e) {
    return fallback(`json_error:${e instanceof Error ? e.message.slice(0, 120) : 'unknown'}`);
  }

  const finalResponse = typeof obj.final_response === 'string' ? obj.final_response.trim() : '';
  if (!finalResponse) return fallback('missing_final_response');

  const rawConfidence = obj.confidence;
  const numericConfidence =
    typeof rawConfidence === 'number' && Number.isFinite(rawConfidence)
      ? rawConfidence
      : typeof rawConfidence === 'string' && rawConfidence.trim() !== '' && Number.isFinite(Number(rawConfidence))
        ? Number(rawConfidence)
        : threshold;
  // Models sometimes emit 0-100 instead of 0-1.
  const scaled = numericConfidence > 1 && numericConfidence <= 100 ? numericConfidence / 100 : numericConfidence;
  const confidence = Math.min(1, Math.max(0, scaled));

  const monologue = toStringArray(obj.internal_monologue, 8);
  const uncertain = toStringArray(obj.uncertain_claims, 8);
  const clarifying =
    typeof obj.clarifying_question === 'string' && obj.clarifying_question.trim()
      ? obj.clarifying_question.trim()
      : null;

  const difficultyRaw = typeof obj.difficulty === 'string' ? obj.difficulty.toLowerCase().trim() : '';
  const difficulty =
    difficultyRaw === 'trivial' || difficultyRaw === 'moderate' || difficultyRaw === 'hard'
      ? (difficultyRaw as 'trivial' | 'moderate' | 'hard')
      : null;

  // Deterministic gate: below threshold AND a question exists ⇒ withhold.
  const withheld = confidence < threshold && !!clarifying;

  return {
    internal_monologue: monologue,
    monologue_regions: extractRegions(monologue),
    confidence,
    threshold,
    uncertain_claims: uncertain,
    clarifying_question: clarifying,
    final_response: finalResponse,
    withheld,
    parse_ok: true,
    parse_error: null,
    backtracked: obj.backtracked === true,
    discarded_assumption:
      typeof obj.discarded_assumption === 'string' && obj.discarded_assumption.trim()
        ? obj.discarded_assumption.trim()
        : null,
    difficulty,
  };
}

/** Cheap heuristic fast-pass gate — avoids the full 4-region pass on trivia. */
export function assessDifficulty(command: string): 'trivial' | 'moderate' | 'hard' {
  const text = (command || '').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const lower = text.toLowerCase();

  const trivialPatterns =
    /^(hi|hey|hello|yo|thanks|thank you|ok|okay|cool|good (morning|afternoon|evening|night)|bye|zoe)\b/;
  if (words <= 6 && trivialPatterns.test(lower)) return 'trivial';
  if (words <= 4 && !/\?/.test(text)) return 'trivial';

  const hardSignals = /(why|compare|analyz|strateg|architect|trade-?off|design|plan|debug|prove|explain how|implication)/;
  if (words > 40 || hardSignals.test(lower)) return 'hard';

  return 'moderate';
}

export interface MetricsRecord {
  userId: string;
  sessionId?: string | null;
  messageId?: string | null;
  mode?: string | null;
  deepMode: boolean;
  reasoningDepth?: number | null;
  fastPass: boolean;
  latencyMs?: number | null;
  promptExcerpt?: string | null;
}

/**
 * Fire-and-forget metrics write. Failures are logged, never thrown — telemetry
 * must never break a user-facing response.
 */
export async function logMetacognition(meta: Metacognition, rec: MetricsRecord): Promise<void> {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key || !rec.userId) return;

    const res = await fetch(`${url}/rest/v1/zoe_metacognition_log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: rec.userId,
        session_id: rec.sessionId ?? null,
        message_id: rec.messageId ?? null,
        mode: rec.mode ?? null,
        deep_mode: rec.deepMode,
        reasoning_depth: rec.reasoningDepth ?? null,
        confidence_score: meta.confidence,
        threshold: meta.threshold,
        withheld: meta.withheld,
        fast_pass: rec.fastPass,
        parse_ok: meta.parse_ok,
        parse_error: meta.parse_error,
        uncertain_claims: meta.uncertain_claims,
        clarifying_question: meta.clarifying_question,
        monologue_regions: meta.monologue_regions,
        prompt_excerpt: rec.promptExcerpt?.slice(0, 300) ?? null,
        response_excerpt: meta.final_response.slice(0, 300),
        latency_ms: rec.latencyMs ?? null,
      }),
    });

    if (!res.ok) {
      console.error('[metacognition] log failed', res.status, (await res.text()).slice(0, 200));
    }
  } catch (e) {
    console.error('[metacognition] log error', e instanceof Error ? e.message : e);
  }
}

/**
 * Recent correction history, folded into the system prompt so Zoe can
 * calibrate against her own past drift.
 */
export async function fetchDriftHints(userId: string, limit = 5): Promise<string[]> {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key || !userId) return [];

    const res = await fetch(
      `${url}/rest/v1/zoe_drift_corrections?user_id=eq.${userId}&order=created_at.desc&limit=${limit}` +
        `&select=correction_type,original_response,corrected_response,clarifying_question,clarification_answer,notes`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return [];

    const rows = (await res.json()) as Array<Record<string, string | null>>;
    return rows
      .map((r) => {
        if (r.clarifying_question && r.clarification_answer) {
          return `You asked "${r.clarifying_question}" — the answer was "${r.clarification_answer}".`;
        }
        if (r.corrected_response) {
          return `You previously said "${(r.original_response ?? '').slice(0, 120)}" and were corrected to "${r.corrected_response.slice(0, 160)}".`;
        }
        return r.notes ?? '';
      })
      .filter((s) => s.trim().length > 0);
  } catch {
    return [];
  }
}
