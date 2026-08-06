/**
 * Confidence gate — code-enforced withholding for Zoe's metacognition.
 *
 * A model will happily report low confidence and then assert anyway.
 * This module makes withholding a hard rule outside the prompt.
 */

export interface Metacognition {
  internalMonologue: string[];
  confidence: number;
  uncertainClaims: string[];
  clarifyingQuestion: string | null;
  needsClarification: boolean;
  deepMode: boolean;
}

export const CONFIDENCE_THRESHOLD = 0.6;

export interface GatedResponse {
  /** Text that is safe to display AND speak. */
  spokenText: string;
  /** True when Zoe withheld her answer and asked instead. */
  withheld: boolean;
  /** The original (withheld) answer, kept for "show anyway" affordances. */
  draftAnswer: string | null;
  confidence: number | null;
  uncertainClaims: string[];
  clarifyingQuestion: string | null;
}

export function isLowConfidence(meta?: Metacognition | null): boolean {
  if (!meta) return false;
  if (typeof meta.confidence === 'number' && meta.confidence < CONFIDENCE_THRESHOLD) return true;
  if (meta.needsClarification) return true;
  return (meta.uncertainClaims?.length ?? 0) > 0;
}

/**
 * Applies the gate. When confidence is low and a clarifying question exists,
 * the answer is withheld and the question is surfaced instead.
 */
export function applyConfidenceGate(
  message: string,
  meta?: Metacognition | null
): GatedResponse {
  const uncertainClaims = meta?.uncertainClaims?.filter(Boolean) ?? [];
  const clarifyingQuestion = meta?.clarifyingQuestion?.trim() || null;
  const confidence = typeof meta?.confidence === 'number' ? meta.confidence : null;

  if (isLowConfidence(meta) && clarifyingQuestion) {
    return {
      spokenText: clarifyingQuestion,
      withheld: true,
      draftAnswer: message,
      confidence,
      uncertainClaims,
      clarifyingQuestion,
    };
  }

  return {
    spokenText: message,
    withheld: false,
    draftAnswer: null,
    confidence,
    uncertainClaims,
    clarifyingQuestion,
  };
}

export interface TextSegment {
  text: string;
  uncertain: boolean;
}

/**
 * Splits text into segments so uncertain claims can be visually marked.
 * Matching is case-insensitive and non-overlapping; unmatched claims are ignored.
 */
export function markUncertainSpans(text: string, claims: string[]): TextSegment[] {
  const cleaned = (claims ?? []).map((c) => c?.trim()).filter((c): c is string => !!c);
  if (!text) return [];
  if (cleaned.length === 0) return [{ text, uncertain: false }];

  const lower = text.toLowerCase();
  const ranges: Array<[number, number]> = [];

  for (const claim of cleaned) {
    const idx = lower.indexOf(claim.toLowerCase());
    if (idx === -1) continue;
    const range: [number, number] = [idx, idx + claim.length];
    if (ranges.some(([s, e]) => range[0] < e && s < range[1])) continue;
    ranges.push(range);
  }

  if (ranges.length === 0) return [{ text, uncertain: false }];
  ranges.sort((a, b) => a[0] - b[0]);

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), uncertain: false });
    segments.push({ text: text.slice(start, end), uncertain: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), uncertain: false });
  return segments;
}
