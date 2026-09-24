import { describe, expect, it } from 'vitest';
import { rankLifeProjectionFeed, type LifeRankablePost } from '../features/feed/lifeProjectionRank';

const now = Date.parse('2026-09-24T08:00:00Z');
const post = (over: Partial<LifeRankablePost>): LifeRankablePost => ({
  id: 'p', user_id: 'u', content: 'hello', created_at: '2026-09-24T07:00:00Z', ...over,
});

const signals = (over: Partial<Parameters<typeof rankLifeProjectionFeed>[1]> = {}) => ({
  interests: [], closeFriends: new Map<string, number>(), upcomingBirthdayIds: new Set<string>(),
  planetaryKeywords: [], now, ...over,
});

describe('life-projection feed ranking', () => {
  it('puts a close friend above a stranger posted at the same time', () => {
    const ranked = rankLifeProjectionFeed(
      [post({ id: 'stranger', user_id: 'x' }), post({ id: 'friend', user_id: 'f' })],
      signals({ closeFriends: new Map([['f', 20]]) }),
    );
    expect(ranked[0].id).toBe('friend');
  });

  it('lifts a post matching the member’s own interests', () => {
    const ranked = rankLifeProjectionFeed(
      [post({ id: 'generic', content: 'just a day' }), post({ id: 'match', content: 'morning cycling route' })],
      signals({ interests: ['cycling'] }),
    );
    expect(ranked[0].id).toBe('match');
  });

  it('lifts posts from friends with an upcoming birthday', () => {
    const ranked = rankLifeProjectionFeed(
      [post({ id: 'other', user_id: 'a' }), post({ id: 'birthday', user_id: 'b' })],
      signals({ upcomingBirthdayIds: new Set(['b']) }),
    );
    expect(ranked[0].id).toBe('birthday');
  });

  it('never lets planetary affinity outrank a close friend', () => {
    const ranked = rankLifeProjectionFeed(
      [post({ id: 'planet', user_id: 'x', content: 'jupiter transit energy' }), post({ id: 'friend', user_id: 'f' })],
      signals({ closeFriends: new Map([['f', 30]]), planetaryKeywords: ['jupiter transit energy'] }),
    );
    expect(ranked[0].id).toBe('friend');
  });

  it('keeps the feed finite and stable for equal scores', () => {
    const items = [post({ id: 'a' }), post({ id: 'b' }), post({ id: 'c' })];
    expect(rankLifeProjectionFeed(items, signals()).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});
