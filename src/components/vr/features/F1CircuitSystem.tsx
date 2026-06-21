/**
 * F1 CIRCUIT SYSTEM - Full racing circuit near train tracks
 * Position: [1100, 0, -500] — visible from metro trains & KFC station area
 * Features: 5 F1 cars, pit lane, grandstands, 50 crowd avatars, entrance portal
 * Voice-integrated with Zoe for telemetry & announcements
 */

import React, { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

// ── CONSTANTS ──
const CIRCUIT_CENTER: [number, number, number] = [1100, 0, -500];
const TRACK_WIDTH = 12;
const GRANDSTAND_HEIGHT = 8;
const CAR_COUNT = 5;
const CROWD_COUNT = 50;

// Car team colors & names
const TEAMS = [
  { name: 'Team Alpha', color: '#dc2626', flag: '🇮🇹' },
  { name: 'Team Zenith', color: '#2563eb', flag: '🇬🇧' },
  { name: 'Team Aurora', color: '#f59e0b', flag: '🇩🇪' },
  { name: 'Team Vortex', color: '#10b981', flag: '🇧🇷' },
  { name: 'Team Nova', color: '#8b5cf6', flag: '🇯🇵' },
];

// ── TRACK GEOMETRY ──
// Open-type circuit with sweeping curves and main straight
const generateTrackPath = (): THREE.Vector3[] => {
  const pts: THREE.Vector3[] = [];
  const segments = 300;

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    // Asymmetric oval with a chicane
    const rx = 180; // long axis
    const rz = 100; // short axis
    let x = Math.cos(t) * rx;
    let z = Math.sin(t) * rz;

    // Add chicane on the back straight
    if (t > Math.PI * 0.8 && t < Math.PI * 1.2) {
      x += Math.sin((t - Math.PI * 0.8) * (Math.PI / 0.4)) * 25;
    }

    // Hairpin tightening
    if (t > Math.PI * 1.4 && t < Math.PI * 1.7) {
      z -= Math.sin((t - Math.PI * 1.4) * (Math.PI / 0.3)) * 15;
    }

    pts.push(new THREE.Vector3(
      CIRCUIT_CENTER[0] + x,
      0.2,
      CIRCUIT_CENTER[2] + z
    ));
  }

  return pts;
};

// ── F1 CAR COMPONENT ──
const F1Car: React.FC<{
  path: THREE.CatmullRomCurve3;
  offset: number;
  team: typeof TEAMS[0];
  carNumber: number;
  totalLength: number;
}> = React.memo(({ path, offset, team, carNumber, totalLength }) => {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(offset);
  // Slight speed variation per car for natural racing
  const speedFactor = useRef(55 + (carNumber * 3) + Math.random() * 8);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const step = (speedFactor.current * delta) / totalLength;
    progressRef.current = (progressRef.current + step) % 1;

    const pos = path.getPointAt(progressRef.current);
    const lookAhead = (progressRef.current + 0.003) % 1;
    const lookAt = path.getPointAt(lookAhead);

    groupRef.current.position.copy(pos);
    groupRef.current.position.y = 0.3;
    groupRef.current.lookAt(lookAt.x, 0.3, lookAt.z);
  });

  return (
    <group ref={groupRef}>
      {/* Main body */}
      <mesh castShadow>
        <boxGeometry args={[1.2, 0.4, 4.2]} />
        <meshStandardMaterial color={team.color} metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Nose cone */}
      <mesh position={[0, 0, 2.4]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.5, 1.5, 6]} />
        <meshStandardMaterial color={team.color} metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Cockpit */}
      <mesh position={[0, 0.35, 0.3]}>
        <boxGeometry args={[0.6, 0.3, 1.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Front wing */}
      <mesh position={[0, 0, 2.8]}>
        <boxGeometry args={[1.8, 0.08, 0.6]} />
        <meshStandardMaterial color={team.color} metalness={0.5} />
      </mesh>
      {/* Rear wing */}
      <mesh position={[0, 0.6, -2]}>
        <boxGeometry args={[1.6, 0.5, 0.08]} />
        <meshStandardMaterial color={team.color} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.8, -2]}>
        <boxGeometry args={[1.6, 0.08, 0.4]} />
        <meshStandardMaterial color={team.color} metalness={0.5} />
      </mesh>
      {/* Wheels (4) */}
      {[
        [0.7, -0.1, 1.5], [-0.7, -0.1, 1.5],
        [0.7, -0.1, -1.3], [-0.7, -0.1, -1.3],
      ].map((wp, i) => (
        <mesh key={i} position={wp as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.28, 0.28, 0.2, 12]} />
          <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      {/* Car number */}
      <Text position={[0, 0.45, 0]} fontSize={0.4} color="white" anchorX="center" rotation={[-Math.PI / 2, 0, 0]}>
        {carNumber}
      </Text>
    </group>
  );
});
F1Car.displayName = 'F1Car';

