import { RealMapLamps } from './RealMapLamps';
import { ZoeStreetAwareness } from './ZoeStreetAwareness';
import { addBlockRelics, dropBlockRelics } from './streetRelics';
import { StreetRelics } from './StreetRelics';
import { indexBlock, dropBlock } from './mapIndex';
import { StreetTraffic } from './StreetTraffic';
import { ThermalGovernor, useGovLevel } from './thermalGovernor';
import { buildBuildingParts, buildRoadParts, makeWallMaterial, ROOF_MAT, ROAD_HI_MAT, PATH_MAT, LINE_MAT, CENTER_MAT } from './streetLook';
import { MapLabels } from './MapLabels';
import { buildWaterParts, WATER_MAT, PARK_MAT, BRIDGE_MAT } from './waterLook';
import { StreetHouses } from './StreetHouses';
import { CityPortals, OpenPortal } from './CityPortals';
import { PortalBeam } from './PortalBeam';
/**
 * Real Map layer — the player's actual neighbourhood from OpenStreetMap.
 * Streams a 3×3 grid of ~200 m chunks around the camera (unloads at
 * distance 2 for hysteresis); each chunk's buildings and roads are merged
 * into one geometry each and disposed on unload, so 4 GB phones stay light.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { chebyshev, chunkBBox, chunkOf, neighborhood, toLatLng, toLocal, type LatLng, type ChunkId } from './geo';
import { loadChunk, setChunkKeyFn, type OsmChunk } from './osm';
import { setChunkStats, useWorldState, resolveOrigin, PORTAL_OFFSET, enterMMora, startAerialEntry, takeResume, applyResume, getWorldState, entryHeight, reportNearbyHeight } from '../worldMode';
import { PortalDoorway } from '../portal/PortalDoorway';
import { DemoExplorer } from './DemoExplorer';
import { useDemoExplorerOn } from './demoExplorerSwitch';
import { AdminRealmapSync } from './AdminRealmapSync';

const WALL_MAT = makeWallMaterial();
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
    let tries = 0;
    let timer = 0;
    const attempt = () => loadChunk(id.key, chunkBBox(id.i, id.j, origin.lat)).then((d) => {
      if (!alive) return;
      if (d) {
        setData(d); onReady(id.key); addBlockRelics(id.key, d); indexBlock(id.key, d);
        // Tallest building near the start point decides the entry height (roof-top view).
        let tallest = 0;
        for (const b of d.buildings) {
          const p0 = b.pts[0];
          if (!p0) continue;
          const { x, z } = toLocal({ lat: p0[0], lng: p0[1] }, origin);
          if (Math.hypot(x, z) < 260 && b.h > tallest) tallest = b.h;
        }
        if (tallest) reportNearbyHeight(tallest);
        return;
      }
      // Map servers busy: try this block again later instead of leaving a hole.
      if (++tries < 4) timer = window.setTimeout(attempt, 8000 * tries);
    });
    void attempt();
    return () => { alive = false; window.clearTimeout(timer); dropBlockRelics(id.key); dropBlock(id.key); };
  }, [id.key, id.i, id.j, origin.lat, onReady]);

  const geo = useMemo(() => data ? {
    b: buildBuildingParts(data, origin),
    r: buildRoadParts(data, origin),
    w: buildWaterParts(data, origin),
    pois: data.pois.map((p) => ({ ...p, ...toLocal(p, origin) })),
  } : null, [data, origin]);

  useEffect(() => () => { if (!geo) return; [geo.b.walls, geo.b.roofs, geo.r.road, geo.r.path, geo.r.lines, geo.r.centre, geo.w.water, geo.w.park, geo.w.deck, geo.w.rails].forEach((g) => g?.dispose()); }, [geo]);
  const level = useGovLevel();

  if (!geo) return null;
  return (
    <group>
      {geo.w.park && <mesh geometry={geo.w.park} material={PARK_MAT} />}
      {geo.w.water && <mesh geometry={geo.w.water} material={WATER_MAT} />}
      {geo.w.deck && <mesh geometry={geo.w.deck} material={BRIDGE_MAT} />}
      {geo.r.road && <mesh geometry={geo.r.road} material={ROAD_HI_MAT} receiveShadow />}
      {geo.r.path && <mesh geometry={geo.r.path} material={PATH_MAT} />}
      {geo.r.lines && <mesh geometry={geo.r.lines} material={LINE_MAT} />}
      {geo.r.centre && level < 2 && <mesh geometry={geo.r.centre} material={CENTER_MAT} />}
      {geo.b.walls && <mesh geometry={geo.b.walls} material={WALL_MAT} />}
      {geo.b.roofs && <mesh geometry={geo.b.roofs} material={ROOF_MAT} />}
      {geo.pois.slice(0, 16).map((p, k) => (
        <group key={k} position={[p.x, 0, p.z]}>
          <mesh position={[0, 4, 0]} material={POI_MAT}>
            <octahedronGeometry args={[0.6, 0]} />
          </mesh>
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
  useEffect(() => { setChunkKeyFn((lat, lng) => chunkOf({ lat, lng }, origin.lat).key); }, [origin.lat]);

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
  const { scene, camera } = useThree();
  // Fog follows height so the entry view from above still sees the ground.
  useFrame(() => {
    const f = scene.fog as THREE.Fog | null;
    if (f && 'far' in f) { const y = Math.max(0, camera.position.y); f.near = 140 + y; f.far = 560 + y * 2.2; }
  });
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

/**
 * Entry flight: starts looking straight down like a flat 2D map, then glides down
 * and tilts into 3D until it rests ~100 m above the street (or just over the
 * tallest nearby roof). Afterwards it only re-asserts that pose if the player
 * controller snaps the camera to the ground while it is still mounting.
 */
