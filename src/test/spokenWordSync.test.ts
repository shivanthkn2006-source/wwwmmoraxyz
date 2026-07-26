/**
 * Teleprompter sync — bus + tokenizer behaviour
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  startSpokenSession,
  endSpokenSession,
  publishSpokenProgress,
  subscribeSpokenSession,
  subscribeSpokenProgress,
  getCurrentSpokenSession,
} from '@/utils/zoeSpokenWordBus';
import { tokenizeForSpeech, buildSegments } from '@/hooks/useSpokenWordSync';

describe('zoeSpokenWordBus', () => {
  beforeEach(() => endSpokenSession());

  it('notifies subscribers when a session starts and ends', () => {
    const seen: (string | null)[] = [];
    const unsub = subscribeSpokenSession((s) => seen.push(s?.messageId ?? null));
    startSpokenSession('m1', 'Hello there friend');
    expect(getCurrentSpokenSession()?.messageId).toBe('m1');
    endSpokenSession('m1');
    unsub();
    expect(seen).toEqual([null, 'm1', null]);
  });

  it('ignores endSpokenSession for a different message', () => {
    startSpokenSession('m1', 'Hello');
    endSpokenSession('m2');
    expect(getCurrentSpokenSession()?.messageId).toBe('m1');
  });

  it('publishes progress scoped to the active session only', () => {
    const progress: number[] = [];
    const unsub = subscribeSpokenProgress((p) => progress.push(p.charIndex));
    publishSpokenProgress(5); // no session yet → dropped
    startSpokenSession('m1', 'Hello there friend');
    publishSpokenProgress(6, 5);
    publishSpokenProgress(12, 6);
    unsub();
    expect(progress).toEqual([6, 12]);
  });
});

describe('tokenizeForSpeech / buildSegments', () => {
  it('tokenizes words with absolute offsets', () => {
    const tokens = tokenizeForSpeech('Hello there  friend');
    expect(tokens.map((t) => t.text)).toEqual(['Hello', 'there', 'friend']);
    expect(tokens[2].start).toBe(13);
  });

  it('rebuilds the original text exactly from segments', () => {
    const text = '  Hi there,\n how are you? ';
    const segments = buildSegments(text, tokenizeForSpeech(text));
    expect(segments.map((s) => s.text).join('')).toBe(text);
    expect(segments.filter((s) => s.type === 'word')).toHaveLength(5);
  });
});
