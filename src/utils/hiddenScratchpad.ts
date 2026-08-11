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

export function stripScratchpad(text: string): string {
  if (!text) return '';
  let out = text.replace(BLOCK_RE, '');
  const open = out.search(OPEN_RE);
  if (open !== -1) out = out.slice(0, open);
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
