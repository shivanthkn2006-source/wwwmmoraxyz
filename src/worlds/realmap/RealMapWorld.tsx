/**
 * Real Map layer — the player's actual neighbourhood from OpenStreetMap.
 * Streams a 3×3 grid of ~200 m chunks around the camera (unloads at
 * distance 2 for hysteresis); each chunk's buildings and roads are merged
 * into one geometry each and disposed on unload, so 4 GB phones stay light.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { chebyshev, chunkBBox, chunkOf, neighborhood, toLatLng, toLocal, type LatLng, type ChunkId } from './geo';
import { loadChunk, type OsmChunk } from './osm';
import { setChunkStats, useWorldState, resolveOrigin, PORTAL_OFFSET, enterMMora } from '../worldMode';
import { PortalDoorway } from '../portal/PortalDoorway';
import { DemoExplorer } from './DemoExplorer';

const BUILDING_MAT = new THREE.MeshStandardMaterial({ color: '#e9dfcf', roughness: 0.75, metalness: 0.05 });
const ROAD_MAT = new THREE.MeshStandardMaterial({ color: '#5b5f66', roughness: 0.95 });
const GROUND_MAT = new THREE.MeshStandardMaterial({ color: '#b9c7a3', roughness: 1 });
const POI_MAT = new THREE.MeshStandardMaterial({ color: '#387BF6', emissive: '#387BF6', emissiveIntensity: 0.6 });

export function buildBuildingsGeometry(data: OsmChunk, origin: LatLng): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];
  for (const b of data.buildings) {
    const shape = new THREE.Shape();
    b.pts.forEach(([lat, lng], k) => {
      const { x, z } = toLocal({ lat, lng }, origin);
      if (k === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z);
    });
    try {
      const g = new THREE.ExtrudeGeometry(shape, { depth: b.h, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      g.deleteAttribute('uv');
      parts.push(g);
    } catch { /* malformed footprint */ }
  }
  if (!parts.length) return null;
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

