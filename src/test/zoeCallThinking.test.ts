import { describe, expect, it } from 'vitest';
import { buildZoeCallWhisper, isZoeThinkRequest, MAX_ZOE_WHISPER_PROMPTS, ZOE_THINK_REQUEST } from '@/features/calls/zoeCallThinking';
import { createWordsEntry } from '@/features/calls/wordsOnlyMode';

describe('Zoe in-call thinking', () => {
  it('recognises music talk and offers real music actions', () => {
    const whisper = buildZoeCallWhisper([createWordsEntry('remote', 'play that mood song from the playlist')]);
    expect(whisper.topic).toBe('music');
    expect(whisper.prompts.length).toBeLessThanOrEqual(MAX_ZOE_WHISPER_PROMPTS);
  });

  it('suggests words only when the line sounds broken', () => {
    const whisper = buildZoeCallWhisper([createWordsEntry('local', 'you are breaking up, the signal is bad')]);
    expect(whisper.topic).toBe('connection');
    expect(whisper.prompts[0]).toContain('words only');
  });

  it('stays quiet and generic with nothing to go on', () => {
    expect(buildZoeCallWhisper([]).topic).toBe('general');
  });

  it('only accepts well-formed think requests', () => {
    expect(isZoeThinkRequest({ kind: ZOE_THINK_REQUEST, transcript: [] })).toBe(true);
    expect(isZoeThinkRequest({ kind: 'other', transcript: [] })).toBe(false);
    expect(isZoeThinkRequest('nope')).toBe(false);
  });
});
