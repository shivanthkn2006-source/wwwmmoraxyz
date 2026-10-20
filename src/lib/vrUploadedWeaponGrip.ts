/** Joint names inspected from the two original GLBs; presentation only. */
import * as THREE from 'three';
import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver.js';

export const uploadedJointNames = (zoe: boolean) => zoe
  ? { right: ['R_Upperarm', 'R_Forearm', 'R_Hand'], left: ['L_Upperarm', 'L_Forearm', 'L_Hand'] }
  : { right: ['RightArm', 'RightForeArm', 'RightHand'], left: ['LeftArm', 'LeftForeArm', 'LeftHand'] };
export const normalizeUploadedJoint = (name: string) => name.replace(/^mixamorig:/, '').replace(/_\d+$/, '');

export function createUploadedWeaponSolver(model: THREE.Object3D, zoe: boolean) {
  const bones: THREE.Bone[] = [];
  model.traverse((node) => { if (node instanceof THREE.Bone) bones.push(node); });
  const names = uploadedJointNames(zoe);
  const index = (name: string) => bones.findIndex((bone) => normalizeUploadedJoint(bone.name) === name);
  const targets = [new THREE.Bone(), new THREE.Bone()];
  const chains = [names.right, names.left].map((arm, i) => ({
    target: bones.length + i, effector: index(arm[2]),
    links: [arm[1], arm[0]].map((name) => ({ index: index(name) })),
    iteration: 24, maxAngle: 0.35,
  }));
  if (chains.some((chain) => chain.effector < 0 || chain.links.some((link) => link.index < 0))) return null;
  targets.forEach((target) => model.add(target));
  const proxy = new THREE.SkinnedMesh();
  proxy.skeleton = new THREE.Skeleton([...bones, ...targets]);
  const solver = new CCDIKSolver(proxy, chains);
  const point = new THREE.Vector3();
  model.updateWorldMatrix(true, true);
  // Skin-weighted palm centres are measured from the original mesh in each
  // hand's bind coordinates. Zoe has no finger bones: do not invent them.
  const hands = [names.right, names.left].map((arm) => bones[index(arm[2])]);
  const palms = hands.map((hand) => {
    const sum = new THREE.Vector3(); let total = 0;
    model.traverse((node) => {
      if (!(node instanceof THREE.SkinnedMesh)) return;
      const hi = node.skeleton.bones.indexOf(hand);
      if (hi < 0) return;
      const pos = node.geometry.attributes.position, ids = node.geometry.attributes.skinIndex, weights = node.geometry.attributes.skinWeight;
      if (!ids || !weights) return;
      for (let v = 0; v < pos.count; v++) {
        let weight = 0;
        for (let c = 0; c < 4; c++) if (ids.getComponent(v, c) === hi) weight += weights.getComponent(v, c);
        if (weight < 0.5) continue;
        point.fromBufferAttribute(pos, v); node.localToWorld(point); hand.worldToLocal(point);
        sum.addScaledVector(point, weight); total += weight;
      }
    });
    return total ? sum.divideScalar(total) : new THREE.Vector3();
  });
  const parentQ = new THREE.Quaternion(), rootQ = new THREE.Quaternion(), worldQ = new THREE.Quaternion();
  const handScales = hands.map((hand) => hand.getWorldScale(new THREE.Vector3()));
  const handRests = hands.map((hand) => hand.quaternion.clone());
  const forwards = [new THREE.Vector3(0, -0.8, 0.6), new THREE.Vector3(-0.25, 0, 0.97)];
  const fingerRests = bones.filter((bone) => /Hand(Thumb|Index|Middle|Ring|Pinky)[123]$/.test(normalizeUploadedJoint(bone.name))).map((bone) => ({ bone, rest: bone.quaternion.clone() }));
  const wristTargets = [new THREE.Vector3(), new THREE.Vector3()];
  const shoulder = bones[index(names.right[0])];
  const leftShoulder = bones[index(names.left[0])];
  // Left arm reach (shoulder→elbow→wrist + wrist→palm), measured on this rig.
  const lj = names.left.map((n) => bones[index(n)].getWorldPosition(new THREE.Vector3()));
  const leftReach = lj[0].distanceTo(lj[1]) + lj[1].distanceTo(lj[2]) + palms[1].clone().multiply(handScales[1]).length();
  return {
    shoulder,
    leftShoulder,
    leftReach,
    relax() {
      hands.forEach((hand, i) => hand.quaternion.copy(handRests[i]));
      fingerRests.forEach(({ bone, rest }) => bone.quaternion.copy(rest));
    },
    solve(root: THREE.Group, right: THREE.Vector3, left: THREE.Vector3) {
      root.updateWorldMatrix(true, true);
      root.getWorldQuaternion(rootQ);
      [right, left].forEach((target, i) => {
        // Place the palm on the contact, not the wrist. Orient the measured
        // wrist→palm vector after CCD (whose parent rotations change each frame).
        if (palms[i].lengthSq() > 1e-10) {
          worldQ.setFromUnitVectors(palms[i].clone().normalize(), forwards[i]).premultiply(rootQ);
          wristTargets[i].copy(palms[i]).multiply(handScales[i]).applyQuaternion(worldQ);
        } else wristTargets[i].set(0, 0, 0);
        point.copy(target); root.localToWorld(point); point.sub(wristTargets[i]); model.worldToLocal(point);
        targets[i].position.copy(point);
      });
      model.updateWorldMatrix(true, true);
      solver.update();
      hands.forEach((hand, i) => {
        if (palms[i].lengthSq() < 1e-10 || !hand.parent) return;
        hand.parent.getWorldQuaternion(parentQ);
        worldQ.setFromUnitVectors(palms[i].clone().normalize(), forwards[i]).premultiply(rootQ);
        hand.quaternion.copy(parentQ.invert().multiply(worldQ));
      });
      // Only the Ready Player rig has articulated fingers. Its finger bend
      // axis is derived from actual knuckle positions, not CC/skirt axes.
      fingerRests.forEach(({ bone, rest }) => {
        const side = normalizeUploadedJoint(bone.name).startsWith('Right') ? 'Right' : 'Left';
        const hand = hands[side === 'Right' ? 0 : 1];
        const a = bones.find((b) => normalizeUploadedJoint(b.name) === `${side}HandIndex1`);
        const b = bones.find((b) => normalizeUploadedJoint(b.name) === `${side}HandPinky1`);
        if (!a || !b || !bone.parent) return;
        model.updateWorldMatrix(true, true);
        const axis = b.getWorldPosition(new THREE.Vector3()).sub(a.getWorldPosition(new THREE.Vector3())).normalize();
        bone.parent.getWorldQuaternion(parentQ); axis.applyQuaternion(parentQ.invert());
        bone.quaternion.copy(rest).premultiply(new THREE.Quaternion().setFromAxisAngle(axis, side === 'Right' ? -0.85 : 0.85));
        hand.updateWorldMatrix(true, true);
      });
    },
  };
}