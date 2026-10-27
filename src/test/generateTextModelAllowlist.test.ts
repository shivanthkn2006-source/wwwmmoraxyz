import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ALLOWED_MODELS, selectModel, SERVER_IMAGE_MODEL } from '../../supabase/functions/generate-text/model-policy';

const src = readFileSync('supabase/functions/generate-text/index.ts', 'utf8');

describe('generate-text model allowlist', () => {
  it('only accepts the approved models', () => {
    expect([...ALLOWED_MODELS]).toEqual([
      'google/gemini-2.5-flash',
      'google/gemini-2.5-flash-image-preview',
      'google/gemini-3-pro-image-preview',
    ]);
    expect(src).toContain('z.enum(ALLOWED_MODELS)');
  });

  it('refuses unknown models', () => {
    expect(() => selectModel('openai/gpt-5', false)).toThrow('MODEL_NOT_ALLOWED');
  });

  it('text work never uses an image model', () => {
    expect(selectModel('google/gemini-2.5-flash', false).selectedModel).toBe('google/gemini-2.5-flash');
    expect(selectModel(undefined, false).selectedModel).toBe('google/gemini-2.5-flash');
  });

  it('image work uses only the server-chosen image model', () => {
    expect(selectModel('google/gemini-2.5-flash', true).selectedModel).toBe(SERVER_IMAGE_MODEL);
    expect(selectModel('google/gemini-3-pro-image-preview', false).selectedModel).toBe(SERVER_IMAGE_MODEL);
  });

  it('checks the request before any AI call', () => {
    expect(src.indexOf('requestSchema.parse(body)')).toBeLessThan(src.indexOf('model: selectedModel'));
  });
});
