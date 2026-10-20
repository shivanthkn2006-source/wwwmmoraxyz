import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectionActive, resetInspection, returnInspectionLift, toggleInspection } from '@/lib/vrInspection';
import { orbit, AVATAR_AHEAD, CHASE_EYE_M } from '@/lib/vrView';
import { chase } from '@/lib/vrChaseCam';
import { avatarMotion } from '@/lib/vrAvatarMotion';
vi.mock('@/worlds/worldMode', () => ({ getWorldState: () => ({ mode: 'mmora' }) }));
describe('inspection through the existing chase camera', () => {
  beforeEach(() => { resetInspection(); orbit.lift = 0; });
  it('explicitly locks movement only while inspection is active', () => {
    expect(inspectionActive()).toBe(false); toggleInspection(); expect(inspectionActive()).toBe(true);
    toggleInspection(); expect(inspectionActive()).toBe(false);
  });
  it('returns toward body heading and approved lift without changing arm or height defaults', () => {
    avatarMotion.bodyYaw = 1.2; toggleInspection(); orbit.lift = 1.5; toggleInspection();
    expect(chase.targetYaw).toBe(1.2);
    for (let n = 0; n < 120; n++) returnInspectionLift(1 / 60);
    expect(orbit.lift).toBe(0); expect(AVATAR_AHEAD).toBe(2.8); expect(CHASE_EYE_M).toBe(2.4);
  });
});