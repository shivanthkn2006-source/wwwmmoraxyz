/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { isZoeAudioEnabled, hasZoeAudioChoice, setZoeAudioEnabled } from '@/lib/zoeAudioPreference';
import { hasSeenZoeGreeting, markZoeGreetingSeen, ZOE_GREETING_SOURCES } from '@/config/zoeGreeting';

describe('Zoe audio master preference', () => {
  beforeEach(() => localStorage.clear());

  it('is on by default so nobody has to enable it in settings', () => {
    expect(hasZoeAudioChoice()).toBe(false);
    expect(isZoeAudioEnabled()).toBe(true);
  });

  it('only turns off when the owner explicitly disables it', () => {
    setZoeAudioEnabled(false);
    expect(isZoeAudioEnabled()).toBe(false);
    setZoeAudioEnabled(true);
    expect(isZoeAudioEnabled()).toBe(true);
  });
});

describe('Zoe greeting film', () => {
  beforeEach(() => localStorage.clear());

  it('plays once per account and never again', () => {
    expect(hasSeenZoeGreeting('user-1')).toBe(false);
    markZoeGreetingSeen('user-1');
    expect(hasSeenZoeGreeting('user-1')).toBe(true);
    expect(hasSeenZoeGreeting('user-2')).toBe(false);
  });

  it('has a fallback source so a missing file can never wedge the overlay', () => {
    expect(ZOE_GREETING_SOURCES.length).toBeGreaterThan(1);
  });
});
