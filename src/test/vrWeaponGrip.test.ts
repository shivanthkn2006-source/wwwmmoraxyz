import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createWeaponArmSolver, W870_GRIP_OFFSET } from '@/lib/vrWeaponGrip';

describe('weapon presentation preserves existing source coordinates', () => {
  it('places the original W-870 grip at the hold origin without scaling the gun', () => {
    expect(new THREE.Vector3(-0.22, -0.08, 0).add(W870_GRIP_OFFSET).length()).toBeLessThan(1e-9);
  });
  it('solves both wrists against targets in a translated and rotated avatar frame', () => {
    const root = new THREE.Group(); root.position.set(3, 0, -7); root.rotation.y = 1.2;
    const model = new THREE.Group(); root.add(model);
    for (const side of ['R', 'L']) {
      const upper = new THREE.Bone(), fore = new THREE.Bone(), hand = new THREE.Bone();
      upper.name = `CC_Base_${side}_Upperarm`; fore.name = `CC_Base_${side}_Forearm`; hand.name = `CC_Base_${side}_Hand`;
      upper.position.set(side === 'R' ? -0.15 : 0.15, 1.35, 0); fore.position.y = -0.27; hand.position.y = -0.23;
      model.add(upper); upper.add(fore); fore.add(hand);
    }
    const solver = createWeaponArmSolver(model); expect(solver).not.toBeNull();
    const targets = [new THREE.Vector3(-0.13, 1.265, 0.245), new THREE.Vector3(-0.13, 1.27, 0.59)];
    // Left test target within reach, unlike an arbitrary unreachable pose.
    targets[1].z = 0.32;
    solver?.solve(root, targets[0], targets[1]);
    for (const [i, side] of ['R', 'L'].entries()) {
      const hand = model.getObjectByName(`CC_Base_${side}_Hand`);
      expect(hand).toBeDefined();
      if (!hand) return;
      const got = root.worldToLocal(hand.getWorldPosition(new THREE.Vector3()));
      expect(got.distanceTo(targets[i])).toBeLessThan(0.015);
    }
  });
});
describe('equipped gun goes into the skirt avatar hands', () => {
  it('the castle Shotgun item is held, not drawn as a loose box beside her', async () => {
    const { pickHeldWeapon } = await import('@/lib/vrWeaponGrip');
    expect(pickHeldWeapon(['shotgun'])).toBe('shotgun');
    expect(pickHeldWeapon(['vest', 'w870', 'shotgun'])).toBe('w870');
    expect(pickHeldWeapon(['pistol'])).toBe('pistol');
    expect(pickHeldWeapon(['vest', 'helmet', 'knife'])).toBe('knife'); // knife is now held (one hand)
    expect(pickHeldWeapon(['vest', 'helmet'])).toBeNull();
  });
  it('long-gun stock rests in front of the shoulder, never behind it (no chest/back clipping)', async () => {
    const { gripFrame, BUTT_TO_GRIP } = await import('@/lib/vrWeaponGrip');
    const shoulder = new THREE.Vector3(-0.06, 1.39, -0.12);
    const f = gripFrame('w870', shoulder, 0, { weapon: new THREE.Vector3(), right: new THREE.Vector3(), left: new THREE.Vector3() });
    const buttZ = f.weapon.z - BUTT_TO_GRIP;
    expect(buttZ).toBeGreaterThan(shoulder.z);
    expect(buttZ - shoulder.z).toBeLessThan(0.12);
    expect(Math.abs(f.weapon.y - shoulder.y)).toBeLessThan(0.1);
    // Support hand is ahead of the firing hand on the same gun.
    expect(f.left.z).toBeGreaterThan(f.right.z + 0.15);
  });
});
