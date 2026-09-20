import { describe, expect, it } from 'vitest';
import {
  CALL_ACTIVITY_STATUSES,
  getCallActivityStatus,
} from '@/features/calls/callActivityStatuses';

describe('Calls activity status registry', () => {
  it('contains every Profile activity exactly once', () => {
    expect(CALL_ACTIVITY_STATUSES.map(status => status.value)).toEqual([
      'away', 'cooking', 'dining', 'driving', 'family_time', 'farming',
      'fitness', 'gaming', 'library', 'meditation', 'movie', 'online',
      'party', 'play', 'sleep', 'sports', 'studying', 'transit', 'traveling',
      'tv', 'vacation', 'work', 'yoga',
    ]);
    expect(new Set(CALL_ACTIVITY_STATUSES.map(status => status.value)).size).toBe(23);
  });

  it('uses line-icon components and falls back safely to Online', () => {
    CALL_ACTIVITY_STATUSES.forEach(status => expect(status.Icon).toBeTypeOf('object'));
    expect(getCallActivityStatus('work').label).toBe('Work');
    expect(getCallActivityStatus('not-a-status').label).toBe('Online');
  });
});