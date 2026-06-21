/**
 * METRO TRAIN SYSTEM - High-Fidelity Elevated Metro
 * UPGRADED: Station entrances (stairs/escalators/elevators), door open/close
 * with 50-second halt, spatial audio with distance-based train sounds,
 * 5-second horn at stations, Zoe announcements (platform + in-train).
 */

import React, { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import {
  playTrainHornBurst,
  updateTrainRunningLevel,
  clearTrainRunningLevel,
  ensureTrainAudioVolumeEvents,
} from './audio/trainAudioSystem';
import { markVRAudioUnlocked } from '@/lib/vrAudioGate';

// ─── Constants ───────────────────────────────────────────────────────────────
const TRACK_HEIGHT = 8;
const STATION_COUNT = 14;
const TRAIN_SPEED = 40;
const COMPARTMENT_COUNT = 5;
const COMPARTMENT_LENGTH = 11;
const COMPARTMENT_GAP = 0.6;
const BODY_WIDTH = 3.6;
const BODY_HEIGHT = 3.2;
const STATION_HALT_DURATION = 60; // 1 minute halt
const DOOR_OPEN_SPEED = 0.8;
const STATION_PROXIMITY = 25;
const HORN_DURATION = 5;
const HORN_COOLDOWN_MS = 7000;
const TRAIN_GROUP_SCALE = 1.3;
const RUNNING_AUDIO_MAX_DISTANCE = 1400;
const STATION_REARM_DISTANCE = STATION_PROXIMITY * 2.4;

// Double-oval elliptical radii (non-colliding inner/outer)
const INNER_RX = 700;
const INNER_RZ = 500;
const OUTER_RX = 752;
const OUTER_RZ = 552;

let lastHornAtMs = 0;

const canPlayHornNow = () => {
  const now = Date.now();
  if (now - lastHornAtMs < HORN_COOLDOWN_MS) return false;
  lastHornAtMs = now;
  return true;
};

// ─── Brand Advertisements ────────────────────────────────────────────────────
const BRAND_ADS = [
  { brand: 'KFC', tagline: "Finger Lickin' Good!", color: '#ffffff', bgColor: '#e4002b', emoji: '🍗' },
  { brand: "McDonald's", tagline: "I'm Lovin' It", color: '#ffffff', bgColor: '#FFC72C', emoji: '🍔' },
  { brand: 'Starbucks', tagline: 'Brewed for You', color: '#ffffff', bgColor: '#00704A', emoji: '☕' },
  { brand: 'Nike', tagline: 'Just Do It', color: '#ffffff', bgColor: '#111111', emoji: '👟' },
  { brand: 'Apple', tagline: 'Think Different', color: '#ffffff', bgColor: '#333333', emoji: '🍎' },
  { brand: 'Coca-Cola', tagline: 'Taste the Feeling', color: '#ffffff', bgColor: '#F40009', emoji: '🥤' },
  { brand: 'Samsung', tagline: "Do What You Can't", color: '#ffffff', bgColor: '#1428A0', emoji: '📱' },
  { brand: 'Adidas', tagline: 'Impossible Is Nothing', color: '#ffffff', bgColor: '#000000', emoji: '⚡' },
  { brand: 'BMW', tagline: 'The Ultimate Machine', color: '#ffffff', bgColor: '#1C69D4', emoji: '🚗' },
  { brand: 'Pepsi', tagline: 'For the Love of It', color: '#ffffff', bgColor: '#004B93', emoji: '🥤' },
  { brand: 'Amazon', tagline: 'Work Hard. Have Fun.', color: '#ffffff', bgColor: '#FF9900', emoji: '📦' },
  { brand: 'Netflix', tagline: "See What's Next", color: '#ffffff', bgColor: '#E50914', emoji: '🎬' },
];

// ─── Global Train Position Registry (for crossing detection) ─────────────────
const trainPositions: Map<number, THREE.Vector3> = new Map();
const trainCrossedPairs: Set<string> = new Set();
const CROSSING_DISTANCE = 50; // trains within 50m are "crossing"

// Play uploaded 5-second metro horn burst
const playMetroHorn5s = (volume: number) => {
  if (!canPlayHornNow()) return;
  playTrainHornBurst(Math.min(1, Math.max(0.2, volume)), HORN_DURATION);
};

// ─── Station & Track generation ──────────────────────────────────────────────
const generateEllipsePoint = (t: number, rx: number, rz: number): [number, number] => {
  const angle = t * Math.PI * 2;
  return [Math.cos(angle) * rx, Math.sin(angle) * rz];
};

const generateStations = () => {
  const stationNames = [
    'Central Station', 'Park Avenue', 'Hospital Square', 'Temple Gate',
    'Market Street', 'University', 'Stadium Road', 'Hotel District',
    'Tech Park', 'Airport Link', 'Riverside', 'Old Town',
    'Harbor Point', 'Skyline Junction',
  ];

  return stationNames.slice(0, STATION_COUNT).map((name, index) => {
    const t = index / STATION_COUNT;
    const [x, z] = generateEllipsePoint(t, INNER_RX, INNER_RZ);
    return {
      name,
      position: [x, TRACK_HEIGHT, z] as [number, number, number],
      index,
    };
  });
};

const generateTrackPath = (rx: number, rz: number): THREE.Vector3[] => {
  const pts: THREE.Vector3[] = [];
  const segments = 220;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const [x, z] = generateEllipsePoint(t, rx, rz);
    pts.push(new THREE.Vector3(x, TRACK_HEIGHT, z));
  }
  return pts;
};

const ROAD_SPACING = 400;
const ROAD_CLEARANCE = 92;

const pushOffRoadAxis = (value: number, clearance: number = ROAD_CLEARANCE): number => {
  const nearestRoad = Math.round(value / ROAD_SPACING) * ROAD_SPACING;
  const delta = value - nearestRoad;

  if (Math.abs(delta) < clearance) {
    const direction = delta === 0 ? 1 : Math.sign(delta);
    return nearestRoad + direction * clearance;
  }

  return value;
};

