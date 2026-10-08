/**
 * One shared look for every person in VR World (you, other members, street
 * walkers): a human face (eyes, brows, nose, mouth, ears), hair, a blue top
 * with a yellow collar and belt, white trousers, dark shoes. Built from merged
 * vertex-coloured geometry, so a whole crowd still draws in a single batch,
 * and split into jointed parts (arms, legs) for people that walk and reach.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const HUMAN_COLORS = {
  top: '#387BF6', trim: '#F5C518', trousers: '#F4F4F2', shoe: '#22252b',
  skin: '#e1c3a4', hair: '#2b1d14', eyeWhite: '#f7f5f0', pupil: '#1b1410', lips: '#a8484a',
} as const;

function part(g: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  if (ng.getAttribute('uv')) ng.deleteAttribute('uv');
  ng.translate(x, y, z);
  const c = new THREE.Color(color), n = ng.getAttribute('position').count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  ng.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return ng;
}

/** Head with face and hair, centred on the head (face looks along +z). */
export function headGeometry(female = false): THREE.BufferGeometry {
  const C = HUMAN_COLORS;
  const tail = new THREE.CapsuleGeometry(0.045, 0.26, 3, 8); tail.rotateX(0.35);
  const extra = female ? [
    part(new THREE.SphereGeometry(0.05, 8, 6), C.hair, 0, 0.06, -0.16),   // hair tie knot
    part(tail, C.hair, 0, -0.1, -0.2),                                   // ponytail
    part(new THREE.SphereGeometry(0.166, 12, 8, Math.PI * 0.85, Math.PI * 1.3, 0, Math.PI * 0.7), C.hair, 0, 0, 0), // longer sides
  ] : [];
  const nose = new THREE.ConeGeometry(0.022, 0.05, 6); nose.rotateX(Math.PI / 2);
  return mergeGeometries([
    part(new THREE.SphereGeometry(0.15, 14, 12), C.skin, 0, 0, 0),
    part(new THREE.SphereGeometry(0.165, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.4), C.hair, 0, 0.02, -0.005), // top
    part(new THREE.SphereGeometry(0.163, 12, 8, Math.PI, Math.PI, 0, Math.PI * 0.62), C.hair, 0, 0.01, -0.01), // back
    part(new THREE.SphereGeometry(0.026, 8, 6), C.eyeWhite, -0.052, 0.015, 0.128),
    part(new THREE.SphereGeometry(0.026, 8, 6), C.eyeWhite, 0.052, 0.015, 0.128),
    part(new THREE.SphereGeometry(0.014, 6, 5), C.pupil, -0.052, 0.015, 0.15),
    part(new THREE.SphereGeometry(0.014, 6, 5), C.pupil, 0.052, 0.015, 0.15),
    part(new THREE.BoxGeometry(0.05, 0.01, 0.012), C.hair, -0.052, 0.05, 0.138),
    part(new THREE.BoxGeometry(0.05, 0.01, 0.012), C.hair, 0.052, 0.05, 0.138),
    part(nose, C.skin, 0, -0.02, 0.16),
    part(new THREE.BoxGeometry(0.06, 0.013, 0.012), C.lips, 0, -0.068, 0.136),
    part(new THREE.SphereGeometry(0.035, 8, 6), C.skin, -0.148, 0, 0),
    part(new THREE.SphereGeometry(0.035, 8, 6), C.skin, 0.148, 0, 0),
    ...extra,
  ])!;
}

export const HIP_Y = 0.9, SHOULDER_Y = 1.46, HIP_X = 0.11, SHOULDER_X = 0.27;

/** Jointed parts; arms/legs have their pivot (shoulder/hip) at the origin. */
export function humanParts() {
  const C = HUMAN_COLORS;
  const leg = () => mergeGeometries([
    part(new THREE.CapsuleGeometry(0.075, 0.72, 3, 8), C.trousers, 0, -0.42, 0),
    part(new THREE.BoxGeometry(0.13, 0.08, 0.26), C.shoe, 0, -0.86, 0.04),
  ])!;
  const arm = () => mergeGeometries([
    part(new THREE.CapsuleGeometry(0.06, 0.48, 3, 8), C.top, 0, -0.26, 0),
    part(new THREE.SphereGeometry(0.055, 8, 6), C.skin, 0, -0.56, 0),
  ])!;
  const head = headGeometry(); head.translate(0, 1.68, 0);
  const body = mergeGeometries([
    part(new THREE.BoxGeometry(0.4, 0.07, 0.24), C.trim, 0, 0.93, 0),   // belt
    part(new THREE.BoxGeometry(0.42, 0.55, 0.24), C.top, 0, 1.24, 0),   // top
    part(new THREE.BoxGeometry(0.2, 0.05, 0.25), C.trim, 0, 1.5, 0),    // collar
    part(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), C.skin, 0, 1.56, 0),
    head,
  ])!;
  return { body, leg: leg(), arm: arm() };
}

/** A standing person ~1.75 m tall, feet at y=0, facing +z (one merged mesh). */
export function humanGeometry(): THREE.BufferGeometry {
  const p = humanParts();
  const l1 = p.leg.clone().translate(-HIP_X, HIP_Y, 0), l2 = p.leg.clone().translate(HIP_X, HIP_Y, 0);
  const a1 = p.arm.clone().translate(-SHOULDER_X, SHOULDER_Y, 0), a2 = p.arm.clone().translate(SHOULDER_X, SHOULDER_Y, 0);
  return mergeGeometries([p.body, l1, l2, a1, a2])!;
}

export const HUMAN_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
