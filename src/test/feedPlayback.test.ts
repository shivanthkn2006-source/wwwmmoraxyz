/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { __resetFeedPlaybackMemory, allowFeedMediaReplay, hasPlayedFeedMedia, markFeedMediaPlayed } from '@/lib/feedPlayback';

describe('feed playback view-once persistence', () => {
  beforeEach(() => { localStorage.clear(); __resetFeedPlaybackMemory(); });

  it('remembers completion per user and post across module memory resets', () => {
    markFeedMediaPlayed('user-a', 'post-1');
    __resetFeedPlaybackMemory();
    expect(hasPlayedFeedMedia('user-a', 'post-1')).toBe(true);
    expect(hasPlayedFeedMedia('user-b', 'post-1')).toBe(false);
  });

  it('allows only an explicit replay to clear completion', () => {
    markFeedMediaPlayed('user-a', 'post-1');
    allowFeedMediaReplay('user-a', 'post-1');
    expect(hasPlayedFeedMedia('user-a', 'post-1')).toBe(false);
  });
});