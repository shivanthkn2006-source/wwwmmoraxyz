import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('temporary testing default on both shared world consumers', () => {
  beforeEach(() => vi.resetModules());
  it('migrates the previous default once without changing inventory or saves', async () => {
    const store = new Map([['mmora-avatar-choice', 'skirt'], ['vr-gear', '["w870"]'], ['vr-save-game', 'existing']]);
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    await import('@/lib/vrAvatarChoice');
    expect(store.get('mmora-avatar-choice')).toBe('zoe-upload');
    expect(store.get('vr-gear')).toBe('["w870"]');
    expect(store.get('vr-save-game')).toBe('existing');
  });
  it('preserves a manual switch after migration on reload', async () => {
    const store = new Map([['mmora-avatar-choice', 'ready'], ['mmora-avatar-default-20261020', '1']]);
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    const choices = await import('@/lib/vrAvatarChoice');
    expect(store.get('mmora-avatar-choice')).toBe('ready');
    choices.setAvatarChoice('skirt');
    vi.resetModules(); await import('@/lib/vrAvatarChoice');
    expect(store.get('mmora-avatar-choice')).toBe('skirt');
  });
});