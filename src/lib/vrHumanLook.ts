/**
 * One shared look for every person in VR World (you, other members, street
 * walkers): hair, a blue top with a yellow collar and belt, white trousers,
 * dark shoes. Built as ONE merged geometry with vertex colours, so a whole
 * crowd still draws in a single batch.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const HUMAN_COLORS = { top: '#387BF6', trim: '#F5C518', trousers: '#F4F4F2', shoe: '#22252b', skin: '#e1c3a4', hair: '#2b1d14' } as const;

function part(g: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  ng.deleteAttribute('uv');
  ng.translate(x, y, z);
  const c = new THREE.Color(color), n = ng.getAttribute('position').count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  ng.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return ng;
}

/** A standing person ~1.75 m tall, feet at y=0, facing +z. */
export function humanGeometry(): THREE.BufferGeometry {
  const C = HUMAN_COLORS;
  const hair = new THREE.SphereGeometry(0.165, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  return mergeGeometries([
    part(new THREE.BoxGeometry(0.13, 0.08, 0.26), C.shoe, -0.11, 0.04, 0.04),
    part(new THREE.BoxGeometry(0.13, 0.08, 0.26), C.shoe, 0.11, 0.04, 0.04),
    part(new THREE.CapsuleGeometry(0.075, 0.72, 3, 8), C.trousers, -0.11, 0.48, 0),
    part(new THREE.CapsuleGeometry(0.075, 0.72, 3, 8), C.trousers, 0.11, 0.48, 0),
    part(new THREE.BoxGeometry(0.4, 0.07, 0.24), C.trim, 0, 0.93, 0),            // belt
    part(new THREE.BoxGeometry(0.42, 0.55, 0.24), C.top, 0, 1.24, 0),            // top
    part(new THREE.BoxGeometry(0.2, 0.05, 0.25), C.trim, 0, 1.5, 0),             // collar
    part(new THREE.CapsuleGeometry(0.06, 0.48, 3, 8), C.top, -0.27, 1.2, 0),
    part(new THREE.CapsuleGeometry(0.06, 0.48, 3, 8), C.top, 0.27, 1.2, 0),
    part(new THREE.SphereGeometry(0.055, 8, 6), C.skin, -0.27, 0.9, 0),
    part(new THREE.SphereGeometry(0.055, 8, 6), C.skin, 0.27, 0.9, 0),
    part(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), C.skin, 0, 1.56, 0),
    part(new THREE.SphereGeometry(0.15, 14, 12), C.skin, 0, 1.68, 0),
    part(hair, C.hair, 0, 1.7, -0.01),
  ])!;
}

export const HUMAN_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
