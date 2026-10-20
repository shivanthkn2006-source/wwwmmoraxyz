import { describe, expect, it } from 'vitest';
import {
  constantTimeEqual, failureOutcome, hashCode, isWeakCode, newSaltHex,
} from '../../supabase/functions/_shared/quick-unlock-rules';

describe('quick unlock weak codes', () => {
  it('refuses all-same codes', () => {
    expect(isWeakCode('11111')).toBe(true);
    expect(isWeakCode('00000')).toBe(true);
  });
  it('refuses straight runs up and down', () => {
    expect(isWeakCode('12345')).toBe(true);
    expect(isWeakCode('54321')).toBe(true);
    expect(isWeakCode('78901')).toBe(true);
  });
  it('refuses anything that is not exactly 5 digits', () => {
    expect(isWeakCode('1234')).toBe(true);
    expect(isWeakCode('123456')).toBe(true);
    expect(isWeakCode('12a45')).toBe(true);
  });
  it('accepts an ordinary code', () => {
    expect(isWeakCode('48203')).toBe(false);
  });
});

describe('quick unlock wrong-try ladder', () => {
  it('5 wrong tries = 1 minute wait', () => {
    expect(failureOutcome(5)).toEqual({ state: 'locked', waitMs: 60_000 });
  });
  it('10 wrong tries = 15 minute wait', () => {
    expect(failureOutcome(10)).toEqual({ state: 'locked', waitMs: 15 * 60_000 });
  });
  it('15 wrong tries erases the code', () => {
    expect(failureOutcome(15).state).toBe('erased');
  });
  it('other wrong tries do not wait', () => {
    expect(failureOutcome(3).state).toBe('wrong');
  });
});

describe('quick unlock hashing', () => {
  it('same code + salt matches, other code does not', async () => {
    const salt = newSaltHex();
    const a = await hashCode('48203', salt, 1000);
    expect(constantTimeEqual(a, await hashCode('48203', salt, 1000))).toBe(true);
    expect(constantTimeEqual(a, await hashCode('48204', salt, 1000))).toBe(false);
  });
  it('different salts give different stored values', async () => {
    expect(await hashCode('48203', newSaltHex(), 1000)).not.toBe(await hashCode('48203', newSaltHex(), 1000));
  });
});
