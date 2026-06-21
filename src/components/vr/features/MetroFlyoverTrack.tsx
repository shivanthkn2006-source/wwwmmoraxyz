/**
 * METRO FLYOVER TRACK - Independent city-circling elevated loop
 * ----------------------------------------------------------------
 * Loads separately from MetroTrainSystem and keeps road lanes clear.
 *
 * Features:
 * - Closed flyover loop circling the city with clear East/West track sides
 * - Pillars are nudged away from city road corridors
 * - Independent 5-car shuttle with continuous movement
 * - Loud 5-second horn at quarter-loop checkpoints
 */

import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { playTrainHornBurst } from './audio/trainAudioSystem';

// ─── Constants ───────────────────────────────────────────────────────────────
const CITY_OFFSET_X = 60;
const CITY_OFFSET_Z = 45;

const CITY_RADIUS = 800;
const ROAD_SPACING = 400;
const ROAD_CLEARANCE = 66;

const FLYOVER_HEIGHT = 12;
const LOOP_HALF = CITY_RADIUS + 120; // 920
const CORNER_INSET = 230;
const BEAM_HEIGHT = 1.15;
const TRACK_WIDTH = 4.2;
const PILLAR_WIDTH = 2.2;
const PILLAR_DEPTH = 1.9;
const PILLAR_SPACING = 64;
const TRAIN_SPEED = 38;
const HORN_DURATION = 5;

// Horn uses trainAudioSystem (uploaded .mp3 files)

const playFlyoverHorn5s = (volume: number) => {
  playTrainHornBurst(Math.min(1, Math.max(0.32, volume)), HORN_DURATION);
};

// ─── Geometry Helpers ─────────────────────────────────────────────────────────
const buildFlyoverLoopCurve = (): THREE.CatmullRomCurve3 => {
  const p = [
    new THREE.Vector3(-LOOP_HALF, FLYOVER_HEIGHT, -CORNER_INSET),
    new THREE.Vector3(-LOOP_HALF, FLYOVER_HEIGHT, CORNER_INSET),
    new THREE.Vector3(-CORNER_INSET, FLYOVER_HEIGHT, LOOP_HALF),
    new THREE.Vector3(CORNER_INSET, FLYOVER_HEIGHT, LOOP_HALF),
    new THREE.Vector3(LOOP_HALF, FLYOVER_HEIGHT, CORNER_INSET),
    new THREE.Vector3(LOOP_HALF, FLYOVER_HEIGHT, -CORNER_INSET),
    new THREE.Vector3(CORNER_INSET, FLYOVER_HEIGHT, -LOOP_HALF),
    new THREE.Vector3(-CORNER_INSET, FLYOVER_HEIGHT, -LOOP_HALF),
  ];

  return new THREE.CatmullRomCurve3(p, true, 'catmullrom', 0.08);
};

const buildStripGeometry = (
  curve: THREE.CatmullRomCurve3,
  centerOffset: number,
  width: number,
  height: number,
  yBase: number,
  steps: number,
): THREE.ExtrudeGeometry => {
  const shape = new THREE.Shape();
  shape.moveTo(centerOffset - width / 2, yBase);
  shape.lineTo(centerOffset + width / 2, yBase);
  shape.lineTo(centerOffset + width / 2, yBase + height);
  shape.lineTo(centerOffset - width / 2, yBase + height);
  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, {
    steps,
    bevelEnabled: false,
    extrudePath: curve,
  });
};

const pushOffRoadAxis = (value: number, clearance: number = ROAD_CLEARANCE): number => {
  const nearestRoad = Math.round(value / ROAD_SPACING) * ROAD_SPACING;
  const delta = value - nearestRoad;

  if (Math.abs(delta) < clearance) {
    const direction = delta === 0 ? 1 : Math.sign(delta);
    return nearestRoad + direction * clearance;
  }

  return value;
};

