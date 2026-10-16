import { describe, it, expect } from 'vitest';
import { saveMoved } from '@/lib/vrSaveGame';
const prev = { at: 1, mode: 'mmora' as const, origin: { lat: 0, lng: 0 }, pos: [1, 2.4, 1] as [number, number, number], yaw: 0.5 };
describe('save only when the member moved', () => {
  it('standing still keeps the old save', () => expect(saveMoved(prev, 'mmora', [1.01, 2.4, 1], 0.505)).toBe(false));
  it('walking saves', () => expect(saveMoved(prev, 'mmora', [1.5, 2.4, 1], 0.5)).toBe(true));
  it('turning saves', () => expect(saveMoved(prev, 'mmora', [1, 2.4, 1], 0.6)).toBe(true));
  it('changing world saves', () => expect(saveMoved(prev, 'real', [1, 2.4, 1], 0.5)).toBe(true));
});
