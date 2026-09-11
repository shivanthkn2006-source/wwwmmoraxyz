import { describe, expect, it } from 'vitest';
import {
  buildCompanionTurn,
  classifyQuery,
  scopeAllowsPlatform,
  scopeAllowsWeb,
} from '@/lib/zoeSearchCompanion';

describe('zoe search companion', () => {
  it('stays silent for a single character', () => {
    expect(buildCompanionTurn('h')).toBeNull();
  });

  it('greets conversationally', () => {
    const turn = buildCompanionTurn('hello');
    expect(turn?.topic).toBe('greeting');
    expect(turn?.text).toMatch(/search M’Mora or the whole web/i);
  });

  it('classifies shopping and food queries', () => {
    expect(classifyQuery('best phone under 30000').topic).toBe('shopping');
    expect(classifyQuery('biryani near me').topic).toBe('food');
    expect(classifyQuery('weather today').topic).toBe('weather');
    expect(classifyQuery('@moksh50').topic).toBe('people');
  });

  it('searches both platform and web for visual media', () => {
    expect(classifyQuery('show me photos of Kochi')).toEqual({ topic: 'media', scope: 'both' });
  });

  it('asks before searching when nothing is remembered', () => {
    const turn = buildCompanionTurn('iphone 17');
    expect(turn?.auto).toBe(false);
    expect(turn?.options).toEqual(['mmora', 'web', 'both']);
  });

  it('goes straight ahead when the preference is known', () => {
    const turn = buildCompanionTurn('iphone 17', 'web');
    expect(turn?.auto).toBe(true);
    expect(turn?.options).toHaveLength(0);
    expect(turn?.text).toMatch(/Searching the web/i);
  });

  it('strips quotes from the spoken variant', () => {
    const turn = buildCompanionTurn('pizza places', 'both');
    expect(turn?.speech).not.toMatch(/[“”"]/);
  });

  it('gates retrieval lanes by scope', () => {
    expect(scopeAllowsWeb('mmora')).toBe(false);
    expect(scopeAllowsWeb('both')).toBe(true);
    expect(scopeAllowsPlatform('web')).toBe(false);
    expect(scopeAllowsPlatform(null)).toBe(true);
  });
});