const nudgePillarOffRoad = (x: number, z: number): [number, number] => {
  const inRoadGridSpan = Math.abs(x) <= CITY_RADIUS + 30 && Math.abs(z) <= CITY_RADIUS + 30;
  if (!inRoadGridSpan) return [x, z];

  let nextX = x;
  let nextZ = z;

  for (let i = 0; i < 4; i++) {
    const adjustedX = pushOffRoadAxis(nextX, ROAD_CLEARANCE + 10);
    const adjustedZ = pushOffRoadAxis(nextZ, ROAD_CLEARANCE + 10);

    if (Math.abs(adjustedX - nextX) < 0.001 && Math.abs(adjustedZ - nextZ) < 0.001) {
      break;
    }

    nextX = adjustedX;
    nextZ = adjustedZ;
  }

  return [nextX, nextZ];
};

// ─── Pillars ──────────────────────────────────────────────────────────────────
const FlyoverPillars: React.FC<{ curve: THREE.CatmullRomCurve3 }> = ({ curve }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const pillarCount = useMemo(() => {
    const countBySpacing = Math.floor(curve.getLength() / PILLAR_SPACING);
    return Math.max(16, countBySpacing);
  }, [curve]);

  React.useEffect(() => {
    if (!meshRef.current) return;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < pillarCount; i++) {
      const p = curve.getPointAt(i / pillarCount);
      const [safeX, safeZ] = nudgePillarOffRoad(p.x, p.z);

      dummy.position.set(safeX, FLYOVER_HEIGHT / 2, safeZ);
      dummy.scale.set(PILLAR_WIDTH, FLYOVER_HEIGHT, PILLAR_DEPTH);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [curve, pillarCount]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, pillarCount]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8a8a8a" roughness={0.86} />
    </instancedMesh>
  );
};

// ─── Track Surface ────────────────────────────────────────────────────────────
const FlyoverTrackSurface: React.FC<{ curve: THREE.CatmullRomCurve3 }> = ({ curve }) => {
  const slabGeometry = useMemo(
    () => buildStripGeometry(curve, 0, TRACK_WIDTH + 2.4, BEAM_HEIGHT, -BEAM_HEIGHT / 2, 300),
    [curve],
  );
  const railLeftGeometry = useMemo(
    () => buildStripGeometry(curve, -1.45, 0.15, 0.14, BEAM_HEIGHT / 2 + 0.08, 260),
    [curve],
  );
  const railRightGeometry = useMemo(
    () => buildStripGeometry(curve, 1.45, 0.15, 0.14, BEAM_HEIGHT / 2 + 0.08, 260),
    [curve],
  );
  const barrierLeftGeometry = useMemo(
    () => buildStripGeometry(curve, -(TRACK_WIDTH / 2 + 1.15), 0.16, 0.72, BEAM_HEIGHT / 2 + 0.24, 240),
    [curve],
  );
  const barrierRightGeometry = useMemo(
    () => buildStripGeometry(curve, TRACK_WIDTH / 2 + 1.15, 0.16, 0.72, BEAM_HEIGHT / 2 + 0.24, 240),
    [curve],
  );

  return (
    <group>
      <mesh geometry={slabGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#5a5a5a" roughness={0.88} metalness={0.08} />
      </mesh>

      <mesh geometry={railLeftGeometry}>
        <meshStandardMaterial color="#2f2f2f" metalness={0.72} roughness={0.22} />
      </mesh>
      <mesh geometry={railRightGeometry}>
        <meshStandardMaterial color="#2f2f2f" metalness={0.72} roughness={0.22} />
      </mesh>

      <mesh geometry={barrierLeftGeometry}>
        <meshStandardMaterial color="#6a6a6a" roughness={0.82} />
      </mesh>
      <mesh geometry={barrierRightGeometry}>
        <meshStandardMaterial color="#6a6a6a" roughness={0.82} />
      </mesh>
    </group>
  );
};

// ─── Moving Flyover Train ─────────────────────────────────────────────────────
const FlyoverTrain: React.FC<{ curve: THREE.CatmullRomCurve3 }> = ({ curve }) => {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0.11);
  const lastHornAtRef = useRef(-999);
  const { camera } = useThree();

  const trackLength = useMemo(() => curve.getLength(), [curve]);

  React.useEffect(() => {
    const handleForceHorn = () => {
      if (!groupRef.current) return;
      const dist = camera.position.distanceTo(groupRef.current.position);
      const volume = dist < 120 ? 1 : dist < 900 ? (900 - dist) / 780 : 0.1;
      playFlyoverHorn5s(volume);
    };

    window.addEventListener('vr-force-horn', handleForceHorn as EventListener);
    return () => window.removeEventListener('vr-force-horn', handleForceHorn as EventListener);
  }, [camera]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);

    progressRef.current = (progressRef.current + (TRAIN_SPEED * dt) / trackLength) % 1;

    const pos = curve.getPointAt(progressRef.current);
    const lookAt = curve.getPointAt((progressRef.current + 0.0035) % 1);
    const trainY = FLYOVER_HEIGHT + BEAM_HEIGHT / 2 + 1.6;

    groupRef.current.position.set(pos.x, trainY, pos.z);
    groupRef.current.lookAt(lookAt.x, trainY, lookAt.z);

    const hornMarkers = [0, 0.25, 0.5, 0.75];
    const currentTime = state.clock.elapsedTime;

    for (const marker of hornMarkers) {
      const wrappedDelta = Math.min(
        Math.abs(progressRef.current - marker),
        1 - Math.abs(progressRef.current - marker),
      );

      if (wrappedDelta < 0.006 && currentTime - lastHornAtRef.current > 5.15) {
        const dist = camera.position.distanceTo(groupRef.current.position);
        const volume = dist < 120 ? 1 : dist < 900 ? (900 - dist) / 780 : 0.08;
        playFlyoverHorn5s(volume);
        lastHornAtRef.current = currentTime;
        break;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 5 }, (_, i) => {
        const zOff = (i - 2) * 9.2;
        return (
          <group key={i} position={[0, 0, zOff]}>
            <mesh castShadow>
              <boxGeometry args={[3.4, 2.8, 8.2]} />
              <meshStandardMaterial color="#b0d4f1" roughness={0.3} metalness={0.42} />
            </mesh>
            <mesh position={[0, 1.6, 0]}>
              <boxGeometry args={[3.6, 0.28, 8.4]} />
              <meshStandardMaterial color="#e0e0e0" roughness={0.48} />
            </mesh>
            {[-1, 0, 1].map((wx, wi) => (
              <mesh key={wi} position={[1.71, 0.38, wx * 2.15]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[1.7, 1.1]} />
                <meshStandardMaterial
                  color="#aaddff"
                  transparent
                  opacity={0.62}
                  emissive="#88bbee"
                  emissiveIntensity={0.16}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ))}
          </group>
        );
      })}

      <pointLight position={[0, 0.2, 23]} color="#fffbe6" intensity={2.4} distance={75} />
    </group>
  );
};

