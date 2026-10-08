/**
 * M'Mora coins: one look everywhere (M'Mora Village houses, Real Map rooms,
 * the item case). Three faces: gold = 50, blue = 10, yellow = 1. 3D coins
 * use the gold face as their texture with a soft glow.
 */
import * as THREE from 'three';
import goldUrl from '@/assets/mmora-coin-gold.png';
import blueUrl from '@/assets/mmora-coin-blue.png';
import yellowUrl from '@/assets/mmora-coin-yellow.png';
import bagUrl from '@/assets/mmora-coin-bag.png';

export const COIN_FACES = { gold: goldUrl, blue: blueUrl, yellow: yellowUrl, bag: bagUrl } as const;
export const COIN_VALUES = { gold: 50, blue: 10, yellow: 1 } as const;

/** Split a coin total into gold/blue/yellow coins (largest first). */
export function splitCoins(total: number) {
  const t = Math.max(0, Math.floor(total));
  const gold = Math.floor(t / 50), blue = Math.floor((t % 50) / 10), yellow = t % 10;
  return { gold, blue, yellow };
}

let mat: THREE.MeshStandardMaterial | null = null;
export function coinMaterial(): THREE.MeshStandardMaterial {
  if (mat) return mat;
  mat = new THREE.MeshStandardMaterial({ color: '#ffe08a', metalness: 0.75, roughness: 0.3, emissive: '#c08a12', emissiveIntensity: 0.55 });
  if (typeof window !== 'undefined') {
    new THREE.TextureLoader().load(goldUrl, (t) => { t.colorSpace = THREE.SRGBColorSpace; mat!.map = t; mat!.emissiveMap = t; mat!.color.set('#ffffff'); mat!.needsUpdate = true; });
  }
  return mat;
}
