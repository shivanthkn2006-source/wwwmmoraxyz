// ═══════════════════════════════════════════════════════════════════════════════
// SCENIC HERITAGE TRAIN SYSTEM
// Ground-level realistic wooden-sleeper tracks with gravel bed
// 3 trains × 5 compartments, continuous running sound + horn at crossings
// Level crossings with red/yellow/green traffic signals
// Independent hooks/wiring
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import {
  updateTrainRunningLevel,
  clearTrainRunningLevel,
  playTrainHornBurst,
  ensureTrainAudioVolumeEvents,
} from './audio/trainAudioSystem';

const TRAIN_COUNT = 3;
const COMPARTMENTS = 5;
const COMP_LENGTH = 3.2;
const COMP_GAP = 0.3;
const COMP_TOTAL = COMP_LENGTH + COMP_GAP;
const TRAIN_SPEED = 0.0025;
const TRACK_Y = 0.05;
const TRACK_GAUGE = 1.0;
const SLEEPER_WIDTH = 1.6;
const SLEEPER_SPACING = 0.8;

const AUDIO_INDEX_OFFSET = 100;
const HORN_POINTS = [0.0, 0.25, 0.5, 0.75];
const HORN_COOLDOWN_MS = 12000;

// Level crossing positions (where track crosses roads)
const LEVEL_CROSSINGS = [
  { progress: 0.12 },
  { progress: 0.38 },
  { progress: 0.62 },
  { progress: 0.87 },
];

const buildScenicPath = (): THREE.CatmullRomCurve3 => {
  const pts = [
    new THREE.Vector3(25, TRACK_Y, 85),
    new THREE.Vector3(65, TRACK_Y, 130),
    new THREE.Vector3(140, TRACK_Y, 155),
    new THREE.Vector3(220, TRACK_Y, 140),
    new THREE.Vector3(300, TRACK_Y + 2, 100),
    new THREE.Vector3(340, TRACK_Y + 4, 50),
    new THREE.Vector3(320, TRACK_Y + 3, -10),
    new THREE.Vector3(250, TRACK_Y + 1, -50),
    new THREE.Vector3(180, TRACK_Y, -30),
    new THREE.Vector3(100, TRACK_Y, -20),
    new THREE.Vector3(40, TRACK_Y, 10),
    new THREE.Vector3(-10, TRACK_Y, 50),
    new THREE.Vector3(5, TRACK_Y, 75),
  ];
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.4);
};

// ── Locomotive ───────────────────────────────────────────────────────────────
const Locomotive: React.FC<{ color: string }> = ({ color }) => (
  <group>
    <mesh position={[0, 0.7, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.5, 0.5, 2.8, 12]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
    </mesh>
    <mesh position={[0, 1.25, -1.0]}>
      <cylinderGeometry args={[0.15, 0.22, 0.6, 8]} />
      <meshStandardMaterial color="#333" metalness={0.6} roughness={0.3} />
    </mesh>
    <mesh position={[0, 0.85, 0.85]}>
      <boxGeometry args={[1.1, 1.1, 1.0]} />
      <meshStandardMaterial color="#8b1a1a" metalness={0.3} roughness={0.6} />
    </mesh>
    <mesh position={[0, 1.5, 0.85]}>
      <boxGeometry args={[1.25, 0.1, 1.15]} />
      <meshStandardMaterial color="#2d5a1e" metalness={0.3} roughness={0.5} />
    </mesh>
    {[-0.56, 0.56].map((x, i) => (
      <mesh key={i} position={[x, 0.95, 0.85]}>
        <boxGeometry args={[0.03, 0.4, 0.5]} />
        <meshStandardMaterial color="#87ceeb" emissive="#87ceeb" emissiveIntensity={0.3} transparent opacity={0.7} />
      </mesh>
    ))}
    {[-0.85, -0.3, 0.25, 0.9].map((z, i) => (
      <React.Fragment key={i}>
        <mesh position={[-0.52, 0.22, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.08, 12]} />
          <meshStandardMaterial color="#c9a84c" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.52, 0.22, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.08, 12]} />
          <meshStandardMaterial color="#c9a84c" metalness={0.7} roughness={0.3} />
        </mesh>
      </React.Fragment>
    ))}
    <mesh position={[0, 0.25, -1.5]} rotation={[0.3, 0, 0]}>
      <boxGeometry args={[0.95, 0.3, 0.18]} />
      <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
    </mesh>
    <mesh position={[0, 1.15, -1.2]}>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshStandardMaterial color="#ffee88" emissive="#ffee44" emissiveIntensity={0.8} />
    </mesh>
  </group>
);

