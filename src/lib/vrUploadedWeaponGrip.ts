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
  const shoulder = bones[index(names.right[0])];
  return {
    shoulder,
    solve(root: THREE.Group, right: THREE.Vector3, left: THREE.Vector3) {
      root.updateWorldMatrix(true, true);
      [right, left].forEach((target, i) => {
        point.copy(target); root.localToWorld(point); model.worldToLocal(point);
        targets[i].position.copy(point);
      });
      model.updateWorldMatrix(true, true);
      solver.update();
      // Keep uploaded wrist bind rotations; skirt-specific finger axes do not
      // apply here (Zoe has no finger joints in the uploaded skeleton).
    },
  };
}