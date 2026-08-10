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
  syncUnseenPostSnapshot,
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

  it.each([
    ['global', ['g1'], 'g2'],
    ['personal', ['f1'], 'f2'],
  ] as const)('uses one persisted snapshot for %s badges and auto-scroll', (tab, baseline, arrival) => {
    const initial = syncUnseenPostSnapshot(tab, [], [...baseline], 'initial');
    expect([...initial.unseenIds]).toEqual([]);

    const realtime = syncUnseenPostSnapshot(tab, [...baseline], [arrival, ...baseline], 'realtime');
    expect(realtime.newIds).toEqual([arrival]);
    expect(realtime.shouldAutoScroll).toBe(true);
    expect([...realtime.unseenIds]).toEqual([arrival]);
    expect([...readUnseenPostIds(tab)]).toEqual([arrival]);
  });

  it('preserves pending unseen IDs through later initial/manual completion order', () => {
    const realtime = syncUnseenPostSnapshot('personal', ['f1'], ['f2', 'f1'], 'realtime');
    expect([...realtime.unseenIds]).toEqual(['f2']);

    const delayedInitial = syncUnseenPostSnapshot('personal', [], ['f2', 'f1'], 'initial');
    expect([...delayedInitial.unseenIds]).toEqual(['f2']);

    const manual = syncUnseenPostSnapshot('personal', ['f2', 'f1'], ['f2', 'f1'], 'manual');
    expect([...manual.unseenIds]).toEqual(['f2']);
  });

  it('clears stale unseen IDs when either feed resolves to an empty snapshot', () => {
    registerUnseenPosts('global', ['gone']);
    registerUnseenPosts('personal', ['also-gone']);
    expect([...syncUnseenPostSnapshot('global', ['gone'], [], 'manual').unseenIds]).toEqual([]);
    expect([...syncUnseenPostSnapshot('personal', ['also-gone'], [], 'initial').unseenIds]).toEqual([]);
  });
});