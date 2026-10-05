import { describe, it, expect, beforeEach } from 'vitest';
import { doorAction, takeKey, useDoor, getStory, __resetStory } from '@/lib/vrStory';
describe('M\'Mora World doors and keys', () => {
  beforeEach(() => __resetStory());
  it('stays locked without the key, opens with it, then says already open', () => {
    expect(doorAction('archive_door', { keys: [], open: [] }).result).toBe('locked');
    expect(useDoor('archive_door').result).toBe('locked');
    takeKey('archive_key');
    expect(getStory().keys).toContain('archive_key');
    expect(useDoor('archive_door').result).toBe('open');
    expect(getStory().open).toContain('archive_door');
    expect(useDoor('archive_door').result).toBe('already');
  });
});
