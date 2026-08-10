import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  registerUnseenPosts,
  readUnseenPostIds,
  reconcileUnseenPosts,
  markPostsSeen,
  syncUnseenPostSnapshot,
  __resetUnseenMemoryStore,
} from '@/lib/newPostGate';
import NewContentBadge from '@/components/NewContentBadge';

const TAB = 'global';

describe('newPostGate storage/race resilience', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetUnseenMemoryStore();
    vi.restoreAllMocks();
  });

  it('keeps unseen IDs in memory when localStorage writes throw', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    registerUnseenPosts(TAB, ['a', 'b']);
    expect([...readUnseenPostIds(TAB)]).toEqual(['a', 'b']);
  });

  it('survives corrupted localStorage payloads without losing memory state', () => {
    registerUnseenPosts(TAB, ['a']);
    window.localStorage.setItem('mmora.home.unseenPosts.global', '{not json');
    expect([...readUnseenPostIds(TAB)]).toEqual(['a']);
  });

  it('ignores non-string entries in stored payloads', () => {
    window.localStorage.setItem('mmora.home.unseenPosts.global', JSON.stringify(['a', 1, null, '']));
    expect([...readUnseenPostIds(TAB)]).toEqual(['a']);
  });

  it('does not wipe unseen IDs when a feed snapshot arrives empty (race)', () => {
    registerUnseenPosts(TAB, ['a', 'b']);
    const result = reconcileUnseenPosts(TAB, []);
    expect([...result].sort()).toEqual(['a', 'b']);
  });

  it('still drops IDs that are genuinely gone from a non-empty snapshot', () => {
    registerUnseenPosts(TAB, ['a', 'b']);
    expect([...reconcileUnseenPosts(TAB, ['b', 'c'])]).toEqual(['b']);
  });

  it('marks seen even when storage reads fail', () => {
    registerUnseenPosts(TAB, ['a', 'b']);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    markPostsSeen(TAB, ['a']);
    expect(readUnseenPostIds(TAB).has('a')).toBe(false);
    expect(readUnseenPostIds(TAB).has('b')).toBe(true);
  });

  it('keeps badge state consistent between global and friends feeds', () => {
    syncUnseenPostSnapshot('global', ['a'], ['a', 'b'], 'realtime');
    syncUnseenPostSnapshot('personal', ['x'], ['x', 'y'], 'realtime');
    expect([...readUnseenPostIds('global')]).toEqual(['b']);
    expect([...readUnseenPostIds('personal')]).toEqual(['y']);
  });
});

describe('NewContentBadge fallback behaviour', () => {
  const OriginalIO = globalThis.IntersectionObserver;

  afterEach(() => {
    globalThis.IntersectionObserver = OriginalIO;
    vi.useRealTimers();
  });

  it('stays visible when IntersectionObserver is unavailable', () => {
    // @ts-expect-error simulating an unsupported environment
    delete globalThis.IntersectionObserver;
    const onViewed = vi.fn();
    render(<div><NewContentBadge onViewed={onViewed} /></div>);
    expect(screen.getByTestId('new-content-badge')).toBeTruthy();
    expect(onViewed).not.toHaveBeenCalled();
  });

  it('stays visible when the observer constructor throws', () => {
    globalThis.IntersectionObserver = class {
      constructor() { throw new Error('boom'); }
    } as unknown as typeof IntersectionObserver;
    const onViewed = vi.fn();
    render(<div><NewContentBadge onViewed={onViewed} /></div>);
    expect(screen.getByTestId('new-content-badge')).toBeTruthy();
    expect(onViewed).not.toHaveBeenCalled();
  });

  it('dismisses only after sustained visibility', () => {
    vi.useFakeTimers();
    let trigger: ((entries: unknown[]) => void) | null = null;
    globalThis.IntersectionObserver = class {
      constructor(cb: (entries: unknown[]) => void) { trigger = cb; }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
      root = null; rootMargin = ''; thresholds = [];
    } as unknown as typeof IntersectionObserver;

    const onViewed = vi.fn();
    render(<div><NewContentBadge onViewed={onViewed} /></div>);

    act(() => { trigger?.([{ isIntersecting: true, intersectionRatio: 0.9 }]); });
    act(() => { vi.advanceTimersByTime(1000); });
    // scrolled away before the threshold — must not dismiss
    act(() => { trigger?.([{ isIntersecting: false, intersectionRatio: 0 }]); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onViewed).not.toHaveBeenCalled();
    expect(screen.queryByTestId('new-content-badge')).toBeTruthy();

    act(() => { trigger?.([{ isIntersecting: true, intersectionRatio: 0.9 }]); });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onViewed).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('new-content-badge')).toBeNull();
  });
});
