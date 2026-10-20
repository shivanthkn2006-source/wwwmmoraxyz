import { describe, it, expect } from 'vitest';
import { movementPose } from '@/lib/vrAvatarMotion';
import { validAvatarId } from '@/lib/vrAvatarChoice';

describe('village avatar visual state', () => {
  it('uses yellow/blue/red Zoe as the testing default', () => { expect(validAvatarId(null)).toBe('zoe-upload'); expect(validAvatarId('unknown')).toBe('zoe-upload'); });
  it('preserves explicit inspected avatar switches', () => { expect(validAvatarId('ready')).toBe('ready'); expect(validAvatarId('skirt')).toBe('skirt'); expect(validAvatarId('zoe-upload')).toBe('zoe-upload'); });
  it('reflects the real run state at the existing 6 m/s speed', () => { expect(movementPose(6, true, false, false)).toBe('running'); });
  it('uses a jump pose only when airborne', () => { expect(movementPose(0, false, true, false)).toBe('jumping'); expect(movementPose(0, false, false, false)).toBe('idle'); });
  it('steps up only during movement over a rising floor', () => { expect(movementPose(2.2, false, false, true)).toBe('climbing'); expect(movementPose(2.2, false, false, false)).toBe('walking'); });
});