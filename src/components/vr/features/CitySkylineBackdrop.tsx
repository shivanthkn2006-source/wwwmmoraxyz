/**
 * CITY SKYLINE BACKDROP - 360° building silhouette ring visible behind flyover
 * Creates the illusion of a dense urban skyline visible from all angles
 * in the VR world, similar to real city panoramas seen from inside.
 * 
 * INDEPENDENT HOOK — purely visual backdrop, no interaction with other systems.
 * Renders as instanced meshes for maximum performance.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

const SKYLINE_RADIUS = 850; // Just outside city radius - closer for visibility
const BUILDING_COUNT = 150; // Reduced from 300 to prevent GPU spike
const MIN_HEIGHT = 30;
const MAX_HEIGHT = 160;

interface SkylineBuilding {
  x: number;
  z: number;
  height: number;
  width: number;
  depth: number;
}

const generateSkylineRing = (): SkylineBuilding[] => {
  const buildings: SkylineBuilding[] = [];
  const seed = 42;

  for (let i = 0; i < BUILDING_COUNT; i++) {
    const angle = (i / BUILDING_COUNT) * Math.PI * 2;
    // Slight radius variation for natural look
    const hash = Math.sin(i * 12.9898 + seed) * 43758.5453;
    const radiusJitter = ((hash - Math.floor(hash)) - 0.5) * 60;
    const r = SKYLINE_RADIUS + radiusJitter;

    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    const heightHash = Math.sin(i * 78.233 + seed * 2) * 43758.5453;
    const heightRatio = heightHash - Math.floor(heightHash);
    const height = MIN_HEIGHT + heightRatio * (MAX_HEIGHT - MIN_HEIGHT);

    // Occasional tall tower
    const isTower = i % 12 === 0;
    const finalHeight = isTower ? height * 1.5 : height;

    buildings.push({
      x,
      z,
      height: finalHeight,
      width: 6 + Math.random() * 8,
      depth: 6 + Math.random() * 8,
    });
  }

  return buildings;
};

export const CitySkylineBackdrop: React.FC<{ isNight?: boolean }> = React.memo(({ isNight = false }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const buildings = useMemo(() => generateSkylineRing(), []);

  useEffect(() => {
    if (!meshRef.current) return;

    const mat = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      pos.set(b.x, b.height / 2, b.z);
      scale.set(b.width, b.height, b.depth);
      quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(b.z, b.x));
      mat.compose(pos, quat, scale);
      meshRef.current.setMatrixAt(i, mat);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [buildings]);

  const windowMeshRef = useRef<THREE.InstancedMesh>(null);

  // Window lights on some buildings (sparse for performance)
  const windowPositions = useMemo(() => {
    const wins: Array<{ x: number; y: number; z: number }> = [];
    for (let i = 0; i < buildings.length; i += 3) {
      const b = buildings[i];
      const floors = Math.floor(b.height / 4);
      for (let f = 0; f < Math.min(floors, 6); f++) {
        wins.push({
          x: b.x + (Math.random() - 0.5) * b.width * 0.6,
          y: f * 4 + 3,
          z: b.z + (Math.random() - 0.5) * b.depth * 0.6,
        });
      }
    }
    return wins;
  }, [buildings]);

  useEffect(() => {
    if (!windowMeshRef.current) return;
    const mat = new THREE.Matrix4();
    for (let i = 0; i < windowPositions.length; i++) {
      const w = windowPositions[i];
      mat.makeTranslation(w.x, w.y, w.z);
      mat.scale(new THREE.Vector3(1.2, 0.8, 0.1));
      windowMeshRef.current.setMatrixAt(i, mat);
    }
    windowMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [windowPositions]);

  return (
    <group>
      {/* Building silhouettes */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, buildings.length]} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#8899aa"
          emissive="#4a6070"
          emissiveIntensity={isNight ? 0.2 : 0.1}
          roughness={0.75}
          metalness={0.25}
        />
      </instancedMesh>

      {/* Window lights */}
      {windowPositions.length > 0 && (
        <instancedMesh ref={windowMeshRef} args={[undefined, undefined, windowPositions.length]}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial
            color="#fef3c7"
            emissive="#fef3c7"
            emissiveIntensity={isNight ? 0.55 : 0.1}
            transparent
            opacity={isNight ? 0.68 : 0.22}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}
    </group>
  );
});
CitySkylineBackdrop.displayName = 'CitySkylineBackdrop';

export default CitySkylineBackdrop;
