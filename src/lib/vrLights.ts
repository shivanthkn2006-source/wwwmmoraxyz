/**
 * Building lights for every VR world (Real Map + M'Mora World): windows glow
 * from 17:54 until 22:00 on the member's local clock. Materials register once
 * and a single 30 s ticker switches them, so no per-frame cost.
 */
import * as THREE from 'three';

export const LIGHTS_ON_MIN = 17 * 60 + 54;
export const LIGHTS_OFF_MIN = 22 * 60;

export const lightsOnAt = (d: Date = new Date()) => {
  const m = d.getHours() * 60 + d.getMinutes();
  return m >= LIGHTS_ON_MIN && m < LIGHTS_OFF_MIN;
};

const lit = new Map<THREE.MeshStandardMaterial, number>();
let on = lightsOnAt();
let timer: ReturnType<typeof setInterval> | undefined;

function apply(m: THREE.MeshStandardMaterial, intensity: number) {
  m.emissiveIntensity = on ? intensity : 0;
}

/** Make a material glow (at `intensity`) only during lights-on hours. */
export function registerLit<M extends THREE.MeshStandardMaterial>(m: M, intensity = 1): M {
  lit.set(m, intensity);
  apply(m, intensity);
  m.addEventListener('dispose', () => lit.delete(m));
  if (!timer && typeof window !== 'undefined') {
    timer = setInterval(() => {
      const n = lightsOnAt();
      if (n === on) return;
      on = n;
      lit.forEach((i, mat) => apply(mat, i));
    }, 30_000);
  }
  return m;
}

export const buildingLightsOn = () => on;