// ─── Flyover Station ──────────────────────────────────────────────────────────
const FlyoverStation: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      <mesh receiveShadow>
        <boxGeometry args={[30, 0.5, 8]} />
        <meshStandardMaterial color="#bfbfbf" roughness={0.7} />
      </mesh>
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[32, 0.3, 10]} />
        <meshStandardMaterial color="#4a90d9" roughness={0.4} metalness={0.3} transparent opacity={0.7} />
      </mesh>
      {[-12, -4, 4, 12].flatMap((x) => [4, -4].map((z) => [x, z] as const)).map(([x, z], i) => (
        <mesh key={i} position={[x, 2, z]}>
          <cylinderGeometry args={[0.3, 0.3, 4, 8]} />
          <meshStandardMaterial color="#888" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const MetroFlyoverTrack: React.FC = () => {
  const loopCurve = useMemo(() => buildFlyoverLoopCurve(), []);
  const stationY = FLYOVER_HEIGHT + BEAM_HEIGHT / 2 + 0.3;

  const eastStation: [number, number, number] = [LOOP_HALF - 28, stationY, 0];
  const westStation: [number, number, number] = [-LOOP_HALF + 28, stationY, 0];
  const northStation: [number, number, number] = [0, stationY, LOOP_HALF - 28];
  const southStation: [number, number, number] = [0, stationY, -LOOP_HALF + 28];

  return (
    <group position={[CITY_OFFSET_X, 0, CITY_OFFSET_Z]}>
      <FlyoverPillars curve={loopCurve} />
      <FlyoverTrackSurface curve={loopCurve} />
      <FlyoverTrain curve={loopCurve} />

      <FlyoverStation position={eastStation} />
      <FlyoverStation position={westStation} />
      <FlyoverStation position={northStation} />
      <FlyoverStation position={southStation} />
    </group>
  );
};

export default MetroFlyoverTrack;
