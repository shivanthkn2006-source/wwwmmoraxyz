import { describe, expect, it } from 'vitest';
import {
  MAX_WORDS_MESSAGE_LENGTH,
  MAX_WORDS_TRANSCRIPT_ENTRIES,
  appendWordsEntry,
  createWordsEntry,
  sanitizeCallWords,
  shouldEnterWordsOnlyMode,
} from '@/features/calls/wordsOnlyMode';

describe('words-only call mode', () => {
  it('stays off on a healthy connection', () => {
    expect(shouldEnterWordsOnlyMode({ packetLossPercent: 1.2, roundTripTimeMs: 90 })).toBe(false);
    expect(shouldEnterWordsOnlyMode({})).toBe(false);
  });

  it('engages on heavy packet loss or extreme latency', () => {
    expect(shouldEnterWordsOnlyMode({ packetLossPercent: 18, roundTripTimeMs: 120 })).toBe(true);
    expect(shouldEnterWordsOnlyMode({ packetLossPercent: 0, roundTripTimeMs: 1500 })).toBe(true);
  });

  it('sanitizes and caps outgoing words', () => {
    expect(sanitizeCallWords('  hello   there \n friend ')).toBe('hello there friend');
    expect(sanitizeCallWords('   ')).toBeNull();
    expect(sanitizeCallWords(42)).toBeNull();
    expect(sanitizeCallWords('x'.repeat(900))?.length).toBe(MAX_WORDS_MESSAGE_LENGTH);
  });

  it('keeps the transcript bounded', () => {
    let transcript = [] as ReturnType<typeof createWordsEntry>[];
    for (let i = 0; i < MAX_WORDS_TRANSCRIPT_ENTRIES + 12; i += 1) {
      transcript = appendWordsEntry(transcript, createWordsEntry('local', `line ${i}`));
    }
    expect(transcript).toHaveLength(MAX_WORDS_TRANSCRIPT_ENTRIES);
    expect(transcript[transcript.length - 1].text).toBe(`line ${MAX_WORDS_TRANSCRIPT_ENTRIES + 11}`);
  });
});
