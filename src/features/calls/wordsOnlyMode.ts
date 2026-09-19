// ═══════════════════════════════════════════════════════════════════════════════
// ULTRA-LOW-DATA CALL MODE — "send words, not pixels"
// When the network collapses, video is dropped and short sanitized text lines are
// exchanged over the existing private call data channel (parsed in the worker).
// ═══════════════════════════════════════════════════════════════════════════════

export const WORDS_ONLY_ENVELOPE_TYPE = 'call-words' as const;
export const WORDS_ONLY_MODE_ENVELOPE_TYPE = 'call-words-mode' as const;

export const WORDS_ONLY_PACKET_LOSS_THRESHOLD = 12;
export const WORDS_ONLY_RTT_THRESHOLD_MS = 900;
export const MAX_WORDS_MESSAGE_LENGTH = 400;
export const MAX_WORDS_TRANSCRIPT_ENTRIES = 30;

export interface CallWordsEntry {
  id: string;
  from: 'local' | 'remote';
  text: string;
  at: number;
}

export function shouldEnterWordsOnlyMode(diagnostics: {
  packetLossPercent?: number;
  roundTripTimeMs?: number | null;
}): boolean {
  const loss = typeof diagnostics.packetLossPercent === 'number' ? diagnostics.packetLossPercent : 0;
  const rtt = typeof diagnostics.roundTripTimeMs === 'number' ? diagnostics.roundTripTimeMs : null;
  if (loss >= WORDS_ONLY_PACKET_LOSS_THRESHOLD) return true;
  return rtt !== null && rtt >= WORDS_ONLY_RTT_THRESHOLD_MS;
}

export function sanitizeCallWords(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.slice(0, MAX_WORDS_MESSAGE_LENGTH);
}

export function createWordsEntry(from: CallWordsEntry['from'], text: string): CallWordsEntry {
  return {
    id: `${from}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from,
    text,
    at: Date.now(),
  };
}

export function appendWordsEntry(
  transcript: CallWordsEntry[],
  entry: CallWordsEntry,
): CallWordsEntry[] {
  const next = [...transcript, entry];
  return next.length > MAX_WORDS_TRANSCRIPT_ENTRIES
    ? next.slice(next.length - MAX_WORDS_TRANSCRIPT_ENTRIES)
    : next;
}