export function buildRoadsGeometry(data: OsmChunk, origin: LatLng): THREE.BufferGeometry | null {
  const pos: number[] = [];
  for (const r of data.roads) {
    for (let k = 0; k < r.pts.length - 1; k++) {
      const a = toLocal({ lat: r.pts[k][0], lng: r.pts[k][1] }, origin);
      const b = toLocal({ lat: r.pts[k + 1][0], lng: r.pts[k + 1][1] }, origin);
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.01) continue;
      const nx = (-dz / len) * r.w * 0.5, nz = (dx / len) * r.w * 0.5;
      const y = 0.03;
      pos.push(a.x + nx, y, a.z + nz, b.x + nx, y, b.z + nz, b.x - nx, y, b.z - nz,
               a.x + nx, y, a.z + nz, b.x - nx, y, b.z - nz, a.x - nx, y, a.z - nz);
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const n = new Float32Array(pos.length);
  for (let k = 1; k < n.length; k += 3) n[k] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}

const Chunk: React.FC<{ id: ChunkId; origin: LatLng; onReady: (key: string) => void }> = ({ id, origin, onReady }) => {
  const [data, setData] = useState<OsmChunk | null>(null);
  useEffect(() => {
    let alive = true;
    loadChunk(id.key, chunkBBox(id.i, id.j, origin.lat)).then((d) => {
      if (!alive) return;
      setData(d);
      onReady(id.key);
    });
    return () => { alive = false; };
  }, [id.key, id.i, id.j, origin.lat, onReady]);

  const geo = useMemo(() => data ? {
    buildings: buildBuildingsGeometry(data, origin),
    roads: buildRoadsGeometry(data, origin),
    pois: data.pois.map((p) => ({ ...p, ...toLocal(p, origin) })),
  } : null, [data, origin]);

  useEffect(() => () => { geo?.buildings?.dispose(); geo?.roads?.dispose(); }, [geo]);

  if (!geo) return null;
  return (
    <group>
      {geo.roads && <mesh geometry={geo.roads} material={ROAD_MAT} receiveShadow />}
      {geo.buildings && <mesh geometry={geo.buildings} material={BUILDING_MAT} />}
      {geo.pois.slice(0, 8).map((p, k) => (
        <group key={k} position={[p.x, 0, p.z]}>
          <mesh position={[0, 4, 0]} material={POI_MAT}>
            <octahedronGeometry args={[0.6, 0]} />
          </mesh>
          <Html position={[0, 5.4, 0]} center distanceFactor={18} style={{ pointerEvents: 'none' }}>
            <div className="surface-warm-tan rounded-full px-2 py-0.5 text-[10px] whitespace-nowrap text-white">{p.name}</div>
          </Html>
        </group>
      ))}
    </group>
  );
};

const LOW_MEM = typeof navigator !== 'undefined' &&
  (((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4);

const ChunkStreamer: React.FC<{ origin: LatLng }> = ({ origin }) => {
  const { camera } = useThree();
  const [active, setActive] = useState<ChunkId[]>([]);
  const ready = useRef(new Set<string>());
  const last = useRef('');
  const timer = useRef(0);
  const onReady = React.useCallback((key: string) => { ready.current.add(key); }, []);

  useFrame((_, dt) => {
    timer.current += dt;
    if (timer.current < 0.5) return;
    timer.current = 0;
    const here = chunkOf(toLatLng(camera.position.x, camera.position.z, origin), origin.lat);
    const wanted = neighborhood(here.i, here.j, 1);
    setChunkStats(wanted.filter((w) => ready.current.has(w.key)).length, wanted.length);
    if (here.key === last.current) return;
    last.current = here.key;
    setActive((prev) => {
      const keep = prev.filter((c) => chebyshev(c, here) <= (LOW_MEM ? 1 : 2));
      const keys = new Set(keep.map((c) => c.key));
      const next = [...keep, ...wanted.filter((w) => !keys.has(w.key))];
      const nextKeys = new Set(next.map((c) => c.key));
      ready.current.forEach((k) => { if (!nextKeys.has(k)) ready.current.delete(k); });
      return next;
    });
  });

  return <>{active.map((c) => <Chunk key={c.key} id={c} origin={origin} onReady={onReady} />)}</>;
};

/** Daytime sky for the Real Map (night is handled by the existing night sky). */
const RealSky: React.FC = () => {
  const { scene } = useThree();
  useEffect(() => {
    const apply = () => {
      const h = new Date().getHours();
      if (h >= 7 && h < 16) scene.background = new THREE.Color('#a9cdea');
      if (!scene.fog) scene.fog = new THREE.Fog('#cfe0ee', 140, 560);
    };
    apply();
    const id = window.setInterval(apply, 60_000);
    return () => { window.clearInterval(id); scene.fog = null; };
  }, [scene]);
  return null;
};

const Ground: React.FC = () => {
  const ref = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (ref.current) ref.current.position.set(Math.round(camera.position.x / 50) * 50, 0, Math.round(camera.position.z / 50) * 50);
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} material={GROUND_MAT} receiveShadow>
      <planeGeometry args={[1400, 1400]} />
    </mesh>
  );
};

export const RealMapWorld: React.FC = () => {
  const { origin } = useWorldState();
  useEffect(() => { resolveOrigin(); }, []);
  return (
    <>
      <hemisphereLight args={['#ffffff', '#8a7a62', 0.9]} />
      <directionalLight position={[120, 200, 60]} intensity={1.1} />
      <RealSky />
      <Ground />
      {origin.status === 'ready' && <ChunkStreamer origin={origin.origin} />}
      <PortalDoorway position={PORTAL_OFFSET} label="M'Mora World" onEnter={enterMMora} />
      <DemoExplorer />
    </>
  );
};

export default RealMapWorld;