// ── Passenger Compartment ────────────────────────────────────────────────────
const PassengerCompartment: React.FC<{ color: string; compIndex: number }> = ({ color, compIndex }) => {
  const avatarColors = useMemo(() => {
    const p = ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c'];
    return Array.from({ length: 4 }, (_, i) => p[(compIndex * 4 + i) % p.length]);
  }, [compIndex]);
  const hatColors = useMemo(() => {
    const h = ['#c0392b', '#2980b9', '#f1c40f', '#27ae60', '#8e44ad', '#d35400'];
    return Array.from({ length: 4 }, (_, i) => h[(compIndex * 4 + i + 2) % h.length]);
  }, [compIndex]);

  return (
    <group>
      <mesh position={[0, 0.18, 0]}><boxGeometry args={[1.1, 0.07, COMP_LENGTH]} /><meshStandardMaterial color="#5a3825" roughness={0.8} /></mesh>
      {[-0.52, 0.52].map((x, i) => (
        <mesh key={i} position={[x, 0.45, 0]}><boxGeometry args={[0.05, 0.48, COMP_LENGTH]} /><meshStandardMaterial color={color} metalness={0.3} roughness={0.6} /></mesh>
      ))}
      {[-COMP_LENGTH / 2, COMP_LENGTH / 2].map((z, i) => (
        <mesh key={`e${i}`} position={[0, 0.45, z]}><boxGeometry args={[1.1, 0.48, 0.05]} /><meshStandardMaterial color={color} metalness={0.3} roughness={0.6} /></mesh>
      ))}
      {[-0.7, 0.0, 0.7].map((z, i) => (
        <mesh key={`b${i}`} position={[0, 0.28, z]}><boxGeometry args={[0.7, 0.06, 0.35]} /><meshStandardMaterial color="#8b6914" roughness={0.9} /></mesh>
      ))}
      {avatarColors.map((ac, i) => {
        const sz = [-0.7, -0.7, 0.7, 0.7][i];
        const sx = [-0.2, 0.2, -0.2, 0.2][i];
        return (
          <group key={i} position={[sx, 0.32, sz]}>
            <mesh position={[0, 0.16, 0]}><capsuleGeometry args={[0.07, 0.2, 4, 8]} /><meshStandardMaterial color={ac} /></mesh>
            <mesh position={[0, 0.4, 0]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#f5cba7" /></mesh>
            <mesh position={[0, 0.49, 0]}><cylinderGeometry args={[0.08, 0.05, 0.06, 8]} /><meshStandardMaterial color={hatColors[i]} /></mesh>
          </group>
        );
      })}
      {[-0.95, 0.95].map((z, i) => (
        <React.Fragment key={`w${i}`}>
          <mesh position={[-0.5, 0.1, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.15, 0.15, 0.06, 10]} /><meshStandardMaterial color="#c9a84c" metalness={0.7} roughness={0.3} /></mesh>
          <mesh position={[0.5, 0.1, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.15, 0.15, 0.06, 10]} /><meshStandardMaterial color="#c9a84c" metalness={0.7} roughness={0.3} /></mesh>
        </React.Fragment>
      ))}
    </group>
  );
};

// ── Single Train ─────────────────────────────────────────────────────────────
const ScenicTrain: React.FC<{
  path: THREE.CatmullRomCurve3;
  trainIndex: number;
  startProgress: number;
  color: string;
}> = ({ path, trainIndex, startProgress, color }) => {
  const locoRef = useRef<THREE.Group>(null);
  const compRefs = useRef<(THREE.Group | null)[]>(Array(COMPARTMENTS).fill(null));
  const progressRef = useRef(startProgress);
  const lastHornTimeRef = useRef(0);
  const { camera } = useThree();

  const pathLength = useMemo(() => path.getLength(), [path]);
  const locoGap = (COMP_LENGTH + 1.0) / pathLength;
  const compGap = COMP_TOTAL / pathLength;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    progressRef.current = (progressRef.current + TRAIN_SPEED * dt) % 1;
    const p = progressRef.current;

    if (locoRef.current) {
      const pos = path.getPointAt(p);
      const lookAt = path.getPointAt((p + 0.004) % 1);
      locoRef.current.position.copy(pos);
      locoRef.current.lookAt(lookAt);
    }

    for (let i = 0; i < COMPARTMENTS; i++) {
      const ref = compRefs.current[i];
      if (!ref) continue;
      const cp = ((p - locoGap - i * compGap) % 1 + 1) % 1;
      const cPos = path.getPointAt(cp);
      const cLook = path.getPointAt((cp + 0.004) % 1);
      ref.position.copy(cPos);
      ref.lookAt(cLook);
    }

    // Audio - continuous running sound
    const locoPos = path.getPointAt(p);
    const dist = camera.position.distanceTo(locoPos);
    const maxHear = 300;
    const vol = dist < maxHear ? Math.max(0.12, 1 - dist / maxHear) : 0;
    updateTrainRunningLevel(AUDIO_INDEX_OFFSET + trainIndex, vol);

    // Horn at level crossings
    const now = Date.now();
    for (const hp of HORN_POINTS) {
      if (Math.abs(p - hp) < 0.004 && now - lastHornTimeRef.current > HORN_COOLDOWN_MS) {
        lastHornTimeRef.current = now;
        const hornVol = dist < maxHear ? Math.max(0.3, 1 - dist / maxHear) : 0;
        if (hornVol > 0.05) playTrainHornBurst(hornVol, 5);
        break;
      }
    }
  });

  return (
    <group>
      <group ref={locoRef}><Locomotive color={color} /></group>
      {Array.from({ length: COMPARTMENTS }, (_, i) => (
        <group key={i} ref={(el) => { compRefs.current[i] = el; }}>
          <PassengerCompartment color={color} compIndex={i} />
        </group>
      ))}
    </group>
  );
};

