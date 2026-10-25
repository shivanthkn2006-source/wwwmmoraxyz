/**
 * The edit-image function reads only `imageBase64` / `imageUrl`. Callers that
 * send `image` silently fail with "Image data is required". Pin the field
 * names so the two repaired flows cannot regress.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('edit-image caller field names', () => {
  it('the function reads imageBase64 / imageUrl only', () => {
    const fn = read('supabase/functions/edit-image/index.ts');
    expect(fn).toContain('imageBase64');
  });
  it('PremiumImageGeneration sends imageBase64, not image', () => {
    const src = read('src/components/PremiumImageGeneration.tsx');
    const call = src.split("invoke('edit-image'")[1] ?? '';
    expect(call).toContain('imageBase64');
    expect(call).not.toMatch(/\bimage:\s*base64/);
  });
  it('WebdropPage edit flow sends imageBase64, not image', () => {
    const src = read('src/pages/WebdropPage.tsx');
    const calls = src.split("invoke('edit-image'").slice(1);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const call of calls) {
      const body = call.slice(0, 400);
      expect(body).toContain('imageBase64');
      expect(body).not.toMatch(/\bimage:\s*base64/);
    }
  });
});
