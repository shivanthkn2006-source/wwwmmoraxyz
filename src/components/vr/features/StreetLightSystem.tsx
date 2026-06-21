/**
 * STREET LIGHT SYSTEM - Realistic city street lamps with day/night cycle
 * 
 * Lights are placed along road EDGES (outside clearance), in parks,
 * and around key areas. They turn on at dusk and off at dawn,
 * matching the SunLightCycle real-time clock.
 * 
 * AVOIDS: road centers, train tracks (elliptical 700/752 radii), bus paths.
 * Uses InstancedMesh for maximum performance.
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Layout constants (must match city grid) ─────────────────────────────
const ROAD_SPACING = 400;
const ROAD_EDGE_OFFSET = 62; // Just outside road clearance (56-95 range), on the sidewalk
const CITY_BOUNDS = 750;
const CITY_OFFSET_X = 60;
const CITY_OFFSET_Z = 45;
const INNER_RX = 700, INNER_RZ = 500;
const OUTER_RX = 752, OUTER_RZ = 552;
const METRO_BUFFER = 30;

// ── Helpers ─────────────────────────────────────────────────────────────
const seededRand = (i: number, seed = 7919) => {
  const h = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

const isOnMetroTrack = (x: number, z: number): boolean => {
  const localX = x - CITY_OFFSET_X;
  const localZ = z - CITY_OFFSET_Z;
  const nx1 = localX / INNER_RX, nz1 = localZ / INNER_RZ;
  const d1 = Math.sqrt(nx1 * nx1 + nz1 * nz1);
  if (Math.abs(d1 - 1) < METRO_BUFFER / INNER_RX) return true;
  const nx2 = localX / OUTER_RX, nz2 = localZ / OUTER_RZ;
  const d2 = Math.sqrt(nx2 * nx2 + nz2 * nz2);
  if (Math.abs(d2 - 1) < METRO_BUFFER / OUTER_RX) return true;
  return false;
};

const isOnRoadCenter = (x: number, z: number): boolean => {
  const localX = x - CITY_OFFSET_X;
  const localZ = z - CITY_OFFSET_Z;
  const nearRoadX = Math.abs(localX - Math.round(localX / ROAD_SPACING) * ROAD_SPACING) < 20;
  const nearRoadZ = Math.abs(localZ - Math.round(localZ / ROAD_SPACING) * ROAD_SPACING) < 20;
  return nearRoadX || nearRoadZ;
};

// ── Light position generation ───────────────────────────────────────────
interface LampPos { x: number; z: number; type: 'street' | 'park' | 'highway'; rotY: number; }

const generateLampPositions = (): LampPos[] => {
  const lamps: LampPos[] = [];
  let idx = 0;

  // 1) STREET LAMPS along road edges — both sides of each road, spaced ~40m apart
  for (let roadIdx = -2; roadIdx <= 2; roadIdx++) {
    const roadCenter = roadIdx * ROAD_SPACING;

    // Lamps along X-axis roads (road runs in X direction, lamps offset in Z)
    for (let x = -CITY_BOUNDS; x <= CITY_BOUNDS; x += 38 + seededRand(idx++) * 8) {
      for (const side of [-1, 1]) {
        const worldX = x + CITY_OFFSET_X;
        const worldZ = roadCenter + side * ROAD_EDGE_OFFSET + CITY_OFFSET_Z;
        if (Math.abs(x) > CITY_BOUNDS || Math.abs(worldZ - CITY_OFFSET_Z) > CITY_BOUNDS) continue;
        if (isOnMetroTrack(worldX, worldZ) || isOnRoadCenter(worldX, worldZ)) continue;
        lamps.push({ x: worldX, z: worldZ, type: 'street', rotY: 0 });
      }
    }

    // Lamps along Z-axis roads (road runs in Z direction, lamps offset in X)
    for (let z = -CITY_BOUNDS; z <= CITY_BOUNDS; z += 38 + seededRand(idx++) * 8) {
      for (const side of [-1, 1]) {
        const worldX = roadCenter + side * ROAD_EDGE_OFFSET + CITY_OFFSET_X;
        const worldZ = z + CITY_OFFSET_Z;
        if (Math.abs(worldX - CITY_OFFSET_X) > CITY_BOUNDS || Math.abs(z) > CITY_BOUNDS) continue;
        if (isOnMetroTrack(worldX, worldZ) || isOnRoadCenter(worldX, worldZ)) continue;
        lamps.push({ x: worldX, z: worldZ, type: 'street', rotY: Math.PI / 2 });
      }
    }
  }

  // 2) PARK LIGHTS — scattered in green spaces between roads
  for (let i = 0; i < 60; i++) {
    const angle = seededRand(i + 5000) * Math.PI * 2;
    const dist = 80 + seededRand(i + 6000) * 350;
    const x = Math.cos(angle) * dist + CITY_OFFSET_X;
    const z = Math.sin(angle) * dist + CITY_OFFSET_Z;
    if (Math.abs(x - CITY_OFFSET_X) > CITY_BOUNDS || Math.abs(z - CITY_OFFSET_Z) > CITY_BOUNDS) continue;
    if (isOnMetroTrack(x, z) || isOnRoadCenter(x, z)) continue;
    lamps.push({ x, z, type: 'park', rotY: seededRand(i + 7000) * Math.PI * 2 });
  }

  // 3) HIGHWAY LAMPS — along the eastern highway toward Yellowstone
  for (let x = 200; x <= 800; x += 50) {
    const worldX = x + CITY_OFFSET_X;
    const worldZ = CITY_OFFSET_Z + 12 + (seededRand(idx++) - 0.5) * 4;
    if (!isOnMetroTrack(worldX, worldZ)) {
      lamps.push({ x: worldX, z: worldZ, type: 'highway', rotY: Math.PI / 2 });
    }
    idx++;
  }

  return lamps;
};

// ── Pole + Lamp head geometry constants ─────────────────────────────────
const POLE_HEIGHT_STREET = 6.4;
const POLE_HEIGHT_PARK = 4.5;
const POLE_HEIGHT_HIGHWAY = 7.8;

const getHeight = (type: LampPos['type']) =>
  type === 'highway' ? POLE_HEIGHT_HIGHWAY : type === 'park' ? POLE_HEIGHT_PARK : POLE_HEIGHT_STREET;

// ── Component ───────────────────────────────────────────────────────────
const StreetLightSystem: React.FC = React.memo(() => {
  const lamps = useMemo(() => generateLampPositions(), []);
  const [isNight, setIsNight] = useState(() => {
    const h = new Date().getHours();
    return h < 6 || h >= 18;
  });

  // Listen for sky-phase-change — use detail.isNight (API-based)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (typeof detail.isNight === 'boolean') {
        setIsNight(detail.isNight);
      }
    };
    window.addEventListener('vr-sun-hour-change', handler);
    window.addEventListener('sky-phase-change', handler);
    return () => {
      window.removeEventListener('vr-sun-hour-change', handler);
      window.removeEventListener('sky-phase-change', handler);
    };
  }, []);

  // Refs for instanced meshes
  const poleRef = useRef<THREE.InstancedMesh>(null);
  const armRef = useRef<THREE.InstancedMesh>(null);
  const bulbRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);

  // Set up instance matrices
  useEffect(() => {
    if (!poleRef.current || !armRef.current || !bulbRef.current || !glowRef.current) return;

    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion();

    for (let i = 0; i < lamps.length; i++) {
      const l = lamps[i];
      const h = getHeight(l.type);
      const poleRadius = l.type === 'park' ? 0.08 : 0.12;

      // Pole
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), l.rotY);
      mat.compose(
        new THREE.Vector3(l.x, h / 2, l.z),
        q,
        new THREE.Vector3(poleRadius * 2, h, poleRadius * 2)
      );
      poleRef.current.setMatrixAt(i, mat);

      // Arm (horizontal extension at top)
      const armLen = l.type === 'park' ? 0.5 : 1.2;
      mat.compose(
        new THREE.Vector3(l.x + Math.cos(l.rotY) * armLen * 0.5, h - 0.15, l.z + Math.sin(l.rotY) * armLen * 0.5),
        q,
        new THREE.Vector3(armLen, 0.08, 0.08)
      );
      armRef.current.setMatrixAt(i, mat);

      // Bulb housing
      const bx = l.x + Math.cos(l.rotY) * armLen;
      const bz = l.z + Math.sin(l.rotY) * armLen;
      mat.compose(
        new THREE.Vector3(bx, h - 0.35, bz),
        q,
        new THREE.Vector3(0.5, 0.25, 0.35)
      );
      bulbRef.current.setMatrixAt(i, mat);

       // Glow disc (only visible at night)
      mat.compose(
        new THREE.Vector3(bx, h - 0.5, bz),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2),
         new THREE.Vector3(4.2, 4.2, 1)
      );
      glowRef.current.setMatrixAt(i, mat);
    }

    poleRef.current.instanceMatrix.needsUpdate = true;
    armRef.current.instanceMatrix.needsUpdate = true;
    bulbRef.current.instanceMatrix.needsUpdate = true;
    glowRef.current.instanceMatrix.needsUpdate = true;
  }, [lamps]);

  // Animate glow intensity
  const bulbMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (bulbMatRef.current) {
      bulbMatRef.current.emissiveIntensity = isNight ? 3.8 : 0.04;
      bulbMatRef.current.opacity = isNight ? 1 : 0.18;
    }
    if (glowMatRef.current) {
      glowMatRef.current.opacity = isNight ? 0.42 : 0;
    }
  });

  const count = lamps.length;

  return (
    <group>
      {/* Poles */}
      <instancedMesh ref={poleRef} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="hsl(0 0% 29%)" roughness={0.7} metalness={0.6} />
      </instancedMesh>

      {/* Arms */}
      <instancedMesh ref={armRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="hsl(0 0% 29%)" roughness={0.7} metalness={0.6} />
      </instancedMesh>

      {/* Bulb housings */}
      <instancedMesh ref={bulbRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          ref={bulbMatRef}
          color="hsl(42 55% 95%)"
          emissive="hsl(40 100% 93%)"
          emissiveIntensity={isNight ? 3.8 : 0.04}
          transparent
          opacity={isNight ? 1 : 0.18}
        />
      </instancedMesh>

      {/* Glow discs beneath lamps (night only) */}
      <instancedMesh ref={glowRef} args={[undefined, undefined, count]}>
        <circleGeometry args={[1, 12]} />
        <meshBasicMaterial
          ref={glowMatRef}
          color="hsl(42 100% 92%)"
          transparent
          opacity={isNight ? 0.42 : 0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
});

StreetLightSystem.displayName = 'StreetLightSystem';
export default StreetLightSystem;
