import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('supabase/functions/generate-text/index.ts', 'utf8');

describe('generate-text model allowlist', () => {
  it('only accepts the approved models', () => {
    expect(src).toContain("model: z.enum(ALLOWED_MODELS)");
    const list = src.match(/ALLOWED_MODELS = \[([^\]]+)\]/)?.[1] ?? '';
    expect(list.match(/'[^']+'/g)).toEqual([
      "'google/gemini-2.5-flash'",
      "'google/gemini-2.5-flash-image-preview'",
      "'google/gemini-3-pro-image-preview'",
    ]);
  });

  it('checks the request before any AI call', () => {
    expect(src.indexOf('requestSchema.parse(body)')).toBeLessThan(src.indexOf('fetch('));
  });
});
