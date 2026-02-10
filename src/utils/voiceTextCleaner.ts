/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE TEXT CLEANER - "AUDIOBOOK KILLER" + "SAMANTHA PACING"
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * FIX 1: AUDIOBOOK KILLER
 * - Remove ALL text between asterisks *sighs softly* → ""
 * - Remove ALL text between parentheses (laughs) → ""
 * - She ACTS the emotion, she doesn't ANNOUNCE it
 * 
 * FIX 3: SAMANTHA PACING
 * - Split text on "..." into chunks
 * - Each chunk is spoken separately with silence between
 * - Creates intimate rhythm where user feels "held" in silence
 * 
 * USAGE:
 * const { chunks, hasMultipleChunks } = cleanAndSplitForVoice(text);
 * for (const chunk of chunks) {
 *   await speak(chunk);
 *   if (hasMultipleChunks) await sleep(1000);
 * }
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface VoiceTextResult {
  /** Cleaned text chunks, split on "..." */
  chunks: string[];
  /** Whether text was split (for pacing) */
  hasMultipleChunks: boolean;
  /** Original cleaned text (joined) */
  fullText: string;
  /** Detected emotional markers that were removed */
  removedMarkers: string[];
}

/**
 * 🎭 THE AUDIOBOOK KILLER
 * Removes all stage directions so Zoe PERFORMS instead of NARRATES
 */
export function cleanForVoice(text: string): { text: string; removedMarkers: string[] } {
  if (!text) return { text: '', removedMarkers: [] };
  
  const removedMarkers: string[] = [];
  
  let cleaned = text
    // === AUDIOBOOK KILLER: Remove stage directions ===
    // *sighs softly* → "" (completely removed, not spoken)
    .replace(/\*([^*]+)\*/g, (_match, content) => {
      removedMarkers.push(`*${content}*`);
      return '';
    })
    // (laughs nervously) → "" (completely removed)
    .replace(/\(([^)]+)\)/g, (_match, content) => {
      removedMarkers.push(`(${content})`);
      return '';
    })
    // [pause] [sigh] [ACTION:...] → "" (completely removed)
    .replace(/\[[^\]]+\]/g, (match) => {
      removedMarkers.push(match);
      return '';
    })
    // === SSML TAG CLEANUP (AI sometimes hallucinates these) ===
    // <break time="1.4s"/> → "" (Deepgram doesn't support SSML)
    .replace(/<break[^>]*\/?>/gi, '')
    // Remove any other SSML tags: <speak>, <prosody>, etc.
    .replace(/<\/?(speak|prosody|emphasis|say-as|sub|phoneme|audio|mark|desc|voice|lang|p|s|w)\b[^>]*>/gi, '')
    // === MARKDOWN/HTML CLEANUP ===
    // **bold** → bold (keep content)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // <html> tags → removed
    .replace(/<[^>]+>/g, '')
    // [[PATTERN:...]] → removed
    .replace(/\[\[[^\]]+\]\]/g, '')
    // === PERSONA PREFIXES ===
    .replace(/^Zoe:\s*/i, '')
    .replace(/^Smith:\s*/i, '')
    // === WHITESPACE CLEANUP ===
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove any leftover double spaces from removed content
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  
  return { text: cleaned, removedMarkers };
}

/**
 * 🎼 THE SAMANTHA PACING ENGINE
 * Splits text on "..." for intimate conversational rhythm
 * 
 * Input:  "I was thinking... maybe we could..."
 * Output: ["I was thinking", "maybe we could"]
 * 
 * Each chunk is spoken with a ~1 second pause between them
 */
export function splitForPacing(text: string): string[] {
  if (!text) return [];
  
  // Split on ellipsis (... or …)
  const chunks = text
    .split(/\.{3,}|…/)
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0);
  
  return chunks.length > 0 ? chunks : [text];
}

/**
 * 🎙️ MAIN FUNCTION: Clean and split text for human-level voice
 * Combines Audiobook Killer + Samantha Pacing
 */
export function cleanAndSplitForVoice(text: string): VoiceTextResult {
  const { text: cleaned, removedMarkers } = cleanForVoice(text);
  const chunks = splitForPacing(cleaned);
  
  return {
    chunks,
    hasMultipleChunks: chunks.length > 1,
    fullText: cleaned,
    removedMarkers,
  };
}

/**
 * 🔇 QUICK CLEAN: Just remove stage directions (for one-shot speaking)
 */
export function quickCleanForVoice(text: string): string {
  return cleanForVoice(text).text;
}

/**
 * ⏱️ PACING DELAY: Time to wait between chunks (ms)
 */
export const PACING_DELAY_MS = 1000;

/**
 * 🎭 LOG REMOVED MARKERS: Debug helper
 */
export function logRemovedMarkers(markers: string[]): void {
  if (markers.length > 0) {
    console.log('[VoiceCleaner] 🎭 Audiobook Killer removed:', markers.join(', '));
  }
}
