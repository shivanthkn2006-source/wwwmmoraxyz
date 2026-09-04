/**
 * Client-side hidden-scratchpad filter.
 *
 * Mirror of `supabase/functions/_shared/grounded-tools.ts` — the server already
 * strips scratchpad blocks, this is the second net so a leak from ANY provider
 * (zoe-chat, offline model, cached reply) never reaches the UI or the TTS
 * teleprompter.
 */

const BLOCK_RE = /<(scratchpad|thinking|think)>[\s\S]*?<\/\1>/gi;
const OPEN_RE = /<(?:scratchpad|thinking|think)>/i;
const ENVELOPE_RE = /"(internal_monologue|final_response|uncertain_claims|clarifying_question)"\s*:/;

/**
 * Pull the spoken answer out of a metacognition JSON envelope that reached the
 * client raw — complete OR truncated mid-string (max_tokens). The private
 * 4-region monologue must never be shown or read aloud.
 */
export function salvageFinalResponse(raw: string): string | null {
  const m = /"final_response"\s*:\s*"/.exec(raw);
  if (!m) return null;
  let out = '';
  let escaped = false;
  for (let i = m.index + m[0].length; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) {
      out += ch === 'n' ? '\n' : ch === 't' ? '\t' : ch === 'u' ? '\\u' : ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') break;
    out += ch;
  }
  out = out.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).trim();
  return out.length >= 2 ? out : null;
}

export function isMetacognitionEnvelope(text: string): boolean {
  return ENVELOPE_RE.test(text ?? '');
}

export function stripScratchpad(text: string): string {
  if (!text) return '';
  let out = text.replace(BLOCK_RE, '');
  const open = out.search(OPEN_RE);
  if (open !== -1) out = out.slice(0, open);
  out = out.trim();
  if (isMetacognitionEnvelope(out)) {
    // Prefer the structured answer; if the envelope was cut before it began,
    // show nothing rather than the monologue (caller supplies a spoken fallback).
    out = salvageFinalResponse(out) ?? '';
  }
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

export function extractScratchpad(text: string): string[] {
  return [...String(text ?? '').matchAll(/<(scratchpad|thinking|think)>([\s\S]*?)<\/\1>/gi)]
    .map((m) => m[2].trim())
    .filter(Boolean);
}

export function hasScratchpad(text: string): boolean {
  return OPEN_RE.test(text ?? '');
}
