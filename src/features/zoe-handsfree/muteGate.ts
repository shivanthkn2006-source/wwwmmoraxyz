/**
 * MUTE GATE
 * =========
 * One switch that decides whether anything a microphone hears is allowed to
 * reach Zoe at all.
 *
 * When muted, every transcript is dropped before recall, before the backend and
 * before speech. The ONLY thing that gets through is the explicit wake phrase
 * "Zoe wake" (and its close variants) — nothing else, not "hey Zoe", not a
 * question, not a command.
 */

const UNMUTE_RE = /(?:^|\b)(?:zoe|zoey)\s+wake(?:\s+up)?(?:\b|$)|(?:^|\b)wake\s+(?:up\s+)?(?:zoe|zoey)(?:\b|$)/;
const MUTE_RE = /(?:^|\b)(?:zoe\s+)?(?:mute|mute\s+yourself|stop\s+listening|don'?t\s+listen|deaf\s+mode)(?:\b|$)/;

let muted = false;

const normalize = (text: string) =>
  (text || '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function isZoeMuted(): boolean {
  return muted;
}

export function setZoeMuted(next: boolean): void {
  if (muted === next) return;
  muted = next;
  try {
    window.dispatchEvent(new CustomEvent('zoe-mute-changed', { detail: { muted } }));
  } catch {
    /* non-browser test environment */
  }
}

/** Test hook. */
export function resetMuteGate(): void {
  muted = false;
}

export function isMuteCommand(text: string): boolean {
  return MUTE_RE.test(normalize(text));
}

/** Only "Zoe wake" / "wake up Zoe" lifts the mute. */
export function isWakeCommand(text: string): boolean {
  return UNMUTE_RE.test(normalize(text));
}

export type MuteDecision = 'pass' | 'muted-drop' | 'mute' | 'unmute';

/** The single decision every voice surface asks before processing a transcript. */
export function gateTranscript(text: string): MuteDecision {
  const clean = normalize(text);
  if (!clean) return muted ? 'muted-drop' : 'pass';
  if (muted) return isWakeCommand(clean) ? 'unmute' : 'muted-drop';
  if (isMuteCommand(clean)) return 'mute';
  return 'pass';
}
