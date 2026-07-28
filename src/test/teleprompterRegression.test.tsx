// @vitest-environment jsdom
/**
 * Teleprompter regression — pause/resume freeze, replay and sentence tracking
 * ===========================================================================
 * Verifies that the highlight engine:
 *  - follows word boundaries exactly during speech,
 *  - freezes both word AND sentence highlighting while paused (zero drift),
 *  - unfreezes on resume without jumping ahead,
 *  - restarts cleanly on replay of the same message.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  startSpokenSession,
  endSpokenSession,
  publishSpokenProgress,
  pauseSpokenSession,
  resumeSpokenSession,
  getCurrentSpokenSession,
} from '@/utils/zoeSpokenWordBus';
import { useSpokenWordSync, computeSentenceRange, tokenizeForSpeech } from '@/hooks/useSpokenWordSync';

const TEXT = 'Hello there friend. How are you today? I am doing great.';

describe('computeSentenceRange', () => {
  const tokens = tokenizeForSpeech(TEXT);

  it('groups words into the sentence that contains them', () => {
    expect(computeSentenceRange(tokens, 0)).toMatchObject({ start: 0, end: 2, index: 0 });
    expect(computeSentenceRange(tokens, 4)).toMatchObject({ start: 3, end: 6, index: 1 });
    expect(computeSentenceRange(tokens, 8)).toMatchObject({ start: 7, end: 10, index: 2 });
  });

  it('returns null outside the token range', () => {
    expect(computeSentenceRange(tokens, -1)).toBeNull();
    expect(computeSentenceRange(tokens, 999)).toBeNull();
  });
});

describe('useSpokenWordSync — speak, pause, resume, replay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    endSpokenSession();
  });
  afterEach(() => {
    endSpokenSession();
    vi.useRealTimers();
  });

  const charOf = (wordIndex: number) => tokenizeForSpeech(TEXT)[wordIndex].start;

  it('tracks boundary events word-by-word and keeps the sentence in sync', () => {
    const { result } = renderHook(() => useSpokenWordSync('m1', TEXT));

    act(() => { startSpokenSession('m1', TEXT); });
    expect(result.current.isActive).toBe(true);

    act(() => { publishSpokenProgress(charOf(4)); });
    expect(result.current.activeWordIndex).toBe(4);
    expect(result.current.activeSentenceIndex).toBe(1);
    expect(result.current.sentenceRange).toMatchObject({ start: 3, end: 6 });
  });

  it('freezes word AND sentence highlighting while paused, with zero drift', () => {
    const { result } = renderHook(() => useSpokenWordSync('m1', TEXT));

    act(() => { startSpokenSession('m1', TEXT); });
    act(() => { publishSpokenProgress(charOf(4)); });

    const frozenWord = result.current.activeWordIndex;
    const frozenSentence = result.current.activeSentenceIndex;

    act(() => { pauseSpokenSession(); });
    expect(result.current.isPaused).toBe(true);

    // Time passing must not advance anything while paused.
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.activeWordIndex).toBe(frozenWord);
    expect(result.current.activeSentenceIndex).toBe(frozenSentence);

    act(() => { resumeSpokenSession(); });
    expect(result.current.isPaused).toBe(false);
    // Resuming must not jump — it stays where it froze until new progress arrives.
    expect(result.current.activeWordIndex).toBe(frozenWord);

    act(() => { publishSpokenProgress(charOf(8)); });
    expect(result.current.activeWordIndex).toBe(8);
    expect(result.current.activeSentenceIndex).toBe(2);
  });

  it('shifts the estimator start time forward by the paused duration', () => {
    act(() => { startSpokenSession('m1', TEXT); });
    const startedAt = getCurrentSpokenSession()!.startedAt;

    act(() => { pauseSpokenSession(); });
    act(() => { vi.advanceTimersByTime(3000); });
    act(() => { resumeSpokenSession(); });

    const after = getCurrentSpokenSession()!.startedAt;
    expect(after - startedAt).toBeGreaterThanOrEqual(2900);
  });

  it('resets highlighting to the first word when the message is replayed', () => {
    const { result } = renderHook(() => useSpokenWordSync('m1', TEXT));

    act(() => { startSpokenSession('m1', TEXT); });
    act(() => { publishSpokenProgress(charOf(9)); });
    expect(result.current.activeWordIndex).toBe(9);

    act(() => { endSpokenSession('m1'); });
    expect(result.current.isActive).toBe(false);
    expect(result.current.activeWordIndex).toBe(-1);

    act(() => { startSpokenSession('m1', TEXT); });
    expect(result.current.isActive).toBe(true);
    expect(result.current.activeWordIndex).toBe(0);
    expect(result.current.activeSentenceIndex).toBe(0);
  });

  it('ignores sessions belonging to a different message', () => {
    const { result } = renderHook(() => useSpokenWordSync('m1', TEXT));
    act(() => { startSpokenSession('m2', TEXT); });
    expect(result.current.isActive).toBe(false);
    act(() => { publishSpokenProgress(charOf(3)); });
    expect(result.current.activeWordIndex).toBe(-1);
  });
});
