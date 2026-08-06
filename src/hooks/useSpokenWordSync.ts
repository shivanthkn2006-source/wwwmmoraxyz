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
import type { TTSAudioMetadata } from '@/utils/zoeTTSAudioBus';

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
 * an average 5-char word lands near 595ms, and punctuation adds a pause.
 */
const ESTIMATOR_BASE_MS = 185;
const ESTIMATOR_PER_CHAR_MS = 82;
const ESTIMATOR_COMMA_PAUSE_MS = 260;
const ESTIMATOR_SENTENCE_PAUSE_MS = 650;
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

const endsSentence = (word: string) => /[.!?…]["')\]]*$/.test(word);

/** Normalize a token for cross-list matching (markdown / punctuation agnostic). */
const normalizeToken = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Align the tokens the TTS engine actually speaks (markdown stripped, whitespace
 * collapsed) with the tokens rendered on screen. Without this, every markdown
 * marker or removed token shifts the highlight off by one or more words.
 * Returns spokenIndex -> displayIndex.
 */
export function alignSpokenToDisplay(
  spoken: SpokenToken[],
  display: SpokenToken[]
): number[] {
  const map = new Array<number>(spoken.length).fill(-1);
  let cursor = 0;
  for (let s = 0; s < spoken.length; s++) {
    const target = normalizeToken(spoken[s].text);
    let found = -1;
    if (target) {
      const limit = Math.min(display.length, cursor + 10);
      for (let d = cursor; d < limit; d++) {
        if (normalizeToken(display[d].text) === target) {
          found = d;
          break;
        }
      }
    }
    if (found === -1) {
      map[s] = Math.min(cursor, Math.max(0, display.length - 1));
    } else {
      map[s] = found;
      cursor = found + 1;
    }
  }
  return map;
}

/** Range of word indices belonging to the sentence containing `wordIndex`. */
export function computeSentenceRange(
  tokens: SpokenToken[],
  wordIndex: number
): { start: number; end: number; index: number } | null {
  if (wordIndex < 0 || wordIndex >= tokens.length) return null;
  let start = wordIndex;
  while (start > 0 && !endsSentence(tokens[start - 1]?.text ?? '')) start--;
  let end = wordIndex;
  while (end < tokens.length - 1 && !endsSentence(tokens[end]?.text ?? '')) end++;

  // Ordinal sentence number (0-based) of the sentence we landed on.
  let index = 0;
  for (let i = 0; i < start; i++) {
    if (endsSentence(tokens[i].text)) index++;
  }
  return { start, end, index };
}

export function useSpokenWordSync(messageId: string | undefined, text: string) {
  // Rendered tokens (what the user sees)
  const displayTokens = useMemo(() => tokenizeForSpeech(text ?? ''), [text]);
  const segments = useMemo(() => buildSegments(text ?? '', displayTokens), [text, displayTokens]);

  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
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

  /** spokenIndex -> displayIndex, so the highlight lands on the right word. */
  const spokenToDisplay = useMemo(
    () => alignSpokenToDisplay(spokenTokens, displayTokens),
    [spokenTokens, displayTokens]
  );

  const boundarySeenRef = useRef(false);
  const startedAtRef = useRef(0);
  const audioRef = useRef<HTMLMediaElement | null>(null);
  const audioMetadataRef = useRef<TTSAudioMetadata | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastIndexRef = useRef(-1);
  const activeSessionIdRef = useRef<string | null>(null);

  /**
   * Commit a new spoken-word index.
   * Monotonic on purpose: chunked Deepgram audio restarts `currentTime` at 0
   * for every chunk and the estimator can lag behind boundary events, which
   * used to yank the highlight (and the scroll position) backwards.
   */
  const commitIndex = useRef((index: number) => {});
  commitIndex.current = (index: number) => {
    if (index < 0 || index >= tokens.length) return;
    if (index <= lastIndexRef.current) return;
    lastIndexRef.current = index;
    setActiveWordIndex(index);
  };


  // ── Session tracking ────────────────────────────────────────────────────
  useEffect(() => {
    if (!messageId) return;
    return subscribeSpokenSession((session) => {
      const active = !!session && session.messageId === messageId;
      setIsActive(active);
      if (active) {
        const activeSession = session;
        const isNewSession = activeSessionIdRef.current !== activeSession.messageId;
        activeSessionIdRef.current = activeSession.messageId;
        startedAtRef.current = activeSession.startedAt;
        setIsPaused(Boolean(activeSession.isPaused));

        if (isNewSession) {
          boundarySeenRef.current = false;
          lastIndexRef.current = 0;
          audioRef.current = null;
          audioMetadataRef.current = null;
          setSpokenText(activeSession.text);
          setActiveWordIndex(0);
        }
      } else {
        activeSessionIdRef.current = null;
        lastIndexRef.current = -1;
        setIsPaused(false);
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
      audioMetadataRef.current = null;
      return;
    }
    return subscribeTTSAudio((audio, metadata) => {
      audioRef.current = audio;
      audioMetadataRef.current = metadata;
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

      if (isPaused) return;

      // Real boundary events win — nothing to compute here.
      if (boundarySeenRef.current) return;

      const elapsed = Date.now() - startedAtRef.current;
      const audio = audioRef.current;
      const audioMetadata = audioMetadataRef.current;
      let fraction: number | null = null;

      if (audio && isFinite(audio.duration) && audio.duration > 0) {
        const audioFraction = Math.max(0, Math.min(1, audio.currentTime / audio.duration));
        if (
          audioMetadata &&
          Number.isFinite(audioMetadata.charStart) &&
          Number.isFinite(audioMetadata.charEnd) &&
          audioMetadata.charEnd > audioMetadata.charStart
        ) {
          const charIndex = audioMetadata.charStart +
            (audioMetadata.charEnd - audioMetadata.charStart) * audioFraction;
          const index = charIndexToWord(tokens, charIndex);
          if (index !== lastIndexRef.current) {
            lastIndexRef.current = index;
            setActiveWordIndex(index);
          }
          return;
        }

        fraction = audioFraction;
      } else if (elapsed > BOUNDARY_GRACE_MS) {
        // Estimator: total time derived from the same per-word weights,
        // stretched by the actual voice rate so it never outruns the speech.
        const rate = getSpokenSpeechRate();
        fraction = elapsed / (weights.total / rate);
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
  }, [isActive, isPaused, tokens.length, weights]);

  const sentenceRange = useMemo(
    () => (isActive ? computeSentenceRange(displayTokens, activeWordIndex) : null),
    [isActive, displayTokens, activeWordIndex]
  );

  return {
    isActive,
    isPaused,
    activeWordIndex,
    activeSentenceIndex: sentenceRange?.index ?? -1,
    sentenceRange,
    tokens,
    segments,
  };
}

export default useSpokenWordSync;
