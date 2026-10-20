/** Presentation only. W-870 source: X muzzle-forward, grip (-.22,-.08,0). */
import * as THREE from 'three';
import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver.js';
export const W870_GRIP_OFFSET = new THREE.Vector3(0.22, 0.08, 0);
/** Measured on the W-870 source: butt plate sits 0.317 m behind the grip. */
export const BUTT_TO_GRIP = 0.317;

/** Items every avatar holds; long guns shoulder, handguns use a close two-hand hold, knife/grenades one hand. */
export type HeldWeapon = 'w870' | 'shotgun' | 'boltrifle' | 'sentinel9' | 'pistol' | 'knife'
  | 'fraggrenade' | 'flashgrenade' | 'incgrenade' | 'smokegrenade' | 'shockgrenade';
const HELD_ORDER: HeldWeapon[] = ['w870', 'shotgun', 'boltrifle', 'sentinel9', 'pistol', 'knife', 'fraggrenade', 'flashgrenade', 'incgrenade', 'smokegrenade', 'shockgrenade'];
export const isLongGun = (w: HeldWeapon | null) => w === 'w870' || w === 'shotgun' || w === 'boltrifle';
export const isOneHanded = (w: HeldWeapon | null) => w === 'knife' || (!!w && w.endsWith('grenade'));
/** One item is drawn in the hands even if several are equipped. */
export function pickHeldWeapon(equipped: readonly string[]): HeldWeapon | null {
  return HELD_ORDER.find((id) => equipped.includes(id)) ?? null;
}

export interface GripFrame { weapon: THREE.Vector3; right: THREE.Vector3; left: THREE.Vector3 }
/**
 * Avatar-local hold frame built from the live right-shoulder joint, so the
 * stock rests on the shoulder instead of passing through the chest/back.
 * Avatar faces +Z, right side is −X. `weapon` is the grip (right-hand) point.
 */
export function gripFrame(weapon: HeldWeapon, shoulder: THREE.Vector3, kick: number, out: GripFrame): GripFrame {
  if (isLongGun(weapon)) {
    // Butt pad just in front of and inside the shoulder joint, a little low.
    const buttZ = shoulder.z + 0.07 - kick * 0.03;
    out.weapon.set(shoulder.x + 0.035, shoulder.y - 0.06 + kick * 0.012, buttZ + BUTT_TO_GRIP);
    // Wrists sit behind/below the contact points so palms, not wrists, touch.
    out.right.set(out.weapon.x - 0.03, out.weapon.y + 0.1, out.weapon.z - 0.075);
    out.left.set(out.weapon.x + 0.06, out.weapon.y + 0.03, out.weapon.z + 0.19);
  } else {
    // Close two-hand handgun hold at chest centre, arms bent (not locked out).
    out.weapon.set(shoulder.x + 0.11, shoulder.y - 0.08 + kick * 0.02, shoulder.z + 0.42 - kick * 0.03);
    out.right.set(out.weapon.x, out.weapon.y, out.weapon.z - 0.03);
    out.left.set(out.weapon.x + 0.05, out.weapon.y - 0.02, out.weapon.z - 0.02);
  }
  return out;
}

/** Orthonormal frame from a pointing direction and a rough across direction. */
function basis(fwd: THREE.Vector3, across: THREE.Vector3) {
  const f = fwd.clone().normalize();
  const a = across.clone().addScaledVector(f, -across.dot(f)).normalize();
  return new THREE.Matrix4().makeBasis(f, a, new THREE.Vector3().crossVectors(f, a));
}
/**
 * Avatar-frame hand aims (faces +Z, right = −X). Right: wraps the stock wrist,
 * fingers forward-down, index on top. Left: cups the pump from below, fingers
 * forward and across to the right, index ahead of pinky.
 */
export const HAND_AIM = [
  { fwd: new THREE.Vector3(0, -0.55, 0.83), across: new THREE.Vector3(0, -1, 0) },
  { fwd: new THREE.Vector3(-0.45, 0.1, 0.89), across: new THREE.Vector3(0, 0, -1) },
];

/** Finger wrap (rad per joint) and per-hand bend direction (R, L). */
export const FINGER_CURL = 0.9;
const FINGER_CURL_SIGN = (import.meta.env?.DEV && (globalThis as { __curlSign?: number[] }).__curlSign) || [-1, 1];

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
  // Hand frames measured from the rig's own finger joints (wrist→middle
  // knuckle, index→pinky knuckle), so wrist turns are solved, not guessed.
  model.updateWorldMatrix(true, true);
  const restBasis = ['R', 'L'].map((side) => {
    const hand = model.getObjectByName(`CC_Base_${side}_Hand`);
    const at = (n: string) => { const b = model.getObjectByName(`CC_Base_${side}_${n}`); return b && hand ? hand.worldToLocal(b.getWorldPosition(new THREE.Vector3())) : null; };
    const mid = at('Mid1'), index = at('Index1'), pinky = at('Pinky1');
    return mid && index && pinky ? basis(mid, pinky.sub(index)) : null;
  });
  const fallbackQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  const handQ = restBasis.map((rest, i) => rest
    ? new THREE.Quaternion().setFromRotationMatrix(basis(HAND_AIM[i].fwd, HAND_AIM[i].across).multiply(rest.clone().invert()))
    : fallbackQ);
  // Finger curl: rotate each finger joint about the knuckle line (index→pinky)
  // measured at rest, so fingers bend toward the palm instead of sideways.
  const fingers = ['R', 'L'].map((side, i) => {
    const hand = model.getObjectByName(`CC_Base_${side}_Hand`);
    const rest = restBasis[i];
    if (!hand || !rest) return [];
    const across = new THREE.Vector3().setFromMatrixColumn(rest, 1).transformDirection(hand.matrixWorld);
    const list: { bone: THREE.Object3D; restQ: THREE.Quaternion; axis: THREE.Vector3; joint: number }[] = [];
    for (const f of ['Index', 'Mid', 'Ring', 'Pinky']) for (let j = 1; j <= 3; j++) {
      const bone = model.getObjectByName(`CC_Base_${side}_${f}${j}`);
      if (!bone) continue;
      const inv = bone.getWorldQuaternion(new THREE.Quaternion()).invert();
      list.push({ bone, restQ: bone.quaternion.clone(), axis: across.clone().applyQuaternion(inv).normalize(), joint: j });
    }
    return list;
  });
  const curlQ = new THREE.Quaternion();
  const curl = (amount: number) => fingers.forEach((list, i) => list.forEach((f) => {
    const a = amount * (f.joint === 1 ? 0.75 : 1) * FINGER_CURL_SIGN[i];
    f.bone.quaternion.copy(f.restQ).multiply(curlQ.setFromAxisAngle(f.axis, a));
  }));
  return {
    /** Put fingers back to their rest shape (gun put away). */
    relax() { curl(0); },
    solve(root: THREE.Group, right: THREE.Vector3, left: THREE.Vector3) {
      root.updateWorldMatrix(true, true);
      [right, left].forEach((p, i) => {
        point.copy(p); root.localToWorld(point); model.worldToLocal(point); targets[i].position.copy(point);
      });
      model.updateWorldMatrix(true, true); solver.update(); root.getWorldQuaternion(rootQ);
      chains.forEach((c) => {
        const hand = bones[c.effector]; if (!hand?.parent) return;
        hand.parent.getWorldQuaternion(parentQ).invert();
        hand.quaternion.copy(parentQ).multiply(rootQ).multiply(handQ[chains.indexOf(c)]);
        hand.updateWorldMatrix(false, true);
      });
      curl(FINGER_CURL);
    },
  };
}