const nudgePillarOffRoad = (x: number, z: number, tangent: THREE.Vector2): [number, number] => {
  let nextX = x;
  let nextZ = z;

  const perpendicular = new THREE.Vector2(-tangent.y, tangent.x);
  if (perpendicular.lengthSq() < 0.0001) {
    perpendicular.set(1, 0);
  } else {
    perpendicular.normalize();
  }

  for (let i = 0; i < 4; i++) {
    const adjustedX = pushOffRoadAxis(nextX, ROAD_CLEARANCE + 8);
    const adjustedZ = pushOffRoadAxis(nextZ, ROAD_CLEARANCE + 8);

    if (Math.abs(adjustedX - nextX) < 0.001 && Math.abs(adjustedZ - nextZ) < 0.001) {
      break;
    }

    nextX = adjustedX + perpendicular.x * (4 + i * 2);
    nextZ = adjustedZ + perpendicular.y * (4 + i * 2);
  }

  return [nextX, nextZ];
};

// ─── Railway Track with billboards ───────────────────────────────────────────
const RailwayTrack: React.FC<{ path: THREE.Vector3[]; side: 'inner' | 'outer' }> = React.memo(({ path, side }) => {
  const pillarMeshRef = useRef<THREE.InstancedMesh>(null);
  const pillarCount = Math.floor(path.length / 4);

  React.useEffect(() => {
    if (!pillarMeshRef.current) return;

    const mat = new THREE.Matrix4();
    const scale = new THREE.Vector3(0.8, TRACK_HEIGHT, 0.8);

    for (let i = 0; i < pillarCount; i++) {
      const idx = Math.min(i * 4, path.length - 1);
      const prev = path[Math.max(0, idx - 1)];
      const curr = path[idx];
      const next = path[Math.min(path.length - 1, idx + 1)];
      const tangent = new THREE.Vector2(next.x - prev.x, next.z - prev.z);
      const [safeX, safeZ] = nudgePillarOffRoad(curr.x, curr.z, tangent);

      mat.makeTranslation(safeX, TRACK_HEIGHT / 2, safeZ);
      mat.scale(scale);
      pillarMeshRef.current.setMatrixAt(i, mat);
    }

    pillarMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [path, pillarCount]);

  const railGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-2, -0.18);
    shape.lineTo(2, -0.18);
    shape.lineTo(2, 0.18);
    shape.lineTo(-2, 0.18);
    shape.closePath();
    const curvePath = new THREE.CatmullRomCurve3(path.filter((_, i) => i % 2 === 0), true);
    return new THREE.ExtrudeGeometry(shape, { steps: 340, bevelEnabled: false, extrudePath: curvePath });
  }, [path]);

  const barrierGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.12, 0);
    shape.lineTo(0.12, 0);
    shape.lineTo(0.12, 1.2);
    shape.lineTo(-0.12, 1.2);
    shape.closePath();
    const curvePath = new THREE.CatmullRomCurve3(
      path.filter((_, i) => i % 2 === 0).map(p => {
        const offset = side === 'outer' ? 2.8 : -2.8;
        return new THREE.Vector3(p.x + (Math.abs(p.z) > Math.abs(p.x) ? offset : 0), p.y, p.z + (Math.abs(p.x) >= Math.abs(p.z) ? offset : 0));
      }),
      true
    );
    return new THREE.ExtrudeGeometry(shape, { steps: 200, bevelEnabled: false, extrudePath: curvePath });
  }, [path, side]);

  const billboardPositions = useMemo(() => {
    const positions: Array<{ pos: THREE.Vector3; idx: number }> = [];
    const step = Math.floor(path.length / 24);
    for (let i = 0; i < 24 && i * step < path.length; i++) {
      positions.push({ pos: path[i * step], idx: i });
    }
    return positions;
  }, [path]);

  return (
    <group>
      <instancedMesh ref={pillarMeshRef} args={[undefined, undefined, pillarCount]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#555555" roughness={0.85} metalness={0.15} />
      </instancedMesh>
      <mesh geometry={railGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh geometry={barrierGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#9ca3af" roughness={0.9} metalness={0.05} />
      </mesh>
      {billboardPositions.map(({ pos, idx }) => {
        const ad = BRAND_ADS[idx % BRAND_ADS.length];
        const outOffset = side === 'outer' ? 4.5 : -4.5;
        const bx = pos.x + (Math.abs(pos.z) > Math.abs(pos.x) ? outOffset : 0);
        const bz = pos.z + (Math.abs(pos.x) >= Math.abs(pos.z) ? outOffset : 0);
        const faceAngle = Math.atan2(bz - pos.z, bx - pos.x);
        return (
          <group key={`bb-${side}-${idx}`} position={[bx, pos.y + 2, bz]} rotation={[0, -faceAngle + Math.PI / 2, 0]}>
            <mesh castShadow>
              <boxGeometry args={[6, 2.5, 0.15]} />
              <meshStandardMaterial color={ad.bgColor} roughness={0.3} metalness={0.1} />
            </mesh>
            <mesh position={[0, 0, 0.08]}>
              <planeGeometry args={[5.6, 2.1]} />
              <meshStandardMaterial color={ad.bgColor} emissive={ad.bgColor} emissiveIntensity={0.6} roughness={0.15} metalness={0.3} />
            </mesh>
            <Text position={[0, 0.45, 0.12]} fontSize={0.7} color={ad.color} anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#000000" maxWidth={5}>
              {ad.emoji} {ad.brand}
            </Text>
            <Text position={[0, -0.35, 0.12]} fontSize={0.32} color={ad.color} anchorX="center" anchorY="middle" maxWidth={5}>
              {ad.tagline}
            </Text>
          </group>
        );
      })}
    </group>
  );
});
RailwayTrack.displayName = 'RailwayTrack';

// ─── Station Entrance Infrastructure ─────────────────────────────────────────
// Stairs + Escalator + Elevator from ground (y=0) to platform (y=TRACK_HEIGHT)
const StationEntrance: React.FC<{
  position: [number, number, number];
  stationName: string;
}> = React.memo(({ position, stationName }) => {
  // Push entrance to roadside (not in the middle of roads)
  const rawX = position[0];
  const rawZ = position[2] + 18; // Offset from platform
  const groundX = pushOffRoadAxis(rawX, ROAD_CLEARANCE);
  const groundZ = pushOffRoadAxis(rawZ, ROAD_CLEARANCE);
  const platformY = position[1];

  const stairSteps = 16;
  const stepHeight = platformY / stairSteps;
  const stepDepth = 0.8;

  return (
    <group position={[groundX, 0, groundZ]}>
      {/* ── Entrance canopy at ground level ── */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <boxGeometry args={[12, 0.2, 6]} />
        <meshStandardMaterial color="#1e40af" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Canopy support pillars */}
      {[[-5, 0, -2.5], [-5, 0, 2.5], [5, 0, -2.5], [5, 0, 2.5]].map((p, i) => (
        <mesh key={`canopy-${i}`} position={[p[0], 1.75, p[2]]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 3.5, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.6} />
        </mesh>
      ))}

      {/* ── ENTRANCE SIGN ── */}
      <Text position={[0, 4.2, 0]} fontSize={0.9} color="#ffffff" anchorX="center" outlineWidth={0.06} outlineColor="#1e40af">
        🚇 METRO — {stationName}
      </Text>
      <Text position={[0, 3.1, 3.2]} fontSize={0.45} color="#fbbf24" anchorX="center" outlineWidth={0.03} outlineColor="#000">
        ⬆ STAIRS  |  ⬆ ESCALATOR  |  🔼 ELEVATOR
      </Text>

      {/* ── STAIRCASE (left side) ── */}
      <group position={[-4, 0, -4]}>
        {Array.from({ length: stairSteps }).map((_, i) => (
          <mesh key={`stair-${i}`} position={[0, i * stepHeight + stepHeight / 2, -i * stepDepth]} castShadow receiveShadow>
            <boxGeometry args={[2.5, stepHeight, stepDepth]} />
            <meshStandardMaterial color="#d1d5db" roughness={0.7} metalness={0.1} />
          </mesh>
        ))}
        {/* Stair railings */}
        {[-1.35, 1.35].map((rx, ri) => (
          <group key={`rail-${ri}`}>
            {[0, stairSteps / 2, stairSteps - 1].map((si) => (
              <mesh key={`rpost-${si}`} position={[rx, si * stepHeight + 0.5, -si * stepDepth]}>
                <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
                <meshStandardMaterial color="#64748b" metalness={0.7} />
              </mesh>
            ))}
            {/* Handrail tube */}
            <mesh position={[rx, platformY / 2 + 0.5, -(stairSteps / 2) * stepDepth]} rotation={[Math.atan2(platformY, stairSteps * stepDepth), 0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, Math.sqrt(platformY * platformY + (stairSteps * stepDepth) ** 2), 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.6} />
            </mesh>
          </group>
        ))}
        {/* "STAIRS" label */}
        <Text position={[0, 0.3, 1]} fontSize={0.35} color="#1e40af" anchorX="center">
          STAIRS ⬆
        </Text>
      </group>

      {/* ── ESCALATOR (center) ── */}
      <group position={[0, 0, -4]}>
        {/* Escalator body (inclined slab) */}
        <mesh
          position={[0, platformY / 2, -(stairSteps * stepDepth) / 2]}
          rotation={[Math.atan2(platformY, stairSteps * stepDepth), 0, 0]}
          castShadow
        >
          <boxGeometry args={[2.2, 0.15, Math.sqrt(platformY * platformY + (stairSteps * stepDepth) ** 2)]} />
          <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Escalator step grooves */}
        {Array.from({ length: stairSteps }).map((_, i) => (
          <mesh key={`esc-${i}`} position={[0, i * stepHeight + stepHeight / 2, -i * stepDepth]} receiveShadow>
            <boxGeometry args={[2, stepHeight * 0.8, stepDepth * 0.9]} />
            <meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.25} />
          </mesh>
        ))}
        {/* Escalator side panels */}
        {[-1.2, 1.2].map((sx, si) => (
          <mesh
            key={`esc-side-${si}`}
            position={[sx, platformY / 2, -(stairSteps * stepDepth) / 2]}
            rotation={[Math.atan2(platformY, stairSteps * stepDepth), 0, 0]}
          >
            <boxGeometry args={[0.1, 1.2, Math.sqrt(platformY * platformY + (stairSteps * stepDepth) ** 2)]} />
            <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.4} />
          </mesh>
        ))}
        <Text position={[0, 0.3, 1]} fontSize={0.35} color="#22d3ee" anchorX="center">
          ESCALATOR ⬆
        </Text>
      </group>

      {/* ── ELEVATOR (right side) ── */}
      <group position={[4.5, 0, -2]}>
        {/* Elevator shaft (glass-like) */}
        <mesh position={[0, platformY / 2, 0]} castShadow>
          <boxGeometry args={[3, platformY + 1, 3]} />
          <meshStandardMaterial color="#1e3a5f" transparent opacity={0.3} metalness={0.3} roughness={0.2} />
        </mesh>
        {/* Elevator frame edges */}
        {[[-1.5, -1.5], [-1.5, 1.5], [1.5, -1.5], [1.5, 1.5]].map(([ex, ez], ei) => (
          <mesh key={`elev-frame-${ei}`} position={[ex, platformY / 2, ez]}>
            <boxGeometry args={[0.12, platformY + 1, 0.12]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.2} />
          </mesh>
        ))}
        {/* Elevator car (inside shaft) */}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[2.6, 2.4, 2.6]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.2} roughness={0.5} />
        </mesh>
        {/* Elevator doors */}
        <mesh position={[0, 1.2, 1.55]}>
          <boxGeometry args={[1.4, 2.2, 0.08]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Door gap line */}
        <mesh position={[0, 1.2, 1.6]}>
          <boxGeometry args={[0.03, 2.2, 0.02]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {/* Up/Down buttons */}
        <mesh position={[1.6, 1.3, 1.3]}>
          <boxGeometry args={[0.15, 0.3, 0.08]} />
          <meshStandardMaterial color="#1e40af" emissive="#3b82f6" emissiveIntensity={0.5} />
        </mesh>
        <Text position={[0, 0.3, 2]} fontSize={0.35} color="#3b82f6" anchorX="center">
          ELEVATOR 🔼
        </Text>
        {/* Accessibility sign */}
        <Text position={[1.7, 2.5, 0]} fontSize={0.3} color="#fbbf24" anchorX="center" rotation={[0, -Math.PI / 2, 0]}>
          ♿ ACCESSIBLE
        </Text>
      </group>

      {/* ── Connecting walkway from entrance top to platform ── */}
      <mesh position={[0, platformY - 0.15, -stairSteps * stepDepth - 5]} castShadow receiveShadow>
        <boxGeometry args={[14, 0.3, 8]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </mesh>
      {/* Safety railings on walkway */}
      {[-7, 7].map((wx, wi) => (
        <mesh key={`wrail-${wi}`} position={[wx, platformY + 0.5, -stairSteps * stepDepth - 5]}>
          <boxGeometry args={[0.08, 1, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.5} />
        </mesh>
      ))}

    </group>
  );
});
StationEntrance.displayName = 'StationEntrance';

// ─── Metro Station (with entrance) ──────────────────────────────────────────
const MetroStation: React.FC<{
  name: string;
  position: [number, number, number];
}> = React.memo(({ name, position }) => (
  <group position={position}>
    {/* Platform */}
    <mesh castShadow receiveShadow>
      <boxGeometry args={[14, 0.6, 7]} />
      <meshStandardMaterial color="#d1d5db" roughness={0.65} />
    </mesh>
    {/* Platform edge yellow strip */}
    <mesh position={[0, 0.31, 3.2]}>
      <boxGeometry args={[14, 0.02, 0.4]} />
      <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
    </mesh>
    {/* Roof canopy */}
    <mesh position={[0, 4, 0]} castShadow>
      <boxGeometry args={[16, 0.25, 8]} />
      <meshStandardMaterial color="#1e40af" metalness={0.35} roughness={0.5} />
    </mesh>
    {/* Support columns */}
    {[[-6, 0, -3], [-6, 0, 3], [6, 0, -3], [6, 0, 3]].map((p, i) => (
      <mesh key={i} position={[p[0], 2, p[2]]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 3.4, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.5} />
      </mesh>
    ))}
    {/* Station name sign */}
    <Text position={[0, 5.2, 0]} fontSize={1.8} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.12} outlineColor="#1e40af" maxWidth={15}>
      🚇 METRO {name}
    </Text>
  </group>
));
MetroStation.displayName = 'MetroStation';

