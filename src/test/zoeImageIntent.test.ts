import { describe, expect, it } from 'vitest';
import { buildZoeIdentityPrompt, detectZoeImageIntent, resolveZoeImageTurn } from '@/utils/zoeImageIntent';

describe('Zoe identity image intent', () => {
  it.each([
    'create my image',
    'can you create my cartoon?',
    'make a sketch of me',
    'draw me driving a car',
    'create a picture of me driving a car',
    'make my profile photo into a pencil sketch',
    'can you create an avatar of myself?',
    'turn my photo into an anime avatar',
  ])('routes account-holder request: %s', (prompt) => {
    const intent = detectZoeImageIntent(prompt);
    expect(intent.isImageRequest).toBe(true);
    expect(intent.isUserIdentityRequest).toBe(true);
    expect(intent.isZoeIdentityRequest).toBe(false);
  });

  it('keeps Zoe self portraits separate from account-holder portraits', () => {
    const intent = detectZoeImageIntent('create your own image');
    expect(intent.isZoeIdentityRequest).toBe(true);
    expect(intent.isUserIdentityRequest).toBe(false);
  });

  it.each([
    'why dont you wear a kerala saree?',
    'Zoe, show yourself wearing a Kerala mundu',
  ])('routes Zoe appearance follow-ups directly to image generation: %s', (prompt) => {
    const intent = detectZoeImageIntent(prompt);
    expect(intent.isImageRequest).toBe(true);
    expect(intent.isZoeIdentityRequest).toBe(true);
  });

  it.each([
    'create a circuit board diagram',
    'generate a market analysis chart',
    'make an infographic of this data',
  ])('supports visual deliverables: %s', (prompt) => {
    expect(detectZoeImageIntent(prompt).isImageRequest).toBe(true);
  });

  it('does not turn ordinary conversation into an image request', () => {
    expect(detectZoeImageIntent('I am driving a car today').isImageRequest).toBe(false);
  });

  it('resumes the original creation after a photo-only follow-up', () => {
    const turn = resolveZoeImageTurn('[Shared a image]', {
      prompt: 'create an image of mine sitting in a private jet',
      requestedAt: Date.now(),
    });
    expect(turn.resumed).toBe(true);
    expect(turn.prompt).toBe('create an image of mine sitting in a private jet');
    expect(turn.intent.isUserIdentityRequest).toBe(true);
  });

  it('keeps generic uploads in perception when no creation is pending', () => {
    const turn = resolveZoeImageTurn('[Shared a image]', null);
    expect(turn.resumed).toBe(false);
    expect(turn.intent.isImageRequest).toBe(false);
  });

  it('uses Zoe’s previous visual description when asked to render the above prompt', () => {
    const description = 'Zoe is wearing a traditional Kerala saree with a golden border beside a serene lake.';
    const turn = resolveZoeImageTurn('use this above prompt to create 1 image', null, [
      { role: 'user', content: 'wear a Kerala saree' },
      { role: 'zoe', content: description },
    ]);
    expect(turn.resumed).toBe(true);
    expect(turn.prompt).toBe(description);
    expect(turn.intent.isImageRequest).toBe(true);
  });

  it('preserves requested clothing and scene in Zoe generation prompts', () => {
    const prompt = buildZoeIdentityPrompt('wear a Kerala saree on a houseboat');
    expect(prompt).toContain('Kerala saree on a houseboat');
    expect(prompt).toContain('finished visual');
  });
});