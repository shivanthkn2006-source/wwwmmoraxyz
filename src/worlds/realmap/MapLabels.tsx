/**
 * Building and street names on the Real Map. Only the nearest few named
 * buildings (on their roof) and streets (on the road) are shown, re-picked
 * once a second, so labels never pile up or slow a phone down.
 */
import React, { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { toLocal, type LatLng } from './geo';
import { mapBlocks, useMapVersion } from './mapIndex';
import { useGovLevel } from './thermalGovernor';
import * as THREE from 'three';
const POLE = new THREE.MeshStandardMaterial({ color: '#9aa0a6', metalness: 0.6, roughness: 0.4 });
const BOARD = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.6 });

type Label = { id: string; text: string; x: number; y: number; z: number; kind: 'building' | 'street' | 'place'; icon?: string; rot?: number };
/** Little sign for each kind of place. */
export const PLACE_ICON: Record<string, string> = { fuel: '⛽', mall: '🛍️', fast_food: '🍔', food: '🍽️', supermarket: '🛒', shop: '🏪', hotel: '🏨', office: '🏢', bank: '🏦', atm: '🏧', hospital: '🏥', pharmacy: '💊', cinema: '🎬', school: '🏫', college: '🎓', place_of_worship: '🛕' };
export const LABEL_RANGE_M = 160;
export const MAX_LABELS: Record<number, number> = { 0: 14, 1: 9, 2: 5 };

export function collectLabels(origin: LatLng): Label[] {
  const out: Label[] = [];
  const seenStreet = new Set<string>();
  mapBlocks().forEach((d, key) => {
    d.buildings.forEach((b, k) => {
      if (!b.name || !b.pts.length) return;
      let x = 0, z = 0;
      for (const [lat, lng] of b.pts) { const p = toLocal({ lat, lng }, origin); x += p.x; z += p.z; }
      out.push({ id: `${key}b${k}`, text: b.name, x: x / b.pts.length, y: Math.max(3, b.h) + 2, z: z / b.pts.length, kind: 'building' });
    });
    d.pois.forEach((p, k) => {
      const q = toLocal(p, origin);
      out.push({ id: `${key}p${k}`, text: p.name, x: q.x, y: 6, z: q.z, kind: 'place', icon: PLACE_ICON[p.kind] ?? '📍' });
    });
    d.roads.forEach((r, k) => {
      if (!r.name || r.pts.length < 2) return;
      const mi = Math.min(Math.floor(r.pts.length / 2), r.pts.length - 2);
      const a = toLocal({ lat: r.pts[mi][0], lng: r.pts[mi][1] }, origin), b2 = toLocal({ lat: r.pts[mi + 1][0], lng: r.pts[mi + 1][1] }, origin);
      const dx = b2.x - a.x, dz = b2.z - a.z, len = Math.hypot(dx, dz) || 1, off = r.w / 2 + 1.5;
      // Sign stands on the roadside, beside the road, not in the lane.
      const p = { x: a.x - (dz / len) * off, z: a.z + (dx / len) * off };
      const rot = Math.atan2(dx, dz);
      const id = `${r.name}|${Math.round(p.x / 120)}|${Math.round(p.z / 120)}`;
      if (seenStreet.has(id)) return;
      seenStreet.add(id);
      out.push({ id: `${key}r${k}`, text: r.name, x: p.x, y: 3.2, z: p.z, kind: 'street', rot });
    });
  });
  return out;
}

export function nearestLabels(all: Label[], cx: number, cz: number, max: number): Label[] {
  return all
    .map((l) => ({ l, d: Math.hypot(l.x - cx, l.z - cz) }))
    .filter((e) => e.d < LABEL_RANGE_M)
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map((e) => e.l);
}

export const MapLabels: React.FC<{ origin: LatLng }> = ({ origin }) => {
  const version = useMapVersion();
  const level = useGovLevel();
  const all = useMemo(() => collectLabels(origin), [origin, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const { camera } = useThree();
  const [shown, setShown] = useState<Label[]>([]);
  const t = useRef(1);
  useFrame((_, dt) => {
    t.current += dt;
    if (t.current < 1) return;
    t.current = 0;
    const next = nearestLabels(all, camera.position.x, camera.position.z, MAX_LABELS[level] ?? 0);
    setShown((prev) => (prev.length === next.length && prev.every((p, i) => p.id === next[i].id) ? prev : next));
  });
  return (
    <>
      {shown.map((l) => l.kind === 'street' ? (
        <group key={l.id} position={[l.x, 0, l.z]} rotation={[0, l.rot ?? 0, 0]}>
          {/* T-shaped street sign: pole + black board with white name */}
          <mesh position={[0, 1.5, 0]} material={POLE}><cylinderGeometry args={[0.06, 0.06, 3, 6]} /></mesh>
          <mesh position={[0, 3.05, 0]} material={BOARD}><boxGeometry args={[2.6, 0.55, 0.06]} /></mesh>
          <Html position={[0, 3.05, 0.05]} center distanceFactor={12} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
            <div className="vr-street-sign">{l.text}</div>
          </Html>
        </group>
      ) : (
        <Html key={l.id} position={[l.x, l.y, l.z]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className={l.kind === 'place' ? 'vr-map-label vr-map-label-place' : 'vr-map-label'}>{l.icon ? `${l.icon} ` : ''}{l.text}</div>
        </Html>
      ))}
    </>
  );
};