// ─── Train Compartment ───────────────────────────────────────────────────────
const TrainCompartment: React.FC<{
  zOffset: number;
  isFront: boolean;
  isRear: boolean;
  isNight: boolean;
  adIndex: number;
  doorOpenAmount: number; // 0 = closed, 1 = fully open
}> = React.memo(({ zOffset, isFront, isRear, isNight, adIndex, doorOpenAmount }) => {
  const ad = BRAND_ADS[adIndex % BRAND_ADS.length];

  // Use simple transparent material instead of MeshPhysicalMaterial with transmission
  // MeshPhysicalMaterial+transmission is extremely GPU-expensive (10 trains × 5 compartments × 5 windows = 250 transmission passes)
  const glassMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#dbeafe',
    transparent: true,
    opacity: 0.45,
    metalness: 0.1,
    roughness: 0.05,
    side: THREE.DoubleSide,
  }), []);

  // Door slide offset (doors slide along Z)
  const doorSlide = doorOpenAmount * 0.7; // 0.7m slide

  return (
    <group position={[0, 0.9, zOffset]}>
      {/* Lower body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[BODY_WIDTH, 1.2, COMPARTMENT_LENGTH]} />
        <meshStandardMaterial color="#e0f2fe" metalness={0.55} roughness={0.25} />
      </mesh>
      {/* Upper body */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[BODY_WIDTH, 0.8, COMPARTMENT_LENGTH]} />
        <meshStandardMaterial color="#bae6fd" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 2.15, 0]} castShadow>
        <boxGeometry args={[BODY_WIDTH - 0.2, 0.3, COMPARTMENT_LENGTH - 0.2]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Undercarriage */}
      <mesh position={[0, -0.75, 0]}>
        <boxGeometry args={[BODY_WIDTH - 0.4, 0.3, COMPARTMENT_LENGTH - 1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Windows & ads on both sides */}
      {[-1, 1].map((sideSign) => (
        <React.Fragment key={`side-${sideSign}`}>
          {/* PROPER WINDOWS - large visible glass panes */}
          {[-4, -2, 0, 2, 4].map((wz, j) => (
            <group key={`win-${sideSign}-${j}`} position={[sideSign * (BODY_WIDTH / 2 + 0.01), 1.15, wz]}>
              {/* Glass pane */}
              <mesh material={glassMaterial} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[1.4, 0.9]} />
              </mesh>
              {/* Night interior glow visible through windows */}
              {isNight && (
                <mesh rotation={[0, Math.PI / 2, 0]} position={[sideSign * -0.05, 0, 0]}>
                  <planeGeometry args={[1.3, 0.8]} />
                  <meshStandardMaterial color="#ffd89b" emissive="#ffd89b" emissiveIntensity={0.7} transparent opacity={0.35} side={THREE.DoubleSide} />
                </mesh>
              )}
              {/* Window frame */}
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[1.5, 1.0]} />
                <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} transparent opacity={0.15} side={THREE.DoubleSide} />
              </mesh>
            </group>
          ))}
          {/* Window frame dividers */}
          {[-4, -2, 0, 2, 4].map((wz, j) => (
            <React.Fragment key={`frame-${sideSign}-${j}`}>
              <mesh position={[sideSign * (BODY_WIDTH / 2 + 0.02), 1.15, wz - 0.72]}>
                <boxGeometry args={[0.04, 1.0, 0.06]} />
                <meshStandardMaterial color="#475569" metalness={0.7} />
              </mesh>
              <mesh position={[sideSign * (BODY_WIDTH / 2 + 0.02), 1.15, wz + 0.72]}>
                <boxGeometry args={[0.04, 1.0, 0.06]} />
                <meshStandardMaterial color="#475569" metalness={0.7} />
              </mesh>
              {/* Top frame */}
              <mesh position={[sideSign * (BODY_WIDTH / 2 + 0.02), 1.65, wz]}>
                <boxGeometry args={[0.04, 0.06, 1.5]} />
                <meshStandardMaterial color="#475569" metalness={0.7} />
              </mesh>
              {/* Bottom frame */}
              <mesh position={[sideSign * (BODY_WIDTH / 2 + 0.02), 0.65, wz]}>
                <boxGeometry args={[0.04, 0.06, 1.5]} />
                <meshStandardMaterial color="#475569" metalness={0.7} />
              </mesh>
            </React.Fragment>
          ))}
          {/* Ad panel */}
          <group position={[sideSign * (BODY_WIDTH / 2 + 0.03), 0, 0]}>
            <mesh>
              <planeGeometry args={[COMPARTMENT_LENGTH - 1, 0.9]} />
              <meshStandardMaterial color={ad.bgColor} emissive={ad.bgColor} emissiveIntensity={isNight ? 0.5 : 0.2} side={sideSign === 1 ? THREE.FrontSide : THREE.BackSide} roughness={0.2} metalness={0.15} />
            </mesh>
            <Text position={[0, 0.12, sideSign * 0.02]} fontSize={0.35} color={ad.color} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000" maxWidth={COMPARTMENT_LENGTH - 2} rotation={[0, sideSign === -1 ? Math.PI : 0, 0]}>
              {ad.emoji} {ad.brand} — {ad.tagline}
            </Text>
          </group>

          {/* ── SLIDING DOORS (animate with doorOpenAmount) ── */}
          {[-3.5, 3.5].map((dz, di) => (
            <React.Fragment key={`door-${sideSign}-${di}`}>
              {/* Left door panel */}
              <mesh position={[sideSign * (BODY_WIDTH / 2 + 0.015), 0.6, dz - 0.35 - doorSlide]}>
                <boxGeometry args={[0.06, 1.8, 0.65]} />
                <meshStandardMaterial color="#bae6fd" metalness={0.5} roughness={0.3} />
              </mesh>
              {/* Right door panel */}
              <mesh position={[sideSign * (BODY_WIDTH / 2 + 0.015), 0.6, dz + 0.35 + doorSlide]}>
                <boxGeometry args={[0.06, 1.8, 0.65]} />
                <meshStandardMaterial color="#bae6fd" metalness={0.5} roughness={0.3} />
              </mesh>
              {/* Door warning strip */}
              <mesh position={[sideSign * (BODY_WIDTH / 2 + 0.04), -0.1, dz]}>
                <boxGeometry args={[0.02, 0.1, 1.4]} />
                <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={doorOpenAmount > 0.1 ? 0.8 : 0.15} side={THREE.DoubleSide} />
              </mesh>
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}

      {/* Metro identity stripe */}
      {[-1, 1].map((sideSign) => (
        <mesh key={`stripe-${sideSign}`} position={[sideSign * (BODY_WIDTH / 2 + 0.02), 0.55, 0]}>
          <planeGeometry args={[0.01, COMPARTMENT_LENGTH]} />
          <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.25} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Interior seats */}
      {[-3.5, -1.5, 0.5, 2.5].map((sz, si) => (
        <React.Fragment key={`seat-${si}`}>
          <mesh position={[1.2, 0.15, sz]}>
            <boxGeometry args={[0.5, 0.6, 0.8]} />
            <meshStandardMaterial color="#1e40af" roughness={0.8} />
          </mesh>
          <mesh position={[-1.2, 0.15, sz]}>
            <boxGeometry args={[0.5, 0.6, 0.8]} />
            <meshStandardMaterial color="#1e40af" roughness={0.8} />
          </mesh>
        </React.Fragment>
      ))}
      {/* Commuter silhouettes */}
      {[-2.5, 0, 2.5].map((cz, ci) => (
        <mesh key={`commuter-${ci}`} position={[0, 0.75, cz]}>
          <capsuleGeometry args={[0.12, 0.7, 4, 8]} />
          <meshStandardMaterial color="#334155" transparent opacity={0.55} />
        </mesh>
      ))}
      {/* Interior/exterior light strips via emissive meshes (GPU-safe) */}
      <mesh position={[0, 1.82, -3]}>
        <boxGeometry args={[2.9, 0.06, 0.35]} />
        <meshStandardMaterial color={isNight ? '#ffd89b' : '#f0f9ff'} emissive={isNight ? '#ffd89b' : '#f0f9ff'} emissiveIntensity={isNight ? 1.4 : 0.45} />
      </mesh>
      <mesh position={[0, 1.82, 3]}>
        <boxGeometry args={[2.9, 0.06, 0.35]} />
        <meshStandardMaterial color={isNight ? '#ffd89b' : '#f0f9ff'} emissive={isNight ? '#ffd89b' : '#f0f9ff'} emissiveIntensity={isNight ? 1.4 : 0.45} />
      </mesh>
      {isNight && [-1, 1].map((sideSign) => (
        <React.Fragment key={`night-strip-${sideSign}`}>
          {[-4, -2, 0, 2, 4].map((lz, li) => (
            <mesh key={`ext-l-${sideSign}-${li}`} position={[sideSign * (BODY_WIDTH / 2 + 0.08), -0.3, lz]}>
              <boxGeometry args={[0.06, 0.06, 0.32]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.9} />
            </mesh>
          ))}
        </React.Fragment>
      ))}

      {/* Bogies */}
      {[-3.5, 3.5].map((bz, bi) => (
        <group key={`bogie-${bi}`} position={[0, -0.95, bz]}>
          <mesh>
            <boxGeometry args={[2.6, 0.2, 1.8]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
          </mesh>
          {[[-0.9, -0.25, 0.6], [0.9, -0.25, 0.6], [-0.9, -0.25, -0.6], [0.9, -0.25, -0.6]].map((wp, k) => (
            <mesh key={k} position={wp as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.38, 0.38, 0.24, 16]} />
              <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.2} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Front headlights */}
      {isFront && (
        <>
          <mesh position={[0, 1.1, COMPARTMENT_LENGTH / 2 + 0.02]} material={glassMaterial}>
            <planeGeometry args={[2.8, 1.2]} />
          </mesh>
          <mesh position={[0, 1.85, COMPARTMENT_LENGTH / 2 + 0.03]}>
            <planeGeometry args={[2, 0.4]} />
            <meshStandardMaterial color="#000000" emissive="#22d3ee" emissiveIntensity={0.8} />
          </mesh>
          <Text position={[0, 1.85, COMPARTMENT_LENGTH / 2 + 0.06]} fontSize={0.2} color="#22d3ee" anchorX="center">
            METRO EXPRESS
          </Text>
          {[0.95, -0.95].map((hx, hi) => (
            <React.Fragment key={`hl-${hi}`}>
              <mesh position={[hx, 0.65, COMPARTMENT_LENGTH / 2 + 0.05]}>
                <sphereGeometry args={[0.2, 12, 12]} />
                <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={2.5} />
              </mesh>
            </React.Fragment>
          ))}
        </>
      )}
      {/* Rear tail lights */}
      {isRear && [0.8, -0.8].map((tx, ti) => (
        <mesh key={`tail-${ti}`} position={[tx, 0.55, -COMPARTMENT_LENGTH / 2 - 0.05]}>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
});
TrainCompartment.displayName = 'TrainCompartment';

// ─── Metro Train with halt, doors, spatial audio ─────────────────────────────
const MetroTrain: React.FC<{
  path: THREE.Vector3[];
  stations: Array<{ name: string; position: [number, number, number]; index: number }>;
  offset?: number;
  direction?: 1 | -1;
  isNight?: boolean;
  trainIndex?: number;
}> = ({ path, stations, offset = 0, direction = 1, isNight = false, trainIndex = 0 }) => {
  const leadCarRef = useRef<THREE.Group | null>(null);
  const compartmentRefs = useRef<Array<THREE.Group | null>>([]);
  const connectorRefs = useRef<Array<THREE.Mesh | null>>([]);
  const progressRef = useRef(offset);
  const { camera } = useThree();

  // Station halt state
  const haltTimerRef = useRef(0); // seconds remaining at station
  const isHaltedRef = useRef(false);
  const doorOpenRef = useRef(0); // 0-1 animated
  const lastHornStationRef = useRef<number | null>(null);
  const lastReleasedStationRef = useRef<number | null>(null);
  const hornPlayedRef = useRef(false);
  const announcedArrivalRef = useRef<number | null>(null);
  const announcedDepartureRef = useRef<number | null>(null);
  const announcedPreArrivalRef = useRef<number | null>(null);

  const pathCurve = useMemo(() => new THREE.CatmullRomCurve3(path.filter((_, i) => i % 2 === 0), true), [path]);
  const totalLength = useMemo(() => pathCurve.getLength(), [pathCurve]);
  const carProgressGap = useMemo(() => (COMPARTMENT_LENGTH + COMPARTMENT_GAP) / totalLength, [totalLength]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || trainIndex !== 0) return;

    const handleForceHorn = () => {
      if (!leadCarRef.current) return;
      const camDist = camera.position.distanceTo(leadCarRef.current.position);
      const audioVolume = camDist < 20 ? 1 : camDist < 220 ? (220 - camDist) / 200 : 0;
      playMetroHorn5s(audioVolume);
    };

    window.addEventListener('vr-force-horn', handleForceHorn as EventListener);
    return () => window.removeEventListener('vr-force-horn', handleForceHorn as EventListener);
  }, [camera, trainIndex]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBoardTrain = (event: Event) => {
      const customEvent = event as CustomEvent<{ trainIndex?: number }>;
      const requestedTrain = customEvent.detail?.trainIndex ?? 0;
      if (requestedTrain !== trainIndex || !leadCarRef.current) return;

      const trainPosition = leadCarRef.current.position.clone();
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(leadCarRef.current.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(leadCarRef.current.quaternion);

      // Place camera INSIDE the train - at passenger seat height, near a window
      // Offset to the right side window so user sees the world through glass
      const insidePos = trainPosition.clone()
        .add(right.clone().multiplyScalar(1.2))   // Near right window
        .add(new THREE.Vector3(0, 1.85, 0));       // Seat eye height inside train

      // Look direction: through the window (perpendicular to train direction)
      const lookTarget = insidePos.clone().add(right.clone().multiplyScalar(10));

      window.dispatchEvent(
        new CustomEvent('vr-teleport', {
          detail: {
            position: [insidePos.x, insidePos.y, insidePos.z],
            lookAt: [lookTarget.x, insidePos.y, lookTarget.z],
            lockGround: false,
          },
        }),
      );
    };

    window.addEventListener('vr-board-train', handleBoardTrain as EventListener);
    return () => window.removeEventListener('vr-board-train', handleBoardTrain as EventListener);
  }, [trainIndex]);

  React.useEffect(() => {
    return () => {
      trainPositions.delete(trainIndex);
      clearTrainRunningLevel(trainIndex);
    };
  }, [trainIndex]);

  useFrame((_, delta) => {
    if (!leadCarRef.current) return;

    const applyTrainPose = (baseProgress: number) => {
      for (let i = 0; i < COMPARTMENT_COUNT; i++) {
        const compartment = compartmentRefs.current[i];
        if (!compartment) continue;

        const compartmentProgress = (baseProgress - direction * i * carProgressGap + 1) % 1;
        const compartmentPos = pathCurve.getPointAt(compartmentProgress);
        const compartmentLookAhead = (compartmentProgress + 0.004 * direction + 1) % 1;
        const compartmentLookAt = pathCurve.getPointAt(compartmentLookAhead);

        compartment.position.copy(compartmentPos);
        compartment.lookAt(compartmentLookAt);
      }

      for (let i = 0; i < COMPARTMENT_COUNT - 1; i++) {
        const connector = connectorRefs.current[i];
        const frontCompartment = compartmentRefs.current[i];
        const rearCompartment = compartmentRefs.current[i + 1];
        if (!connector || !frontCompartment || !rearCompartment) continue;

        connector.position.copy(frontCompartment.position).lerp(rearCompartment.position, 0.5);
        connector.lookAt(rearCompartment.position);
      }

      return leadCarRef.current?.position.clone() ?? pathCurve.getPointAt(baseProgress);
    };

    let pos = applyTrainPose(progressRef.current);

    // ─── Distance from camera (for spatial audio volume) ───
    const camDist = camera.position.distanceTo(pos);
    const audioVolume = Math.max(0, 1 - camDist / RUNNING_AUDIO_MAX_DISTANCE);

    // ─── Check proximity to stations ───
    let nearStation: typeof stations[0] | null = null;
    let nearStationDist = Infinity;
    let preArrivalStation: typeof stations[0] | null = null;

    for (const st of stations) {
      const dx = st.position[0] - pos.x;
      const dz = st.position[2] - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < STATION_PROXIMITY && dist < nearStationDist) {
        nearStationDist = dist;
        nearStation = st;
      }
      // Pre-arrival announcement at ~80m
      if (dist > 60 && dist < 90) {
        preArrivalStation = st;
      }
    }

    if (lastReleasedStationRef.current !== null) {
      const releasedStation = stations.find((station) => station.index === lastReleasedStationRef.current);
      if (!releasedStation) {
        lastReleasedStationRef.current = null;
      } else {
        const dx = releasedStation.position[0] - pos.x;
        const dz = releasedStation.position[2] - pos.z;
        const releasedDistance = Math.sqrt(dx * dx + dz * dz);
        if (releasedDistance > STATION_REARM_DISTANCE) {
          lastReleasedStationRef.current = null;
        }
      }
    }

    // ─── Pre-arrival in-train announcement (only from train 0 to avoid 10x spam) ───
    if (trainIndex === 0 && preArrivalStation && preArrivalStation.index !== announcedPreArrivalRef.current && audioVolume > 0.05) {
      announcedPreArrivalRef.current = preArrivalStation.index;
      window.dispatchEvent(new CustomEvent('vr-voice-narrate', {
        detail: {
          type: 'metro_pre_arrival',
          stationName: preArrivalStation.name,
          message: `The next station is ${preArrivalStation.name}. Please prepare to alight.`,
        }
      }));
    }

    // ─── Station halt logic ───
    if (
      nearStation &&
      !isHaltedRef.current &&
      nearStationDist < 15 &&
      nearStation.index !== lastReleasedStationRef.current
    ) {
      // Arriving at station - start halt
      isHaltedRef.current = true;
      haltTimerRef.current = STATION_HALT_DURATION;
      hornPlayedRef.current = false;

      // Play 5-second horn
      if (nearStation.index !== lastHornStationRef.current) {
        lastHornStationRef.current = nearStation.index;
        playMetroHorn5s(audioVolume);
      }

      // Zoe arrival announcement (only train 0)
      if (trainIndex === 0 && nearStation.index !== announcedArrivalRef.current) {
        announcedArrivalRef.current = nearStation.index;
        announcedDepartureRef.current = null;
        window.dispatchEvent(new CustomEvent('vr-voice-narrate', {
          detail: {
            type: 'metro_announcement',
            stationName: nearStation.name,
            message: `Now arriving at ${nearStation.name} station. Doors will open on the left side. Please mind the gap between the train and the platform.`,
          }
        }));
      }
    }

    if (isHaltedRef.current) {
      updateTrainRunningLevel(trainIndex, audioVolume * 0.14);
      haltTimerRef.current -= delta;

      // Door animation
      if (haltTimerRef.current > STATION_HALT_DURATION - DOOR_OPEN_SPEED) {
        // Opening
        doorOpenRef.current = Math.min(1, doorOpenRef.current + delta / DOOR_OPEN_SPEED);
      } else if (haltTimerRef.current < DOOR_OPEN_SPEED + 3) {
        // Closing (start 3s before departure for announcement)
        if (trainIndex === 0 && haltTimerRef.current < DOOR_OPEN_SPEED + 3 && haltTimerRef.current > DOOR_OPEN_SPEED && nearStation && nearStation.index !== announcedDepartureRef.current) {
          announcedDepartureRef.current = nearStation.index;
          window.dispatchEvent(new CustomEvent('vr-voice-narrate', {
            detail: {
              type: 'metro_departure',
              stationName: nearStation?.name || 'this station',
              message: `Doors closing. Next station: ${stations[(nearStation.index + 1) % stations.length].name}. Please stand clear of the doors.`,
            }
          }));
        }
        doorOpenRef.current = Math.max(0, doorOpenRef.current - delta / DOOR_OPEN_SPEED);
      }

      if (haltTimerRef.current <= 0) {
        isHaltedRef.current = false;
        doorOpenRef.current = 0;
        announcedPreArrivalRef.current = null; // Reset for next station
        if (nearStation) {
          lastReleasedStationRef.current = nearStation.index;
        }
      }
      return; // Don't move while halted
    }

    // ─── Movement ───
    const step = ((TRAIN_SPEED * delta) / totalLength) * direction;
    progressRef.current = (progressRef.current + step + 1) % 1;

    const newPos = applyTrainPose(progressRef.current);

    // ─── Register position for crossing detection ───
    trainPositions.set(trainIndex, newPos.clone());

    // ─── Check for train crossings ───
    trainPositions.forEach((otherPos, otherIdx) => {
      if (otherIdx === trainIndex) return;
      const crossDist = newPos.distanceTo(otherPos);
      if (crossDist < CROSSING_DISTANCE) {
        const pairKey = `${Math.min(trainIndex, otherIdx)}-${Math.max(trainIndex, otherIdx)}`;
        if (!trainCrossedPairs.has(pairKey)) {
          trainCrossedPairs.add(pairKey);
          const crossVolume = camDist < 80 ? Math.max(0.2, (80 - camDist) / 80) : 0;
          if (crossVolume > 0.02) {
              playTrainHornBurst(crossVolume * 0.6, 2.5);
          }
          // Clear crossing flag after 30s (trains circle ~every 60s)
          setTimeout(() => trainCrossedPairs.delete(pairKey), 30000);
        }
      }
    });

    const isApproaching = nearStation != null && nearStationDist < 60;
    const cruisingLevel = Math.max(0.08, audioVolume * 0.72);
    const runningLevel = isApproaching ? audioVolume * 0.94 : cruisingLevel;
    updateTrainRunningLevel(trainIndex, Math.max(0, Math.min(1, runningLevel)));
  });

  return (
    <group>
      {Array.from({ length: COMPARTMENT_COUNT }).map((_, i) => {
        return (
          <group
            key={i}
            ref={(node) => {
              compartmentRefs.current[i] = node;
              if (i === 0) {
                leadCarRef.current = node;
              }
            }}
          >
            <group scale={[TRAIN_GROUP_SCALE, TRAIN_GROUP_SCALE, TRAIN_GROUP_SCALE]}>
              <TrainCompartment
                zOffset={0}
                isFront={i === 0}
                isRear={i === COMPARTMENT_COUNT - 1}
                isNight={isNight}
                adIndex={(trainIndex * COMPARTMENT_COUNT + i) % BRAND_ADS.length}
                doorOpenAmount={doorOpenRef.current}
              />
              {i === 0 && (
                <Text position={[0, 3.6, -20]} fontSize={0.8} color="white" anchorX="center" outlineWidth={0.05} outlineColor="#0ea5e9">
                  🚇 METRO LINE {trainIndex + 1}
                </Text>
              )}
            </group>
          </group>
        );
      })}
      {/* Inter-car connectors */}
      {Array.from({ length: COMPARTMENT_COUNT - 1 }).map((_, i) => {
        return (
          <mesh
            key={`conn-${i}`}
            ref={(node) => {
              connectorRefs.current[i] = node;
            }}
          >
            <boxGeometry args={[2.8 * TRAIN_GROUP_SCALE, 2.2 * TRAIN_GROUP_SCALE, (COMPARTMENT_GAP + 0.2) * TRAIN_GROUP_SCALE]} />
            <meshStandardMaterial color="#374151" roughness={0.9} metalness={0.2} transparent opacity={0.7} />
          </mesh>
        );
      })}
    </group>
  );
};

// ─── Main System ─────────────────────────────────────────────────────────────
export const MetroTrainSystem: React.FC<{ isNight?: boolean }> = ({ isNight = false }) => {
  const { camera } = useThree();
  const stations = useMemo(() => generateStations(), []);
  const outerStations = useMemo(
    () => stations.map((station) => {
      const t = station.index / STATION_COUNT;
      const [x, z] = generateEllipsePoint(t, OUTER_RX, OUTER_RZ);
      return {
        ...station,
        position: [x, TRACK_HEIGHT, z] as [number, number, number],
      };
    }),
    [stations],
  );
  const innerTrackPath = useMemo(() => generateTrackPath(INNER_RX, INNER_RZ), []);
  const outerTrackPath = useMemo(() => generateTrackPath(OUTER_RX, OUTER_RZ), []);
  const [detailMode, setDetailMode] = React.useState(false);
  const detailModeRef = useRef(detailMode);
  const detailSampleAtRef = useRef(0);

  const CITY_OFFSET_X = 60;
  const CITY_OFFSET_Z = 45;

  React.useEffect(() => {
    detailModeRef.current = detailMode;
  }, [detailMode]);

  React.useEffect(() => {
    ensureTrainAudioVolumeEvents();

    // Keep train running-loop audio available in VR worlds that do not pass through ZoeOmegaPage stasis gates.
    markVRAudioUnlocked();

    const unlockOnGesture = () => {
      markVRAudioUnlocked();
    };

    window.addEventListener('pointerdown', unlockOnGesture, { passive: true });
    window.addEventListener('keydown', unlockOnGesture);

    return () => {
      window.removeEventListener('pointerdown', unlockOnGesture);
      window.removeEventListener('keydown', unlockOnGesture);
    };
  }, []);

  useFrame((state) => {
    const nowMs = state.clock.elapsedTime * 1000;
    if (nowMs - detailSampleAtRef.current < 320) return;
    detailSampleAtRef.current = nowMs;

    // Metro system is mounted inside a city-offset group in parent.
    const localX = camera.position.x - CITY_OFFSET_X;
    const localZ = camera.position.z - CITY_OFFSET_Z;

    let nearestStationDistSq = Number.POSITIVE_INFINITY;
    for (const station of stations) {
      const dx = station.position[0] - localX;
      const dz = station.position[2] - localZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < nearestStationDistSq) nearestStationDistSq = distSq;
    }

    const radialDistance = Math.hypot(localX, localZ);
    const nearTrackRing = detailModeRef.current
      ? Math.abs(radialDistance - INNER_RX) <= 280 || Math.abs(radialDistance - OUTER_RX) <= 280
      : Math.abs(radialDistance - INNER_RX) <= 220 || Math.abs(radialDistance - OUTER_RX) <= 220;

    const stationThreshold = detailModeRef.current ? 360 : 280;
    const nextDetailMode = nearTrackRing || nearestStationDistSq <= stationThreshold * stationThreshold;

    if (nextDetailMode !== detailModeRef.current) {
      detailModeRef.current = nextDetailMode;
      setDetailMode(nextDetailMode);
    }
  });

  const trainConfigs = useMemo(
    () => [
      { path: innerTrackPath, stations, offset: 0.02, direction: 1 as const, isNight, trainIndex: 0 },
      { path: innerTrackPath, stations, offset: 0.22, direction: 1 as const, isNight, trainIndex: 1 },
      { path: innerTrackPath, stations, offset: 0.42, direction: 1 as const, isNight, trainIndex: 2 },
      { path: innerTrackPath, stations, offset: 0.62, direction: 1 as const, isNight, trainIndex: 3 },
      { path: innerTrackPath, stations, offset: 0.82, direction: 1 as const, isNight, trainIndex: 4 },

      { path: outerTrackPath, stations: outerStations, offset: 0.12, direction: -1 as const, isNight, trainIndex: 5 },
      { path: outerTrackPath, stations: outerStations, offset: 0.32, direction: -1 as const, isNight, trainIndex: 6 },
      { path: outerTrackPath, stations: outerStations, offset: 0.52, direction: -1 as const, isNight, trainIndex: 7 },
      { path: outerTrackPath, stations: outerStations, offset: 0.72, direction: -1 as const, isNight, trainIndex: 8 },
      { path: outerTrackPath, stations: outerStations, offset: 0.92, direction: -1 as const, isNight, trainIndex: 9 },
    ],
    [innerTrackPath, outerTrackPath, stations, outerStations, isNight],
  );

  const visibleStations = stations.slice(0, detailMode ? stations.length : 4); // Show at least 4 major stations
  const visibleTrains = trainConfigs; // ALL 10 trains always visible

  return (
    <group>
      {detailMode ? (
        <>
          <RailwayTrack path={innerTrackPath} side="inner" />
          <RailwayTrack path={outerTrackPath} side="outer" />
        </>
      ) : (
        <mesh position={[0, TRACK_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[INNER_RX - 10, OUTER_RX + 10, 64]} />
          <meshBasicMaterial color="#64748b" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {visibleStations.map((station) => (
        <React.Fragment key={station.name}>
          <MetroStation name={station.name} position={station.position} />
          <StationEntrance position={station.position} stationName={station.name} />
        </React.Fragment>
      ))}

      {visibleTrains.map((config) => (
        <MetroTrain
          key={`train-${config.trainIndex}`}
          path={config.path}
          stations={config.stations}
          offset={config.offset}
          direction={config.direction}
          isNight={config.isNight}
          trainIndex={config.trainIndex}
        />
      ))}

      {isNight && detailMode && visibleStations.map((station) => (
        <mesh key={`night-${station.name}`} position={[station.position[0], station.position[1] + 2, station.position[2]]}>
          <sphereGeometry args={[0.45, 8, 8]} />
          <meshStandardMaterial color="#ffd89b" emissive="#ffd89b" emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  );
};

export default MetroTrainSystem;
