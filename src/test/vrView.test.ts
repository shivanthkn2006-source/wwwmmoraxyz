import { describe, it, expect } from 'vitest';
import { getVRView, toggleCrouch, toggleThirdPerson, CROUCH_SPEED } from '@/lib/vrView';
import { QUESTS } from '@/lib/vrQuests';
describe('VR view + quest rewards', () => {
  it('toggles third-person and crouch', () => {
    const a = getVRView().thirdPerson; toggleThirdPerson(); expect(getVRView().thirdPerson).toBe(!a);
    toggleCrouch(); expect(getVRView().crouch).toBe(true); toggleCrouch(); expect(getVRView().crouch).toBe(false);
    expect(CROUCH_SPEED).toBeLessThan(1);
  });
  it('every quest has a reward matching the server amounts', () => {
    expect(Object.fromEntries(QUESTS.map((q) => [q.id, q.reward]))).toEqual({ relic_hunter: 50, memory_keeper: 75, rare_eye: 100, treasure_seeker: 100, village_map: 50, church_medallion: 100, lords_crest: 150 });
  });
});

import { orbitAvatar, villageEyeHeight, AVATAR_AHEAD, SHOULDER_EYE_M } from '@/lib/vrView';
describe('village chase camera', () => {
  it('turning keeps the avatar on the same spot', () => {
    const avatar = (x: number, z: number, y: number) => [x - Math.sin(y) * AVATAR_AHEAD, z - Math.cos(y) * AVATAR_AHEAD];
    const [x, z, y] = orbitAvatar(3, -10, 2.1, 0.7);
    expect(y).toBeCloseTo(2.8);
    const [a0, b0] = avatar(3, -10, 2.1), [a1, b1] = avatar(x, z, y);
    expect(a1).toBeCloseTo(a0, 6); expect(b1).toBeCloseTo(b0, 6);
  });
  it('third-person camera sits at shoulder height (1.45 m)', () => {
    if (!getVRView().thirdPerson) toggleThirdPerson();
    expect(villageEyeHeight()).toBe(SHOULDER_EYE_M);
    expect(SHOULDER_EYE_M).toBe(1.45);
  });
});
