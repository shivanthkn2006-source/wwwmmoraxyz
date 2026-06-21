// ═══════════════════════════════════════════════════════════════════════════════
// CITATION ENFORCER — Anti-Hallucination Layer 5
// When determinism=factual OR web-search was used, append [Source: URL] markers
// Used by: zoe-infinity-brain, zoe-system2-cortex, zoe-chat
// ═══════════════════════════════════════════════════════════════════════════════

export interface CitationConfig {
  required: boolean;
  sources?: Array<{ url: string; title?: string }>;
  enforceInline: boolean;
}

const CITATION_INSTRUCTION = `
## CITATION MODE — MANDATORY
You MUST append [Source: <URL or "training_data">] after every factual claim.
Format examples:
- "The capital of France is Paris [Source: https://en.wikipedia.org/wiki/Paris]"
- "NEET 2024 cutoff was 720 marks [Source: https://neet.nta.nic.in]"
- "Internal knowledge: water boils at 100°C [Source: training_data]"

If you do NOT have a verifiable source, prefix the claim with "Unverified:" instead of guessing.
NEVER fabricate URLs. Real sources only.
`.trim();

const ANTI_HALLUCINATION_INSTRUCTION = `
## ANTI-HALLUCINATION SAFETY NET
1. If you do NOT know the answer with high confidence, respond exactly: "I don't have verified information on that."
2. NEVER invent dates, names, statistics, citations, or URLs.
3. If asked for specifics on an obscure topic, admit uncertainty rather than guess.
4. When uncertain, say "Unverified:" before the claim.
`.trim();

/**
 * Inject citation + anti-hallucination instructions into a system prompt.
 * Idempotent — safe to call multiple times.
 */
export function enforceCitations(systemPrompt: string, config: CitationConfig): string {
  if (!config.required) return systemPrompt;
  if (systemPrompt.includes('CITATION MODE')) return systemPrompt; // already injected

  const sourceList = config.sources?.length
    ? `\n\n## AVAILABLE SOURCES\n${config.sources.map((s, i) =>
        `[${i + 1}] ${s.title ?? s.url} — ${s.url}`).join('\n')}\n\nCite these when relevant using [Source: <URL>].`
    : '';

  return `${systemPrompt}\n\n${ANTI_HALLUCINATION_INSTRUCTION}\n\n${CITATION_INSTRUCTION}${sourceList}`;
}

/**
 * Validate response: count [Source: …] markers vs sentences with factual signals.
 * Returns a "trust score" 0–1 — used downstream to decide if a critique loop should re-run.
 */
export function scoreCitationCompliance(response: string): {
  score: number;
  citationCount: number;
  unverifiedCount: number;
  factualClaimsApprox: number;
} {
  const citationCount = (response.match(/\[Source:[^\]]+\]/gi) || []).length;
  const unverifiedCount = (response.match(/\bUnverified:/gi) || []).length;

  // Rough factual-signal heuristic: numbers, proper nouns, dates
  const factualSignals = (response.match(
    /\b(\d{4}|\d+\s?(%|kg|km|mph|°[CF]|usd|inr|crore|lakh|million|billion)|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi
  ) || []).length;

  const factualClaimsApprox = Math.max(1, factualSignals);
  const covered = Math.min(citationCount + unverifiedCount, factualClaimsApprox);
  const score = covered / factualClaimsApprox;

  return { score, citationCount, unverifiedCount, factualClaimsApprox };
}
