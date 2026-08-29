/**
 * @vitest-environment jsdom
 *
 * Edge cases for Growth card image subject resolution plus the caching,
 * config and logging layer that surrounds validation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildGrowthImagePrompt,
  extractNamedPerson,
  growthImageSeed,
  resolveGrowthImageSubject,
} from '@/lib/growthCardImageSubject';
import {
  DEFAULT_VALIDATION_CONFIG,
  clearValidationCache,
  clearValidationLog,
  getCachedValidation,
  getValidationConfig,
  getValidationLog,
  logValidation,
  setCachedValidation,
  setValidationConfig,
  validationCacheKey,
} from '@/lib/growthImageValidation';

beforeEach(() => {
  localStorage.clear();
  clearValidationCache();
  clearValidationLog();
});

describe('growth image subject edge cases', () => {
  it('returns no person when the card names nobody', () => {
    expect(extractNamedPerson('Evening Reset', 'Take ten slow breaths before you close the laptop.')).toBeNull();
  });

  it('ignores slot labels and generic capitalised words', () => {
    expect(extractNamedPerson('Strategic Review', 'Night Review: look back at Today and This Week.')).toBeNull();
  });

  it('detects a possessive title name that also appears in the body', () => {
    const person = extractNamedPerson("Franklin's 15-Minute Focus", 'Benjamin Franklin blocked his day into short sprints.');
    expect(person).toContain('Franklin');
  });

  it('picks the first named person when several are mentioned', () => {
    const person = extractNamedPerson('Deep Work', 'Marie Curie and Cal Newport both protected long quiet blocks.');
    expect(person).toBe('Marie Curie');
  });

  it('does not invent a person from a partially matching title', () => {
    // The title looks like a name but the body never mentions it.
    expect(extractNamedPerson("Monday's Momentum", 'Start with the smallest possible step.')).toBeNull();
  });

  it('forbids identifiable faces when no person is resolved', () => {
    const subject = resolveGrowthImageSubject('Evening Reset', 'Breathe before you close the laptop.');
    const prompt = buildGrowthImagePrompt(subject, 'focus');
    expect(prompt).toContain('no identifiable people');
  });

  it('drops the person on the faceless fallback attempt', () => {
    const subject = resolveGrowthImageSubject('Focus', 'Benjamin Franklin planned each morning.');
    const prompt = buildGrowthImagePrompt(subject, 'focus', { facelessFallback: true });
    expect(prompt).toContain('no identifiable people');
    expect(prompt).not.toContain('the real historical person');
  });

  it('produces a stable seed per attempt', () => {
    expect(growthImageSeed('card-a', 0)).toBe(growthImageSeed('card-a', 0));
    expect(growthImageSeed('card-a', 0)).not.toBe(growthImageSeed('card-a', 1));
  });
});

describe('validation config', () => {
  it('falls back to defaults with no stored value', () => {
    expect(getValidationConfig()).toEqual(DEFAULT_VALIDATION_CONFIG);
  });

  it('persists and clamps retries and strictness', () => {
    setValidationConfig({ retries: 99, strictness: 'strict' });
    const config = getValidationConfig();
    expect(config.retries).toBe(3);
    expect(config.strictness).toBe('strict');
  });

  it('survives corrupt stored config', () => {
    localStorage.setItem('mmora.growth.imageValidation.config', '{not json');
    expect(getValidationConfig()).toEqual(DEFAULT_VALIDATION_CONFIG);
  });
});

describe('validation cache', () => {
  it('reuses a verdict for the same image and strictness', () => {
    const key = validationCacheKey('https://img/a.jpg', 'balanced');
    setCachedValidation(key, true, 'looks right');
    expect(getCachedValidation(key)?.match).toBe(true);
  });

  it('keys separately per strictness', () => {
    const lenient = validationCacheKey('https://img/a.jpg', 'lenient');
    const strict = validationCacheKey('https://img/a.jpg', 'strict');
    setCachedValidation(lenient, true);
    expect(getCachedValidation(strict)).toBeNull();
  });

  it('clears on demand', () => {
    const key = validationCacheKey('https://img/b.jpg', 'balanced');
    setCachedValidation(key, false, 'wrong face');
    clearValidationCache();
    expect(getCachedValidation(key)).toBeNull();
  });
});

describe('validation log', () => {
  it('records mismatches with card context', () => {
    logValidation({
      cardKey: 'card-1',
      title: "Franklin's Focus",
      category: 'focus',
      person: 'Benjamin Franklin',
      attempt: 0,
      outcome: 'mismatch',
      reason: 'modern woman, not Franklin',
      imageUrl: 'https://img/a.jpg',
      strictness: 'balanced',
      cached: false,
    });
    const [entry] = getValidationLog();
    expect(entry.outcome).toBe('mismatch');
    expect(entry.person).toBe('Benjamin Franklin');
    expect(entry.reason).toContain('Franklin');
  });
});
