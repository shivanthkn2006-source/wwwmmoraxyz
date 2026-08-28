/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { __resetFeedPlaybackMemory, allowFeedMediaReplay, hasPlayedFeedMedia, markFeedMediaPlayed } from '@/lib/feedPlayback';
import { __resetUnseenMemoryStore, markPostsSeen, readUnseenPostIds, registerUnseenPosts } from '@/lib/newPostGate';

describe('feed playback view-once persistence', () => {
  beforeEach(() => { localStorage.clear(); __resetFeedPlaybackMemory(); __resetUnseenMemoryStore(); });

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

  it('clears only the completed video New marker for the current user/feed', () => {
    const feedKey = 'loops:user-a';
    registerUnseenPosts(feedKey, ['post-1', 'post-2']);

    markFeedMediaPlayed('user-a', 'post-1');
    markPostsSeen(feedKey, ['post-1']);

    expect(hasPlayedFeedMedia('user-a', 'post-1')).toBe(true);
    expect([...readUnseenPostIds(feedKey)]).toEqual(['post-2']);
    expect(readUnseenPostIds('loops:user-b').has('post-1')).toBe(false);
  });
});