export const ENTRY_FLIGHT_MS = 3800;
const FLIGHT_EXTRA_M = 320;
const END_PITCH = -0.75;
const START_PITCH = -1.45;
export function entryPose(progress: number, h: number) {
  const p = Math.min(1, Math.max(0, progress));
  const e = p * p * (3 - 2 * p);
  return { y: h + FLIGHT_EXTRA_M * (1 - e), z: 0.01 + h * 0.9 * e, pitch: START_PITCH + (END_PITCH - START_PITCH) * e };
}
const EntryFlight: React.FC = () => {
  const { camera } = useThree();
  const t0 = useRef<number | null>(null);
  useFrame(() => {
    if (!getWorldState().aerial) { t0.current = null; return; }
    const now = performance.now();
    if (t0.current === null) t0.current = now;
    const elapsed = now - t0.current;
    const h = entryHeight();
    if (elapsed <= ENTRY_FLIGHT_MS) {
      const pose = entryPose(elapsed / ENTRY_FLIGHT_MS, h);
      camera.position.set(0, pose.y, pose.z);
      camera.rotation.set(pose.pitch, 0, 0);
    } else {
      const pose = entryPose(1, h);
      if (elapsed < ENTRY_FLIGHT_MS + 6000 && camera.position.y < h - 40) {
        // The controller snapped the camera to the ground while mounting: put it back.
        camera.position.set(camera.position.x, pose.y, camera.position.z);
      } else if (Math.abs(camera.position.y - pose.y) > 0.5 && Math.hypot(camera.position.x, camera.position.z - pose.z) < 8) {
        // Taller roofs reported after the flight: rise smoothly while the player hasn't moved off.
        camera.position.y += (pose.y - camera.position.y) * 0.05;
      }
    }
  });
  return null;
};

export const RealMapWorld: React.FC = () => {
  const demoOn = useDemoExplorerOn();
  const { origin } = useWorldState();
  useEffect(() => { resolveOrigin(); }, []);
  // Start the entry flight once the first street blocks are in (or after 4 s), so
  // the roof-top height is known and the player doesn't fly over an empty map.
  useEffect(() => {
    if (origin.status !== 'ready') return;
    const started = performance.now();
    const id = window.setInterval(() => {
      const w = getWorldState();
      if (w.chunksLoaded >= 1 || performance.now() - started > 4000) {
        const sv = takeResume();
        if (sv) applyResume(sv); else startAerialEntry();
        window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [origin.status]);
  return (
    <>
      <hemisphereLight args={['#ffffff', '#8a7a62', 0.9]} />
      <directionalLight position={[120, 200, 60]} intensity={1.1} />
      <RealSky />
      <Ground />
      <EntryFlight />
      {origin.status === 'ready' && <ChunkStreamer origin={origin.origin} />}
      {origin.status === 'ready' && <StreetRelics origin={origin.origin} />}
      {origin.status === 'ready' && <MapLabels origin={origin.origin} />}
      {origin.status === 'ready' && <StreetHouses origin={origin.origin} />}
      {origin.status === 'ready' && <StreetTraffic origin={origin.origin} />}
      {origin.status === 'ready' && <RealMapLamps origin={origin.origin} />}
      {origin.status === 'ready' && <ZoeStreetAwareness origin={origin.origin} />}
      <ThermalGovernor />
      <AdminRealmapSync />
      <OpenPortal base={PORTAL_OFFSET as [number, number, number]} />
      <CityPortals />
      {demoOn && <DemoExplorer />}
    </>
  );
};

export default RealMapWorld;
