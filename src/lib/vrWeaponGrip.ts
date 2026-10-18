/** Presentation only. W-870 source: X muzzle-forward, grip (-.22,-.08,0). */
import * as THREE from 'three';
import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver.js';
export const W870_GRIP_OFFSET = new THREE.Vector3(0.22, 0.08, 0);

/** Use Three's existing CCD solver; never move players or write saves. */
export function createWeaponArmSolver(model: THREE.Group) {
  const bones: THREE.Bone[] = [];
  model.traverse((o) => { if (o instanceof THREE.Bone) bones.push(o); });
  const targets = [new THREE.Bone(), new THREE.Bone()];
  targets.forEach((t) => model.add(t));
  const proxy = new THREE.SkinnedMesh();
  proxy.skeleton = new THREE.Skeleton([...bones, ...targets]);
  const chains = ['R', 'L'].map((side, i) => ({
    target: bones.length + i,
    effector: bones.findIndex((b) => b.name === `CC_Base_${side}_Hand`),
    links: ['Forearm', 'Upperarm'].map((part) => ({ index: bones.findIndex((b) => b.name === `CC_Base_${side}_${part}`) })),
    iteration: 24, maxAngle: 0.35,
  }));
  if (chains.some((c) => c.effector < 0 || c.links.some((l) => l.index < 0))) return null;
  const solver = new CCDIKSolver(proxy, chains);
  const point = new THREE.Vector3(), parentQ = new THREE.Quaternion(), rootQ = new THREE.Quaternion();
  const wristQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  return {
    solve(root: THREE.Group, right: THREE.Vector3, left: THREE.Vector3) {
      root.updateWorldMatrix(true, true);
      [right, left].forEach((p, i) => {
        point.copy(p); root.localToWorld(point); model.worldToLocal(point); targets[i].position.copy(point);
      });
      model.updateWorldMatrix(true, true); solver.update(); root.getWorldQuaternion(rootQ);
      chains.forEach((c) => {
        const hand = bones[c.effector]; if (!hand?.parent) return;
        hand.parent.getWorldQuaternion(parentQ).invert();
        hand.quaternion.copy(parentQ).multiply(rootQ).multiply(wristQ);
        hand.updateWorldMatrix(false, true);
      });
    },
  };
}