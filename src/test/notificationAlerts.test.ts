import { describe, it, expect } from 'vitest';
import { shouldAlert } from '@/hooks/useGlobalNotificationAlerts';

describe('global notification alerts', () => {
  it('alerts once per notification id', () => {
    const seen = new Set<string>();
    expect(shouldAlert({ id: 'a' }, seen)).toBe(true);
    seen.add('a');
    expect(shouldAlert({ id: 'a' }, seen)).toBe(false);
  });

  it('ignores malformed rows', () => {
    const seen = new Set<string>();
    expect(shouldAlert(null, seen)).toBe(false);
    expect(shouldAlert({ id: '' } as never, seen)).toBe(false);
  });
});
