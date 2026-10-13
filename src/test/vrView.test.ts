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