// ── Realistic Wooden Track Renderer ─────────────────────────────────────────
const TrackRenderer: React.FC<{ path: THREE.CatmullRomCurve3 }> = ({ path }) => {
  const { sleepers, railLeftPts, railRightPts, gravelPts } = useMemo(() => {
    const length = path.getLength();
    const sleeperCount = Math.floor(length / SLEEPER_SPACING);
    const sleeperData: { pos: THREE.Vector3; angle: number }[] = [];
    const gravelData: { pos: THREE.Vector3; angle: number }[] = [];

    for (let i = 0; i < sleeperCount; i++) {
      const t = i / sleeperCount;
      const pt = path.getPointAt(t);
      const tangent = path.getTangentAt(t).normalize();
      const angle = Math.atan2(tangent.x, tangent.z);
      sleeperData.push({ pos: pt, angle });
      if (i % 3 === 0) gravelData.push({ pos: pt, angle });
    }

    const railPts = 400;
    const leftPts: [number, number, number][] = [];
    const rightPts: [number, number, number][] = [];
    for (let i = 0; i <= railPts; i++) {
      const t = i / railPts;
      const pt = path.getPointAt(t);
      const tangent = path.getTangentAt(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const lp = pt.clone().add(normal.clone().multiplyScalar(TRACK_GAUGE / 2));
      const rp = pt.clone().add(normal.clone().multiplyScalar(-TRACK_GAUGE / 2));
      leftPts.push([lp.x, lp.y + 0.08, lp.z]);
      rightPts.push([rp.x, rp.y + 0.08, rp.z]);
    }

    return { sleepers: sleeperData, railLeftPts: leftPts, railRightPts: rightPts, gravelPts: gravelData };
  }, [path]);

  return (
    <group>
      {/* Gravel bed - dark grey stones */}
      {gravelPts.map((g, i) => (
        <mesh key={`g${i}`} position={[g.pos.x, g.pos.y - 0.02, g.pos.z]} rotation={[0, g.angle, 0]}>
          <boxGeometry args={[SLEEPER_WIDTH + 0.6, 0.05, SLEEPER_SPACING * 3.2]} />
          <meshStandardMaterial color="#5a5045" roughness={1} />
        </mesh>
      ))}
      {/* Wooden sleepers - brown timber with realistic weathered look */}
      {sleepers.map((s, i) => (
        <mesh key={`s${i}`} position={[s.pos.x, s.pos.y + 0.02, s.pos.z]} rotation={[0, s.angle, 0]}>
          <boxGeometry args={[SLEEPER_WIDTH, 0.06, 0.14]} />
          <meshStandardMaterial color={i % 3 === 0 ? '#6b4226' : '#7a5433'} roughness={0.95} metalness={0.05} />
        </mesh>
      ))}
      {/* Steel rails */}
      {railLeftPts.map((p, i) => {
        if (i >= railLeftPts.length - 1) return null;
        const n = railLeftPts[i + 1];
        const mx = (p[0] + n[0]) / 2, my = (p[1] + n[1]) / 2, mz = (p[2] + n[2]) / 2;
        const dx = n[0] - p[0], dz = n[2] - p[2];
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);
        return (
          <mesh key={`rl${i}`} position={[mx, my, mz]} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.05, 0.04, len + 0.01]} />
            <meshStandardMaterial color="#777" metalness={0.7} roughness={0.3} />
          </mesh>
        );
      })}
      {railRightPts.map((p, i) => {
        if (i >= railRightPts.length - 1) return null;
        const n = railRightPts[i + 1];
        const mx = (p[0] + n[0]) / 2, my = (p[1] + n[1]) / 2, mz = (p[2] + n[2]) / 2;
        const dx = n[0] - p[0], dz = n[2] - p[2];
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);
        return (
          <mesh key={`rr${i}`} position={[mx, my, mz]} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.05, 0.04, len + 0.01]} />
            <meshStandardMaterial color="#777" metalness={0.7} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
};

