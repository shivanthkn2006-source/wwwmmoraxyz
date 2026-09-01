import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearValidationCooldown,
  isValidationCoolingDown,
  startValidationCooldown,
} from '@/lib/growthImageValidation';

describe('growth image validation cooldown', () => {
  beforeEach(() => {
    clearValidationCooldown();
    vi.useRealTimers();
  });

  it('is inactive by default', () => {
    expect(isValidationCoolingDown()).toBe(false);
  });

  it('pauses validation after the vision provider reports it is unavailable', () => {
    startValidationCooldown(60_000);
    expect(isValidationCoolingDown()).toBe(true);
  });

  it('expires once the window has passed', () => {
    startValidationCooldown(-1);
    expect(isValidationCoolingDown()).toBe(false);
  });

  it('can be cleared manually', () => {
    startValidationCooldown(60_000);
    clearValidationCooldown();
    expect(isValidationCoolingDown()).toBe(false);
  });
});
