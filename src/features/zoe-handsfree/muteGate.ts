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
const MUTED_CHECK_IN_RE = /(?:^|\b)(?:zoe|zoey)(?:\s*,?\s*(?:are\s+)?you\s+there|\s*,?\s*can\s+you\s+hear\s+me)(?:\b|$)/;
const YES_RE = /^(?:yes|yeah|yep|please|please\s+do|unmute|unmute\s+now|go\s+ahead)$/;
const NO_RE = /^(?:no|nope|not\s+yet)\b|(?:stay|keep|remain)\s+muted\b/;

let muted = false;
let awaitingUnmuteConfirmation = false;

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
  if (!next) awaitingUnmuteConfirmation = false;
  try {
    window.dispatchEvent(new CustomEvent('zoe-mute-changed', { detail: { muted } }));
  } catch {
    /* non-browser test environment */
  }
}

/** Test hook. */
export function resetMuteGate(): void {
  muted = false;
  awaitingUnmuteConfirmation = false;
}

export function isMuteCommand(text: string): boolean {
  return MUTE_RE.test(normalize(text));
}

/** Only "Zoe wake" / "wake up Zoe" lifts the mute. */
export function isWakeCommand(text: string): boolean {
  return UNMUTE_RE.test(normalize(text));
}

export type MuteDecision = 'pass' | 'muted-drop' | 'mute' | 'unmute' | 'ask-unmute' | 'keep-muted';

/** The single decision every voice surface asks before processing a transcript. */
export function gateTranscript(text: string): MuteDecision {
  const clean = normalize(text);
  if (!clean) return muted ? 'muted-drop' : 'pass';
  if (muted) {
    if (isWakeCommand(clean)) return 'unmute';
    if (awaitingUnmuteConfirmation && YES_RE.test(clean)) return 'unmute';
    if (awaitingUnmuteConfirmation && NO_RE.test(clean)) {
      awaitingUnmuteConfirmation = false;
      return 'keep-muted';
    }
    if (MUTED_CHECK_IN_RE.test(clean)) {
      awaitingUnmuteConfirmation = true;
      return 'ask-unmute';
    }
    return 'muted-drop';
  }
  if (isMuteCommand(clean)) return 'mute';
  return 'pass';
}
