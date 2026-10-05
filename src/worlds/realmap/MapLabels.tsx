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

type Label = { id: string; text: string; x: number; y: number; z: number; kind: 'building' | 'street' | 'place'; icon?: string };
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
      const mid = r.pts[Math.floor(r.pts.length / 2)];
      const p = toLocal({ lat: mid[0], lng: mid[1] }, origin);
      const id = `${r.name}|${Math.round(p.x / 120)}|${Math.round(p.z / 120)}`;
      if (seenStreet.has(id)) return;
      seenStreet.add(id);
      out.push({ id: `${key}r${k}`, text: r.name, x: p.x, y: 1.2, z: p.z, kind: 'street' });
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
      {shown.map((l) => (
        <Html key={l.id} position={[l.x, l.y, l.z]} center distanceFactor={l.kind === 'street' ? 14 : undefined} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className={l.kind === 'street' ? 'vr-map-label vr-map-label-street' : l.kind === 'place' ? 'vr-map-label vr-map-label-place' : 'vr-map-label'}>{l.icon ? `${l.icon} ` : ''}{l.text}</div>
        </Html>
      ))}
    </>
  );
};
