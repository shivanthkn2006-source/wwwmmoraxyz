/**
 * useSpokenWordSync — Teleprompter word tracking for Zoe's speech
 * ================================================================
 * Returns the index of the word Zoe is currently speaking inside a message.
 *
 * Three timing sources, in priority order:
 *  1. Web Speech `onboundary` events (exact, published on zoeSpokenWordBus)
 *  2. The Deepgram <audio> element on zoeTTSAudioBus (currentTime / duration)
 *  3. A time-based estimator (last resort, when neither is available)
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  subscribeSpokenSession,
  subscribeSpokenProgress,
  getSpokenSpeechRate,
} from '@/utils/zoeSpokenWordBus';
import { subscribeTTSAudio } from '@/utils/zoeTTSAudioBus';

export interface SpokenToken {
  text: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  type: 'word' | 'gap';
  text: string;
  /** Word index (only for type === 'word') */
  index: number;
}

/**
 * Speech pacing used by the estimator.
 * Calibrated against Zoe's default browser voice (rate 0.9 ≈ 145 wpm):
 * an average 5-char word lands near 470ms, and punctuation adds a pause.
 */
const ESTIMATOR_BASE_MS = 150;
const ESTIMATOR_PER_CHAR_MS = 68;
const ESTIMATOR_COMMA_PAUSE_MS = 180;
const ESTIMATOR_SENTENCE_PAUSE_MS = 380;
/** How long we wait for a real boundary event before trusting other sources. */
const BOUNDARY_GRACE_MS = 600;

export function tokenizeForSpeech(text: string): SpokenToken[] {
  const tokens: SpokenToken[] = [];
  const re = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    tokens.push({ text: match[0], start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

export function buildSegments(text: string, tokens: SpokenToken[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let cursor = 0;
  tokens.forEach((token, index) => {
    if (token.start > cursor) {
      segments.push({ type: 'gap', text: text.slice(cursor, token.start), index: -1 });
    }
    segments.push({ type: 'word', text: token.text, index });
    cursor = token.end;
  });
  if (cursor < text.length) {
    segments.push({ type: 'gap', text: text.slice(cursor), index: -1 });
  }
  return segments;
}

/** Map an absolute character index onto a word index. */
function charIndexToWord(tokens: SpokenToken[], charIndex: number): number {
  if (tokens.length === 0) return -1;
  let lo = 0;
  let hi = tokens.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (tokens[mid].start <= charIndex) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

/** Cumulative "speech weight" per token so fraction → word mapping feels natural. */
function buildWeights(tokens: SpokenToken[]): { cumulative: number[]; total: number } {
  const cumulative: number[] = [];
  let running = 0;
  for (const token of tokens) {
    running += ESTIMATOR_BASE_MS + token.text.length * ESTIMATOR_PER_CHAR_MS;
    if (/[.!?…]["')\]]*$/.test(token.text)) running += ESTIMATOR_SENTENCE_PAUSE_MS;
    else if (/[,;:—-]$/.test(token.text)) running += ESTIMATOR_COMMA_PAUSE_MS;
    cumulative.push(running);
  }
  return { cumulative, total: running || 1 };
}

function fractionToWord(cumulative: number[], total: number, fraction: number): number {
  if (cumulative.length === 0) return -1;
  const target = Math.max(0, Math.min(1, fraction)) * total;
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function useSpokenWordSync(messageId: string | undefined, text: string) {
  // Rendered tokens (what the user sees)
  const displayTokens = useMemo(() => tokenizeForSpeech(text ?? ''), [text]);
  const segments = useMemo(() => buildSegments(text ?? '', displayTokens), [text, displayTokens]);

  const [isActive, setIsActive] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  // Spoken tokens (what the TTS engine actually reads — markdown stripped).
  // Word indices are matched by ordinal, so both lists stay aligned.
  const [spokenText, setSpokenText] = useState('');

  const spokenTokens = useMemo(
    () => (spokenText ? tokenizeForSpeech(spokenText) : displayTokens),
    [spokenText, displayTokens]
  );
  const weights = useMemo(() => buildWeights(spokenTokens), [spokenTokens]);
  const tokens = spokenTokens;

  const boundarySeenRef = useRef(false);
  const startedAtRef = useRef(0);
  const audioRef = useRef<HTMLMediaElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastIndexRef = useRef(-1);

  // ── Session tracking ────────────────────────────────────────────────────
  useEffect(() => {
    if (!messageId) return;
    return subscribeSpokenSession((session) => {
      const active = !!session && session.messageId === messageId;
      setIsActive(active);
      if (active) {
        boundarySeenRef.current = false;
        startedAtRef.current = session!.startedAt;
        lastIndexRef.current = -1;
        setSpokenText(session!.text);
        setActiveWordIndex(0);
      } else {
        lastIndexRef.current = -1;
        setActiveWordIndex(-1);
      }
    });

  }, [messageId]);

  // ── Source 1: exact word boundaries from the Web Speech API ─────────────
  useEffect(() => {
    if (!isActive || !messageId) return;
    return subscribeSpokenProgress((progress) => {
      if (progress.messageId !== messageId) return;
      boundarySeenRef.current = true;
      const index = charIndexToWord(tokens, progress.charIndex);
      if (index !== lastIndexRef.current) {
        lastIndexRef.current = index;
        setActiveWordIndex(index);
      }
    });
  }, [isActive, messageId, tokens]);

  // ── Source 2: the live TTS <audio> element ──────────────────────────────
  useEffect(() => {
    if (!isActive) {
      audioRef.current = null;
      return;
    }
    return subscribeTTSAudio((audio) => {
      audioRef.current = audio;
    });
  }, [isActive]);

  // ── Drive loop (audio position, or estimator when nothing else exists) ──
  useEffect(() => {
    if (!isActive || tokens.length === 0) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);

      // Real boundary events win — nothing to compute here.
      if (boundarySeenRef.current) return;

      const elapsed = Date.now() - startedAtRef.current;
      const audio = audioRef.current;
      let fraction: number | null = null;

      if (audio && isFinite(audio.duration) && audio.duration > 0) {
        fraction = audio.currentTime / audio.duration;
      } else if (elapsed > BOUNDARY_GRACE_MS) {
        // Estimator: total time derived from the same per-word weights.
        fraction = elapsed / weights.total;
      }

      if (fraction === null) return;
      const index = fractionToWord(weights.cumulative, weights.total, fraction);
      if (index !== lastIndexRef.current) {
        lastIndexRef.current = index;
        setActiveWordIndex(index);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isActive, tokens.length, weights]);

  return { isActive, activeWordIndex, tokens, segments };
}

export default useSpokenWordSync;
