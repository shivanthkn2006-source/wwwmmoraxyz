import { describe, it, expect } from 'vitest';
import {
  needsWebGrounding,
  buildWebGroundingBlock,
  buildWebSources,
} from '../../supabase/functions/_shared/web-grounding';

describe('web grounding', () => {
  it('grounds outside-world questions', () => {
    expect(needsWebGrounding('What is the latest news about SpaceX Starship?', 8)).toBe(true);
    expect(needsWebGrounding('who is the UN secretary general', 5)).toBe(true);
  });

  it('skips purely personal platform questions when recall already answered', () => {
    expect(needsWebGrounding('show me my latest DHF essay', 6)).toBe(false);
  });

  it('grounds when the platform index returned almost nothing', () => {
    expect(needsWebGrounding('quantum annealing hardware vendors', 0)).toBe(true);
  });

  it('numbers web citations after the platform ones and keeps real URLs', () => {
    const hits = [
      { title: 'Starship', snippet: 'Rocket', url: 'https://example.com/a', source: 'Wikipedia', publishedAt: null },
    ];
    const block = buildWebGroundingBlock(hits, 3);
    expect(block).toContain('(4)');
    expect(block).toContain('https://example.com/a');
    const sources = buildWebSources(hits, 3);
    expect(sources[0].citationId).toBe(4);
    expect(sources[0].entityType).toBe('web');
    expect(sources[0].route).toBe('https://example.com/a');
  });
});
