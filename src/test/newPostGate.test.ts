/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  advanceOnePass,
  createOnePassQueue,
  detectNewArrivals,
  getUnseenPostIds,
  markPostsSeen,
  readUnseenPostIds,
  readSeenPostIds,
  reconcileUnseenPosts,
  registerUnseenPosts,
} from '@/lib/newPostGate';

describe('newPostGate', () => {
  beforeEach(() => localStorage.clear());

  it('tracks seen IDs independently for global and friends tabs', () => {
    markPostsSeen('global', ['g1']);
    markPostsSeen('personal', ['f1']);
    expect([...readSeenPostIds('global')]).toEqual(['g1']);
    expect([...readSeenPostIds('personal')]).toEqual(['f1']);
    expect(getUnseenPostIds('global', ['g1', 'g2'])).toEqual(['g2']);
  });

  it.each(['initial', 'manual'] as const)('never arms on %s load', (source) => {
    expect(detectNewArrivals([], ['p1', 'p2'], source)).toEqual({
      knownIds: ['p1', 'p2'], newIds: [], shouldAutoScroll: false,
    });
  });

  it('arms only IDs introduced by a realtime arrival', () => {
    expect(detectNewArrivals(['p1'], ['p2', 'p1'], 'realtime')).toEqual({
      knownIds: ['p2', 'p1'], newIds: ['p2'], shouldAutoScroll: true,
    });
  });

  it('creates a deduplicated queue and completes exactly one pass', () => {
    const queue = createOnePassQueue(['n1', 'n2', 'n1']);
    expect(queue).toEqual(['n1', 'n2']);
    expect(advanceOnePass(queue, 0)).toEqual({ completed: false, nextIndex: 1 });
    expect(advanceOnePass(queue, 1)).toEqual({ completed: true, nextIndex: 0 });
  });

  it('uses persisted unseen IDs as the shared badge and auto-scroll source', () => {
    registerUnseenPosts('global', ['g2']);
    registerUnseenPosts('personal', ['f2']);
    expect([...readUnseenPostIds('global')]).toEqual(['g2']);
    expect([...readUnseenPostIds('personal')]).toEqual(['f2']);
    expect([...reconcileUnseenPosts('global', ['g2', 'g1'])]).toEqual(['g2']);
  });

  it('removes a viewed post from unseen state without affecting the other feed', () => {
    registerUnseenPosts('global', ['shared']);
    registerUnseenPosts('personal', ['shared']);
    markPostsSeen('global', ['shared']);
    expect([...readUnseenPostIds('global')]).toEqual([]);
    expect([...readUnseenPostIds('personal')]).toEqual(['shared']);
  });
});