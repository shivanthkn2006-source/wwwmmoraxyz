import { describe, it, expect } from 'vitest';
import { FOCUS_AREAS as UI_FOCUS_AREAS } from '@/lib/growthSlot';
import {
  FOCUS_AREAS as ENGINE_FOCUS_AREAS,
  sanitizeFocusAreas,
} from '../../supabase/functions/_shared/growth-content';

/**
 * Regression guard. The settings UI offered ten focus areas while the engine
 * whitelist held six, so sanitizeFocusAreas silently dropped four of them and
 * the member fell back to the default area on every card.
 */
describe('focus-area parity between the settings UI and the growth engine', () => {
  it('offers exactly the same areas on both sides', () => {
    expect([...ENGINE_FOCUS_AREAS].sort()).toEqual([...UI_FOCUS_AREAS].sort());
  });

  it('keeps every area a member can actually pick in the UI', () => {
    for (const area of UI_FOCUS_AREAS) {
      expect(sanitizeFocusAreas([area])).toEqual([area]);
    }
  });

  it('keeps a full ten-area selection intact instead of trimming to the old six', () => {
    expect(sanitizeFocusAreas([...UI_FOCUS_AREAS])).toHaveLength(UI_FOCUS_AREAS.length);
  });

  it('still rejects values no member could have chosen', () => {
    expect(sanitizeFocusAreas(['Astrology', ''])).not.toContain('Astrology');
  });

  it('falls back to a usable default when nothing valid is supplied', () => {
    expect(sanitizeFocusAreas([]).length).toBeGreaterThan(0);
  });
});
