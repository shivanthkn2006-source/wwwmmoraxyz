import { describe, expect, it } from 'vitest';
import { buildDhfImageBrief, DHF_IMAGE_PROMPT_VERSION } from '../../supabase/functions/_shared/dhf-compass-image';

describe('Zoe DHF image contract', () => {
  const input = {
    category: 'Wealth & Decisions',
    headline: 'Navigating Financial Decisions with Confidence',
    shortSummary: 'Review a real budget before making one calculated long-term investment.',
    fullStory: 'Open the figures, compare the risks, and choose the one decision that protects future stability.',
    astrologicalContext: 'Moon in Taurus; Jupiter trine natal Mercury',
    seed: 8401,
  };

  it('grounds the visual in every visible part of the card', () => {
    const brief = buildDhfImageBrief(input);
    expect(brief.prompt).toContain(input.category);
    expect(brief.prompt).toContain(input.headline);
    expect(brief.prompt).toContain(input.shortSummary);
    expect(brief.prompt).toContain(input.fullStory);
    expect(brief.prompt).toContain(input.astrologicalContext);
  });

  it('requires colour oil painting and bans generic mismatched output', () => {
    const { prompt } = buildDhfImageBrief(input);
    expect(prompt).toMatch(/full-colour fine-art oil painting/i);
    expect(prompt).toMatch(/concrete activity, decision, relationship, place or object/i);
    expect(prompt).toMatch(/no words.*logos.*watermarks.*monochrome.*grayscale/i);
  });

  it('is deterministic and carries an auditable version and fingerprint', () => {
    const first = buildDhfImageBrief(input);
    const second = buildDhfImageBrief(input);
    expect(first).toEqual(second);
    expect(first.promptVersion).toBe(DHF_IMAGE_PROMPT_VERSION);
    expect(first.promptHash).toMatch(/^[a-f0-9]{8}$/);
    expect(first.url).toContain('nologo=true');
  });
});