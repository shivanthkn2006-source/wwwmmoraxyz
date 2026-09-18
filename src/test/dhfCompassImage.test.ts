import { describe, expect, it } from 'vitest';
import { buildDhfImageBrief, DHF_IMAGE_PROMPT_VERSION } from '../../supabase/functions/_shared/dhf-compass-image';

describe('Zoe DHF image contract', () => {
  const input = {
    category: 'Wealth & Decisions',
    headline: 'Navigating Financial Decisions with Confidence',
    shortSummary: 'Review a real budget before making one calculated long-term investment.',
    fullStory: 'Open the figures at your desk, compare the risks calmly, and choose the one decision that protects future stability. Keep the second sentence practical too.',
    astrologicalContext: 'Moon in Taurus; Jupiter trine natal Mercury',
    seed: 8401,
  };

  it('grounds the visual in the headline, message and concrete story action', () => {
    const brief = buildDhfImageBrief(input);
    expect(brief.prompt).toContain(input.category);
    expect(brief.prompt).toContain(input.headline);
    expect(brief.prompt).toContain(input.shortSummary);
    expect(brief.prompt).toContain('Open the figures at your desk');
  });

  it('stays short enough for the image model to keep the subject', () => {
    expect(buildDhfImageBrief(input).prompt.length).toBeLessThan(1200);
  });

  it('never leaks raw chart data, only a lighting mood', () => {
    const { prompt } = buildDhfImageBrief(input);
    expect(prompt).not.toContain('natal Mercury');
    expect(prompt).toMatch(/Lighting mood: .+ light/);
  });

  it('requires colour oil painting and a full-bleed scene, with no negative clauses', () => {
    const { prompt } = buildDhfImageBrief(input);
    expect(prompt).toMatch(/Fine-art oil painting in rich natural colour/i);
    expect(prompt).toMatch(/full-bleed wide cinematic composition/i);
    expect(prompt).not.toMatch(/\bno (frame|words|canvas)\b/i);
  });

  it('is deterministic and carries an auditable version and fingerprint', () => {
    const first = buildDhfImageBrief(input);
    const second = buildDhfImageBrief(input);
    expect(first).toEqual(second);
    expect(first.promptVersion).toBe(DHF_IMAGE_PROMPT_VERSION);
    expect(first.promptHash).toMatch(/^[a-f0-9]{8}$/);
    expect(first.url).toContain('nologo=true');
    expect(first.url).toContain('private=true');
  });
});
