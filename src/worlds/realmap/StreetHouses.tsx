/**
 * Real Map homes you can enter: a few buildings per loaded block get a front
 * door (chosen the same way for every member from the block key). Use at the
 * door opens the room. A green glow above the roof means a Green Herb is
 * inside, gold means coins, so you can find them from far away and on the map.
 */
import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { toLocal, type LatLng } from './geo';
import { mapBlocks, useMapVersion } from './mapIndex';
import { hashStr } from './streetRelics';
import { registerUse } from '@/lib/vrUse';
import { usePickups, getPickups } from '@/lib/vrPickups';
import { enterRoom } from '@/lib/vrInterior';

export type StreetHouse = { id: string; name: string; door: { x: number; z: number; rot: number }; top: number; cx: number; cz: number; herbId?: string; coinId?: string; coinAmt: number };
const PER_BLOCK = 3;

export function streetHouses(origin: LatLng): StreetHouse[] {
  const out: StreetHouse[] = [];
  mapBlocks().forEach((d, key) => {
    const cand = d.buildings.map((b, i) => ({ b, i, h: hashStr(`${key}:${i}`) })).filter((c) => c.b.pts.length >= 4).sort((a, b) => a.h - b.h).slice(0, PER_BLOCK);
    for (const { b, i, h } of cand) {
      const L = b.pts.map(([la, ln]) => toLocal({ lat: la, lng: ln }, origin));
      const cx = L.reduce((s, p) => s + p.x, 0) / L.length, cz = L.reduce((s, p) => s + p.z, 0) / L.length;
      // longest edge = front wall
      let best = 0, e = 0;
      for (let k = 0; k < L.length - 1; k++) { const len = Math.hypot(L[k + 1].x - L[k].x, L[k + 1].z - L[k].z); if (len > best) { best = len; e = k; } }
      if (best < 2) continue;
      const a = L[e], c = L[e + 1], mx = (a.x + c.x) / 2, mz = (a.z + c.z) / 2;
      const ox = mx - cx, oz = mz - cz, ol = Math.hypot(ox, oz) || 1;
      const id = `rm:${key}:${i}`;
      const kind = h % 3; // 0 herb, 1 coins, 2 both
      out.push({
        id, name: b.name || 'House', top: Math.max(3, b.h), cx, cz,
        door: { x: mx + (ox / ol) * 0.12, z: mz + (oz / ol) * 0.12, rot: Math.atan2(ox, oz) },
        herbId: kind !== 1 ? `${id}:herb` : undefined,
        coinId: kind !== 0 ? `${id}:coin` : undefined,
        coinAmt: [1, 3, 5][h % 3],
      });
    }
  });
  return out;
}

let cache: StreetHouse[] = [];
/** Latest homes (local metres) for the round map. */
export const getStreetHouses = () => cache;

const DOOR = new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.8 });
const KNOB = new THREE.MeshStandardMaterial({ color: '#b08a4a', metalness: 0.7, roughness: 0.35 });
const GLOW_G = new THREE.MeshBasicMaterial({ color: '#5fb04a', transparent: true, opacity: 0.5, depthWrite: false });
const GLOW_C = new THREE.MeshBasicMaterial({ color: '#e3c15a', transparent: true, opacity: 0.5, depthWrite: false });
const BEAM = new THREE.CylinderGeometry(0.5, 0.5, 14, 8, 1, true);

export const StreetHouses: React.FC<{ origin: LatLng }> = ({ origin }) => {
  const v = useMapVersion();
  const p = usePickups();
  const houses = useMemo(() => (cache = streetHouses(origin)), [origin, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const { camera } = useThree();
  useEffect(() => registerUse(() => {
    let best: StreetHouse | null = null, bd = Infinity;
    for (const h of houses) { const d = Math.hypot(camera.position.x - h.door.x, camera.position.z - h.door.z); if (d < bd) { bd = d; best = h; } }
    if (!best) return null;
    const h = best;
    return { dist: bd, reach: 4, label: `Enter ${h.name}`, run: () => enterRoom({ id: h.id, name: h.name, herbId: h.herbId, coinId: h.coinId, coinAmt: h.coinAmt }) };
  }), [houses, camera]);
  const taken = p.taken;
  return (
    <group>
      {houses.map((h) => {
        const herb = h.herbId && !taken.includes(h.herbId), coin = h.coinId && !taken.includes(h.coinId);
        return (
          <group key={h.id}>
            <group position={[h.door.x, 0, h.door.z]} rotation={[0, h.door.rot, 0]}>
              <mesh position={[0, 1.1, 0]} material={DOOR}><boxGeometry args={[1.1, 2.2, 0.1]} /></mesh>
              <mesh position={[0.4, 1.05, 0.08]} material={KNOB}><sphereGeometry args={[0.05, 8, 8]} /></mesh>
            </group>
            {herb && <mesh geometry={BEAM} material={GLOW_G} position={[h.cx - (coin ? 0.7 : 0), h.top + 7, h.cz]} />}
            {coin && <mesh geometry={BEAM} material={GLOW_C} position={[h.cx + (herb ? 0.7 : 0), h.top + 7, h.cz]} />}
          </group>
        );
      })}
    </group>
  );
};
export { getPickups };
