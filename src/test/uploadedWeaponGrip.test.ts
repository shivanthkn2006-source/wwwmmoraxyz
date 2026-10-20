import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createUploadedWeaponSolver, uploadedJointNames } from '@/lib/vrUploadedWeaponGrip';

describe('alternate-avatar weapon arms', () => {
  it.each([false, true])('solves the inspected GLB joint mapping (zoe=%s) in a rotated model', (zoe) => {
    const root = new THREE.Group(), model = new THREE.Group();
    root.position.set(3, 0, -4); root.rotation.y = 0.8;
    model.rotation.y = -Math.PI / 2; root.add(model);
    const names = uploadedJointNames(zoe);
    for (const [i, arm] of [names.right, names.left].entries()) {
      const joints = arm.map((name) => { const bone = new THREE.Bone(); bone.name = zoe ? name : `${name}_49`; return bone; });
      joints[0].position.set(i ? 0.15 : -0.15, 1.4, 0);
      joints[1].position.y = -0.28; joints[2].position.y = -0.25;
      model.add(joints[0]); joints[0].add(joints[1]); joints[1].add(joints[2]);
    }
    const solver = createUploadedWeaponSolver(model, zoe);
    expect(solver).not.toBeNull();
    const right = new THREE.Vector3(-0.1, 1.25, 0.24), left = new THREE.Vector3(0.08, 1.26, 0.3);
    solver?.solve(root, right, left);
    for (const [i, arm] of [names.right, names.left].entries()) {
      const hand = model.getObjectByName(zoe ? arm[2] : `${arm[2]}_49`);
      if (!hand) throw new Error('hand missing');
      expect(root.worldToLocal(hand.getWorldPosition(new THREE.Vector3())).distanceTo(i ? left : right)).toBeLessThan(0.02);
    }
  });
  it('fails safely if an upload lacks hand joints', () => {
    expect(createUploadedWeaponSolver(new THREE.Group(), true)).toBeNull();
  });
  it('finds a reachable contact in the rolled gun frame without stretching the arm', () => {
    const root = new THREE.Group(), model = new THREE.Group(), gun = new THREE.Group();
    root.add(model, gun); gun.position.set(-0.08, 1.3, 0.35); gun.rotation.set(0, -Math.PI / 2, 0.03);
    const names = uploadedJointNames(true);
    for (const [i, arm] of [names.right, names.left].entries()) {
      const [shoulder, elbow, hand] = arm.map((name) => { const b = new THREE.Bone(); b.name = name; return b; });
      shoulder.position.set(i ? 0.15 : -0.15, 1.4, 0);
      elbow.position.y = -0.28; hand.position.y = -0.25;
      model.add(shoulder); shoulder.add(elbow); elbow.add(hand);
    }
    const solver = createUploadedWeaponSolver(model, true);
    const target = solver?.supportContact(root, gun, 0.3);
    if (!solver || !target) throw new Error('reachable contact missing');
    const gunLocal = gun.worldToLocal(root.localToWorld(target.clone()));
    expect(gunLocal.y).toBeCloseTo(0.01, 5);
    expect(gunLocal.z).toBeCloseTo(0, 5);
    const lengths = names.left.slice(1).map((name) => model.getObjectByName(name)?.position.length());
    solver.solve(root, gun.position, target);
    expect(names.left.slice(1).map((name) => model.getObjectByName(name)?.position.length())).toEqual(lengths);
    expect(solver.supportContact(root, gun, -1)).toBeNull();
  });
  it('leaves the support arm unchanged for a one-handed item', () => {
    const root = new THREE.Group(), model = new THREE.Group(); root.add(model);
    const names = uploadedJointNames(true);
    for (const [i, arm] of [names.right, names.left].entries()) {
      const joints = arm.map((name) => { const b = new THREE.Bone(); b.name = name; return b; });
      joints[0].position.set(i ? 0.15 : -0.15, 1.4, 0);
      joints[1].position.y = -0.28; joints[2].position.y = -0.25;
      model.add(joints[0]); joints[0].add(joints[1]); joints[1].add(joints[2]);
    }
    const solver = createUploadedWeaponSolver(model, true);
    const left = model.getObjectByName(names.left[0]);
    const rest = left?.quaternion.clone();
    solver?.solve(root, new THREE.Vector3(-0.1, 1.1, 0.3), new THREE.Vector3(8, 8, 8), false);
    expect(left?.quaternion.equals(rest ?? new THREE.Quaternion())).toBe(true);
  });
});