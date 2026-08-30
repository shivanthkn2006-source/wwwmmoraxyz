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

import { alertCopy } from '@/hooks/useGlobalNotificationAlerts';

describe('alert copy', () => {
  it('maps known types to friendly titles', () => {
    expect(alertCopy({ id: '1', type: 'post_like' }).title).toBe('New like');
  });
  it('falls back safely and reads context previews', () => {
    const c = alertCopy({ id: '2', type: 'unknown', context_data: { preview: 'hi' } });
    expect(c.title).toBe('New notification');
    expect(c.description).toBe('hi');
  });
});