// ── GRANDSTAND ──
const Grandstand: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  length?: number;
  label: string;
}> = React.memo(({ position, rotation: rot, length = 60, label }) => {
  const rotation: [number, number, number] = rot ?? [0, 0, 0];
  const rows = 5;
  return (
    <group position={position} rotation={rotation}>
      {/* Tiered seating */}
      {Array.from({ length: rows }).map((_, i) => (
        <mesh key={i} position={[0, i * 1.5 + 0.75, -i * 1.2]} castShadow>
          <boxGeometry args={[length, 0.3, 3]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#374151' : '#4b5563'} />
        </mesh>
      ))}
      {/* Back wall */}
      <mesh position={[0, GRANDSTAND_HEIGHT / 2, -rows * 1.2 - 1]}>
        <boxGeometry args={[length, GRANDSTAND_HEIGHT, 0.5]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {/* Roof */}
      <mesh position={[0, GRANDSTAND_HEIGHT + 0.5, -rows * 0.6]}>
        <boxGeometry args={[length + 2, 0.3, rows * 1.2 + 4]} />
        <meshStandardMaterial color="#111827" metalness={0.3} />
      </mesh>
      {/* Label */}
      <Text position={[0, GRANDSTAND_HEIGHT + 2, 0]} fontSize={2} color="#ffffff"
        anchorX="center" outlineWidth={0.1} outlineColor="#000">
        {label}
      </Text>
    </group>
  );
});
Grandstand.displayName = 'Grandstand';

// ── PIT LANE ──
const PitLane: React.FC = React.memo(() => {
  const garageWidth = 12;
  return (
    <group position={[CIRCUIT_CENTER[0], 0, CIRCUIT_CENTER[2] - 115]}>
      {/* Pit road surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
        <planeGeometry args={[garageWidth * 5 + 10, 8]} />
        <meshStandardMaterial color="#333333" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* 5 Garages */}
      {TEAMS.map((team, i) => {
        const xOff = (i - 2) * garageWidth;
        return (
          <group key={team.name} position={[xOff, 0, -8]}>
            {/* Garage structure */}
            <mesh position={[0, 2.5, 0]} castShadow>
              <boxGeometry args={[garageWidth - 0.5, 5, 8]} />
              <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.5} />
            </mesh>
            {/* Front opening */}
            <mesh position={[0, 2, 4.01]}>
              <planeGeometry args={[garageWidth - 2, 3.5]} />
              <meshStandardMaterial color="#0a0a0a" side={THREE.DoubleSide} />
            </mesh>
            {/* Team color stripe */}
            <mesh position={[0, 4.8, 0.01]}>
              <boxGeometry args={[garageWidth - 0.5, 0.4, 8.1]} />
              <meshStandardMaterial color={team.color} emissive={team.color} emissiveIntensity={0.3} />
            </mesh>
            {/* Team name */}
            <Text position={[0, 5.8, 4]} fontSize={1} color="white" anchorX="center">
              {team.flag} {team.name}
            </Text>
            {/* Pit crew avatars (2 per garage) */}
            {[-2, 2].map((px, j) => (
              <group key={j} position={[px, 0, 2]}>
                {/* Body */}
                <mesh position={[0, 0.8, 0]}>
                  <capsuleGeometry args={[0.25, 0.8, 4, 8]} />
                  <meshStandardMaterial color={team.color} />
                </mesh>
                {/* Head */}
                <mesh position={[0, 1.6, 0]}>
                  <sphereGeometry args={[0.2, 8, 8]} />
                  <meshStandardMaterial color="#f5d0a9" />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}
      {/* PIT LANE sign */}
      <Text position={[0, 7, 4]} fontSize={2.5} color="#f59e0b" anchorX="center"
        outlineWidth={0.12} outlineColor="#000">
        🏁 PIT LANE
      </Text>
    </group>
  );
});
PitLane.displayName = 'PitLane';

// ── ENTRANCE PORTAL ──
const EntrancePortal: React.FC = React.memo(() => (
  <group position={[CIRCUIT_CENTER[0] + 200, 0, CIRCUIT_CENTER[2] + 60]}>
    {/* Arch pillars */}
    {[-4, 4].map((x, i) => (
      <mesh key={i} position={[x, 4, 0]} castShadow>
        <boxGeometry args={[1, 8, 1]} />
        <meshStandardMaterial color="#1e40af" emissive="#1e40af" emissiveIntensity={0.2} />
      </mesh>
    ))}
    {/* Arch top */}
    <mesh position={[0, 8.5, 0]}>
      <boxGeometry args={[10, 1.5, 1.5]} />
      <meshStandardMaterial color="#1e40af" emissive="#3b82f6" emissiveIntensity={0.3} />
    </mesh>
    {/* Sign */}
    <Text position={[0, 10, 0]} fontSize={2} color="#f0f0f0" anchorX="center"
      outlineWidth={0.1} outlineColor="#1e40af">
      🏎️ F1 OMEGA CIRCUIT
    </Text>
    {/* Entrance road */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.17, 15]}>
      <planeGeometry args={[8, 30]} />
      <meshStandardMaterial color="#2a2a2a" roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
    {/* Entrance center line */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 15]}>
      <planeGeometry args={[0.2, 30]} />
      <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.15} side={THREE.DoubleSide} />
    </mesh>
  </group>
));
EntrancePortal.displayName = 'EntrancePortal';

// ── CROWD AVATARS ──
const CrowdAvatars: React.FC<{ trackPath: THREE.Vector3[] }> = React.memo(({ trackPath }) => {
  const avatars = useMemo(() => {
    const list: Array<{ pos: [number, number, number]; color: string }> = [];
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

    for (let i = 0; i < CROWD_COUNT; i++) {
      // Distribute around the track perimeter, offset outward
      const idx = Math.floor((i / CROWD_COUNT) * trackPath.length);
      const p = trackPath[idx % trackPath.length];
      const cx = CIRCUIT_CENTER[0];
      const cz = CIRCUIT_CENTER[2];
      const dx = p.x - cx;
      const dz = p.z - cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const offsetDist = dist + 15 + Math.random() * 5;
      const nx = (dx / dist) * offsetDist + cx;
      const nz = (dz / dist) * offsetDist + cz;

      list.push({
        pos: [nx, 0, nz],
        color: colors[i % colors.length],
      });
    }
    return list;
  }, [trackPath]);

  return (
    <group>
      {avatars.map((av, i) => (
        <group key={i} position={av.pos}>
          {/* Body */}
          <mesh position={[0, 0.8, 0]}>
            <capsuleGeometry args={[0.2, 0.7, 4, 8]} />
            <meshStandardMaterial color={av.color} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshStandardMaterial color="#f5d0a9" />
          </mesh>
        </group>
      ))}
    </group>
  );
});
CrowdAvatars.displayName = 'CrowdAvatars';

// ── TRACK SURFACE ──
const TrackSurface: React.FC<{ path: THREE.Vector3[] }> = React.memo(({ path }) => {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-TRACK_WIDTH / 2, -0.1);
    shape.lineTo(TRACK_WIDTH / 2, -0.1);
    shape.lineTo(TRACK_WIDTH / 2, 0.1);
    shape.lineTo(-TRACK_WIDTH / 2, 0.1);
    shape.closePath();

    const curvePath = new THREE.CatmullRomCurve3(path.filter((_, i) => i % 2 === 0), true);
    return new THREE.ExtrudeGeometry(shape, { steps: 400, bevelEnabled: false, extrudePath: curvePath });
  }, [path]);

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      {/* Track boundary kerbs */}
      {path.filter((_, i) => i % 15 === 0).map((p, i) => {
        const cx = CIRCUIT_CENTER[0];
        const cz = CIRCUIT_CENTER[2];
        const dx = p.x - cx;
        const dz = p.z - cz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const nx = (dx / dist);
        const nz = (dz / dist);

        return (
          <React.Fragment key={i}>
            {/* Inner kerb */}
            <mesh position={[p.x - nx * 5, 0.22, p.z - nz * 5]}>
              <boxGeometry args={[1.5, 0.1, 1.5]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#dc2626' : '#ffffff'} />
            </mesh>
            {/* Outer kerb */}
            <mesh position={[p.x + nx * 5, 0.22, p.z + nz * 5]}>
              <boxGeometry args={[1.5, 0.1, 1.5]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#dc2626' : '#ffffff'} />
            </mesh>
          </React.Fragment>
        );
      })}
    </group>
  );
});
TrackSurface.displayName = 'TrackSurface';

// ── CONNECTING ROADS ──
const ConnectingRoads: React.FC = React.memo(() => {
  // Roads connecting F1 circuit to main city road grid
  const roads = useMemo(() => [
    // Road to city center (west)
    { from: [CIRCUIT_CENTER[0] - 180, 0.17, CIRCUIT_CENTER[2]], to: [800, 0.17, -500], label: 'City Road' },
    // Road to KFC/Restaurant quarter
    { from: [CIRCUIT_CENTER[0], 0.17, CIRCUIT_CENTER[2] + 100], to: [800, 0.17, -200], label: 'Restaurant Rd' },
    // Road to entrance portal
    { from: [CIRCUIT_CENTER[0] + 200, 0.17, CIRCUIT_CENTER[2] + 60], to: [CIRCUIT_CENTER[0] + 200, 0.17, CIRCUIT_CENTER[2] + 120], label: '' },
  ], []);

  return (
    <group>
      {roads.map((road, i) => {
        const dx = road.to[0] - road.from[0];
        const dz = road.to[2] - road.from[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        const mx = (road.from[0] + road.to[0]) / 2;
        const mz = (road.from[2] + road.to[2]) / 2;
        const angle = Math.atan2(dz, dx);

        return (
          <group key={i} position={[mx, 0.17, mz]} rotation={[0, -angle + Math.PI / 2, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[8, length]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.85} side={THREE.DoubleSide} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <planeGeometry args={[0.2, length]} />
              <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.15} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
});
ConnectingRoads.displayName = 'ConnectingRoads';

// ── START/FINISH LINE ──
const StartFinishLine: React.FC<{ position: [number, number, number] }> = React.memo(({ position }) => (
  <group position={position}>
    {/* Gantry */}
    {([-6, 6] as const).map((x, i) => (
      <mesh key={i} position={[x, 5, 0]} castShadow>
        <boxGeometry args={[0.5, 10, 0.5]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.6} />
      </mesh>
    ))}
    <mesh position={[0, 10.5, 0]}>
      <boxGeometry args={[13, 1, 1.5]} />
      <meshStandardMaterial color="#1f2937" metalness={0.3} />
    </mesh>
    {/* Checkered pattern on road */}
    {Array.from({ length: 8 }).map((_, i) => (
      <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[(i - 3.5) * 1.5, 0.21, 0]}>
        <planeGeometry args={[1.5, 3]} />
        <meshStandardMaterial color={i % 2 === 0 ? '#ffffff' : '#000000'} side={THREE.DoubleSide} />
      </mesh>
    ))}
    {/* Finish text */}
    <Text position={[0, 11.5, 0]} fontSize={1.5} color="#f59e0b" anchorX="center"
      outlineWidth={0.08} outlineColor="#000">
      🏁 START / FINISH
    </Text>
  </group>
));
StartFinishLine.displayName = 'StartFinishLine';

// ── TRACK FENCING ──
const TrackFencing: React.FC<{ path: THREE.Vector3[] }> = React.memo(({ path }) => {
  const posts = useMemo(() => path.filter((_, i) => i % 10 === 0), [path]);

  return (
    <group>
      {posts.map((p, i) => {
        const cx = CIRCUIT_CENTER[0];
        const cz = CIRCUIT_CENTER[2];
        const dx = p.x - cx;
        const dz = p.z - cz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const nx = dx / dist;
        const nz = dz / dist;
        const outerX = p.x + nx * 8;
        const outerZ = p.z + nz * 8;

        return (
          <mesh key={i} position={[outerX, 0.6, outerZ]}>
            <boxGeometry args={[0.1, 1.2, 0.1]} />
            <meshStandardMaterial color="#d1d5db" metalness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
});
TrackFencing.displayName = 'TrackFencing';

// ═══════════════════════════════════════════
// MAIN F1 CIRCUIT SYSTEM
// ═══════════════════════════════════════════
export const F1CircuitSystem: React.FC = () => {
  const trackPath = useMemo(() => generateTrackPath(), []);
  const pathCurve = useMemo(() => {
    const filtered = trackPath.filter((_, i) => i % 2 === 0);
    return new THREE.CatmullRomCurve3(filtered, true);
  }, [trackPath]);
  const totalLength = useMemo(() => pathCurve.getLength(), [pathCurve]);

  // Start/finish position = first point on track
  const startPos = trackPath[0];

  return (
    <group>
      {/* Circuit ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CIRCUIT_CENTER[0], 0.1, CIRCUIT_CENTER[2]]} receiveShadow>
        <circleGeometry args={[220, 64]} />
        <meshStandardMaterial color="#2d5a1e" roughness={0.9} />
      </mesh>

      {/* Track surface */}
      <TrackSurface path={trackPath} />

      {/* Fencing */}
      <TrackFencing path={trackPath} />

      {/* Start/Finish gantry */}
      <StartFinishLine position={[startPos.x, 0, startPos.z]} />

      {/* 5 F1 Cars */}
      {TEAMS.map((team, i) => (
        <F1Car
          key={team.name}
          path={pathCurve}
          offset={i * 0.18}
          team={team}
          carNumber={i + 1}
          totalLength={totalLength}
        />
      ))}

      {/* North Grandstand (Main) - overlooks start/finish */}
      <Grandstand
        position={[CIRCUIT_CENTER[0] + 180, 0, CIRCUIT_CENTER[2] + 20]}
        rotation={[0, -Math.PI / 2, 0]}
        length={80}
        label="MAIN GRANDSTAND"
      />

      {/* South Grandstand (Hairpin view) */}
      <Grandstand
        position={[CIRCUIT_CENTER[0] - 160, 0, CIRCUIT_CENTER[2] - 30]}
        rotation={[0, Math.PI / 2, 0]}
        length={40}
        label="HAIRPIN VIEW"
      />

      {/* East viewing - Pit Building view */}
      <Grandstand
        position={[CIRCUIT_CENTER[0] + 30, 0, CIRCUIT_CENTER[2] - 120]}
        rotation={[0, 0, 0]}
        length={50}
        label="PIT VIEW"
      />

      {/* Pit Lane */}
      <PitLane />

      {/* Entrance Portal (West/Paddock) */}
      <EntrancePortal />

      {/* Connecting roads to city grid & train stations */}
      <ConnectingRoads />

      {/* 50 Crowd avatars distributed around track */}
      <CrowdAvatars trackPath={trackPath} />

      {/* Circuit lighting (night races) */}
      <pointLight position={[CIRCUIT_CENTER[0], 30, CIRCUIT_CENTER[2]]} intensity={0.5} distance={300} color="#ffffee" />
      <pointLight position={[CIRCUIT_CENTER[0] + 100, 25, CIRCUIT_CENTER[2] - 50]} intensity={0.3} distance={200} color="#ffffee" />
      <pointLight position={[CIRCUIT_CENTER[0] - 100, 25, CIRCUIT_CENTER[2] + 50]} intensity={0.3} distance={200} color="#ffffee" />

      {/* Circuit label visible from altitude */}
      <Text
        position={[CIRCUIT_CENTER[0], 15, CIRCUIT_CENTER[2]]}
        fontSize={5}
        color="#ffffff"
        anchorX="center"
        outlineWidth={0.2}
        outlineColor="#1e40af"
      >
        🏎️ F1 OMEGA CIRCUIT
      </Text>
    </group>
  );
};

export default F1CircuitSystem;
