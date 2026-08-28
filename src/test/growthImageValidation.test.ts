import { describe, expect, it } from 'vitest';
import {
  buildGrowthImagePrompt,
  extractNamedPerson,
  growthImageSeed,
  resolveGrowthImageSubject,
} from '@/lib/growthCardImageSubject';

describe('growth card content-to-image subject', () => {
  it('detects a real person named in the card', () => {
    expect(
      extractNamedPerson(
        "Franklin's 15-Minute Focus",
        'Benjamin Franklin used short, deliberate planning sessions each morning.',
      ),
    ).toBe('Benjamin Franklin');
  });

  it('resolves a possessive title name when the body confirms it', () => {
    expect(extractNamedPerson("Franklin's Rule", 'Franklin planned every day in advance.')).toBe('Franklin');
  });

  it('returns no person for generic advice', () => {
    expect(
      extractNamedPerson('Afternoon Recharge', 'Step away from the desk and take a short walk today.'),
    ).toBeNull();
  });

  it('pins the named person in the prompt', () => {
    const subject = resolveGrowthImageSubject(
      "Franklin's 15-Minute Focus",
      'Benjamin Franklin used short, deliberate planning sessions.',
    );
    const prompt = buildGrowthImagePrompt(subject, 'Career');
    expect(prompt).toContain('Depict Benjamin Franklin');
    expect(prompt).toContain('Never substitute');
  });

  it('forbids faces when no person is named, and on the faceless fallback', () => {
    const generic = resolveGrowthImageSubject('Afternoon Recharge', 'Take a short walk.');
    expect(buildGrowthImagePrompt(generic, 'Wellbeing')).toContain('no human faces');

    const named = resolveGrowthImageSubject("Franklin's Focus", 'Benjamin Franklin planned daily.');
    expect(buildGrowthImagePrompt(named, 'Career', { facelessFallback: true })).toContain('no human faces');
  });

  it('produces a different seed per attempt but is stable per attempt', () => {
    expect(growthImageSeed('a', 0)).toBe(growthImageSeed('a', 0));
    expect(growthImageSeed('a', 1)).not.toBe(growthImageSeed('a', 0));
  });
});