// ── Level Crossing Signal (Red/Yellow/Green) ────────────────────────────────
const LevelCrossingSignal: React.FC<{ position: THREE.Vector3; rotation: number }> = ({ position, rotation: rot }) => (
  <group position={[position.x, position.y, position.z]} rotation={[0, rot, 0]}>
    {/* Pole */}
    <mesh position={[0, 2, 0]}>
      <cylinderGeometry args={[0.08, 0.08, 4, 8]} />
      <meshStandardMaterial color="#444" metalness={0.5} roughness={0.4} />
    </mesh>
    {/* Signal housing */}
    <mesh position={[0, 3.8, 0]}>
      <boxGeometry args={[0.5, 1.4, 0.3]} />
      <meshStandardMaterial color="#222" metalness={0.4} roughness={0.5} />
    </mesh>
    {/* Red light */}
    <mesh position={[0, 4.2, 0.16]}>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.8} />
    </mesh>
    {/* Yellow light */}
    <mesh position={[0, 3.8, 0.16]}>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={0.5} />
    </mesh>
    {/* Green light */}
    <mesh position={[0, 3.4, 0.16]}>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshStandardMaterial color="#00cc00" emissive="#00cc00" emissiveIntensity={0.3} />
    </mesh>
    {/* Crossing gate arm */}
    <mesh position={[1.5, 3.0, 0]} rotation={[0, 0, 0.1]}>
      <boxGeometry args={[3.0, 0.12, 0.06]} />
      <meshStandardMaterial color="#ff0000" />
    </mesh>
    {/* Diagonal warning stripes on gate */}
    {[0, 0.6, 1.2, 1.8].map((off, i) => (
      <mesh key={i} position={[0.3 + off, 3.0, 0.04]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[0.15, 0.12, 0.02]} />
        <meshStandardMaterial color={i % 2 === 0 ? '#fff' : '#ff0000'} />
      </mesh>
    ))}
    {/* "RAILWAY CROSSING" sign */}
    <mesh position={[0, 4.8, 0]}>
      <boxGeometry args={[1.2, 0.3, 0.05]} />
      <meshStandardMaterial color="#fff" />
    </mesh>
    <Text position={[0, 4.8, 0.03]} fontSize={0.12} color="#000" anchorX="center" anchorY="middle">
      RAILWAY CROSSING
    </Text>
  </group>
);

// ── Main Export ──────────────────────────────────────────────────────────────
const ScenicHeritageTrain: React.FC = () => {
  const scenicPath = useMemo(() => buildScenicPath(), []);

  const trainConfigs = useMemo(() => [
    { startProgress: 0.0, color: '#2d5a1e' },
    { startProgress: 0.33, color: '#8b1a1a' },
    { startProgress: 0.66, color: '#1a3c8b' },
  ], []);

  // Level crossing positions
  const crossingPositions = useMemo(() => {
    return LEVEL_CROSSINGS.map(lc => {
      const pt = scenicPath.getPointAt(lc.progress);
      const tangent = scenicPath.getTangentAt(lc.progress).normalize();
      const angle = Math.atan2(tangent.x, tangent.z);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
      return {
        left: pt.clone().add(normal.clone().multiplyScalar(2.5)),
        right: pt.clone().add(normal.clone().multiplyScalar(-2.5)),
        angle,
      };
    });
  }, [scenicPath]);

  React.useEffect(() => {
    ensureTrainAudioVolumeEvents();
    return () => {
      for (let i = 0; i < TRAIN_COUNT; i++) clearTrainRunningLevel(AUDIO_INDEX_OFFSET + i);
    };
  }, []);

  return (
    <group>
      <TrackRenderer path={scenicPath} />
      {trainConfigs.map((cfg, i) => (
        <ScenicTrain key={i} path={scenicPath} trainIndex={i} startProgress={cfg.startProgress} color={cfg.color} />
      ))}
      {/* Level crossing signals on both sides of track */}
      {crossingPositions.map((cp, i) => (
        <React.Fragment key={`lc${i}`}>
          <LevelCrossingSignal position={cp.left} rotation={cp.angle} />
          <LevelCrossingSignal position={cp.right} rotation={cp.angle + Math.PI} />
        </React.Fragment>
      ))}
    </group>
  );
};

export default ScenicHeritageTrain;
