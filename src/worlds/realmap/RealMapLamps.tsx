/**
 * Street lamps along the loaded Real Map roads (every ~35 m, roadside), only
 * within ~350 m of the player and at most 260 lamps, refreshed when blocks
 * load or the player has moved ~120 m.
 */
import React, { useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { mapBlocks, useMapVersion } from './mapIndex';
import { toLocal, type LatLng } from './geo';
import { StreetLamps } from '../StreetLamps';

const STEP = 35, RANGE = 350, MAX = 260;

export function lampSpots(origin: LatLng, cx: number, cz: number): [number, number][] {
  const out: [number, number][] = [];
  for (const d of mapBlocks().values()) {
    for (const r of d.roads) {
      if (r.w < 5) continue;
      let carry = STEP / 2;
      for (let k = 0; k < r.pts.length - 1; k++) {
        const a = toLocal({ lat: r.pts[k][0], lng: r.pts[k][1] }, origin);
        const b = toLocal({ lat: r.pts[k + 1][0], lng: r.pts[k + 1][1] }, origin);
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        if (len < 0.01) continue;
        const px = -(b.z - a.z) / len, pz = (b.x - a.x) / len, off = r.w / 2 + 0.8;
        for (let t = carry; t < len; t += STEP) {
          const x = a.x + (b.x - a.x) * (t / len) + px * off, z = a.z + (b.z - a.z) * (t / len) + pz * off;
          if (Math.hypot(x - cx, z - cz) < RANGE) out.push([x, z]);
          if (out.length >= MAX) return out;
        }
        carry = (carry - len) % STEP; if (carry < 0) carry += STEP;
      }
    }
  }
  return out;
}

export const RealMapLamps: React.FC<{ origin: LatLng }> = ({ origin }) => {
  const version = useMapVersion();
  const { camera } = useThree();
  const [key, setKey] = useState({ v: -1, x: 0, z: 0, spots: [] as [number, number][] });
  useFrame(() => {
    const { x, z } = camera.position;
    if (key.v === version && Math.hypot(x - key.x, z - key.z) < 120) return;
    setKey({ v: version, x, z, spots: lampSpots(origin, x, z) });
  });
  return <StreetLamps spots={key.spots} />;
};
