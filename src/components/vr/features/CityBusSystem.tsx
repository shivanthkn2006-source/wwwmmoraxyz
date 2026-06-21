// ═══════════════════════════════════════════════════════════════════════════════
// CITY BUS SYSTEM - 5 city buses (black, white, yellow, light-blue, sky-blue)
// + 5 school buses (yellow). All run ON ROADS in closed loops.
// 1-minute halt at bus stops. Audio: bus-running-loop + bus-arrival.
// Independent hooks/wiring.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  updateBusRunningLevel,
  clearBusRunningLevel,
  playBusArrivalSound,
} from './audio/busAudioSystem';

const TOTAL_BUSES = 10;
const ROAD_Y = 0.3;
const BUS_SPEED = 5; // world-units per second (~5km/h feel)
const HALT_SECONDS = 15; // 15s halt at bus stops (was 60s — too long, buses appeared stuck)

const CITY_BUS_COLORS = ['#1a1a1a', '#f5f5f5', '#FFF44F', '#87CEEB', '#00BFFF'];
const ROUTE_NUMBERS = ['1M', '5M', '10M', '7M', '05M'];

const CX = 60;
const CZ = 45;
const BUS_FORWARD = new THREE.Vector3(0, 0, 1);

// ── Road-aligned CLOSED LOOP routes (buses circle continuously) ──────────────
const buildCityRoutes = (): THREE.CatmullRomCurve3[] => {
  // 5 distinct closed loops on the city road grid
  // Offset by ±4 on perpendicular axis for lane separation
  const routes: THREE.Vector3[][] = [
    // Route 1M: North-South main road loop (right lane, offset x-4)
    [
      new THREE.Vector3(CX - 4, ROAD_Y, CZ - 280),
      new THREE.Vector3(CX - 4, ROAD_Y, CZ - 80),
      new THREE.Vector3(CX - 4, ROAD_Y, CZ + 80),
      new THREE.Vector3(CX - 4, ROAD_Y, CZ + 280),
      new THREE.Vector3(CX + 40, ROAD_Y, CZ + 300),
      new THREE.Vector3(CX + 4, ROAD_Y, CZ + 280),
      new THREE.Vector3(CX + 4, ROAD_Y, CZ + 80),
      new THREE.Vector3(CX + 4, ROAD_Y, CZ - 80),
      new THREE.Vector3(CX + 4, ROAD_Y, CZ - 280),
      new THREE.Vector3(CX - 40, ROAD_Y, CZ - 300),
    ],
    // Route 5M: East-West main road loop (offset z-4)
    [
      new THREE.Vector3(CX - 280, ROAD_Y, CZ - 4),
      new THREE.Vector3(CX - 120, ROAD_Y, CZ - 4),
      new THREE.Vector3(CX, ROAD_Y, CZ - 4),
      new THREE.Vector3(CX + 120, ROAD_Y, CZ - 4),
      new THREE.Vector3(CX + 280, ROAD_Y, CZ - 4),
      new THREE.Vector3(CX + 300, ROAD_Y, CZ + 40),
      new THREE.Vector3(CX + 280, ROAD_Y, CZ + 4),
      new THREE.Vector3(CX + 120, ROAD_Y, CZ + 4),
      new THREE.Vector3(CX, ROAD_Y, CZ + 4),
      new THREE.Vector3(CX - 120, ROAD_Y, CZ + 4),
      new THREE.Vector3(CX - 280, ROAD_Y, CZ + 4),
      new THREE.Vector3(CX - 300, ROAD_Y, CZ - 40),
    ],
    // Route 10M: Outer ring road
    [
      new THREE.Vector3(CX - 200, ROAD_Y, CZ - 200),
      new THREE.Vector3(CX + 200, ROAD_Y, CZ - 200),
      new THREE.Vector3(CX + 200, ROAD_Y, CZ + 200),
      new THREE.Vector3(CX - 200, ROAD_Y, CZ + 200),
    ],
    // Route 7M: Inner rectangular loop
    [
      new THREE.Vector3(CX - 140, ROAD_Y, CZ - 150),
      new THREE.Vector3(CX + 140, ROAD_Y, CZ - 150),
      new THREE.Vector3(CX + 140, ROAD_Y, CZ + 150),
      new THREE.Vector3(CX - 140, ROAD_Y, CZ + 150),
    ],
    // Route 05M: Cross-city road loop
    [
      new THREE.Vector3(CX - 220, ROAD_Y, CZ - 120),
      new THREE.Vector3(CX + 220, ROAD_Y, CZ - 120),
      new THREE.Vector3(CX + 220, ROAD_Y, CZ + 120),
      new THREE.Vector3(CX - 220, ROAD_Y, CZ + 120),
    ],
  ];
  return routes.map(pts => new THREE.CatmullRomCurve3(pts, true, 'chordal'));
};

const buildSchoolRoutes = (): THREE.CatmullRomCurve3[] => {
  const routes: THREE.Vector3[][] = [
    [
      new THREE.Vector3(CX - 160, ROAD_Y, CZ - 160),
      new THREE.Vector3(CX + 60, ROAD_Y, CZ - 160),
      new THREE.Vector3(CX + 60, ROAD_Y, CZ + 60),
      new THREE.Vector3(CX - 160, ROAD_Y, CZ + 60),
    ],
    [
      new THREE.Vector3(CX + 80, ROAD_Y, CZ - 140),
      new THREE.Vector3(CX + 220, ROAD_Y, CZ - 140),
      new THREE.Vector3(CX + 220, ROAD_Y, CZ + 140),
      new THREE.Vector3(CX + 80, ROAD_Y, CZ + 140),
    ],
    [
      new THREE.Vector3(CX - 120, ROAD_Y, CZ - 100),
      new THREE.Vector3(CX + 120, ROAD_Y, CZ - 100),
      new THREE.Vector3(CX + 120, ROAD_Y, CZ + 100),
      new THREE.Vector3(CX - 120, ROAD_Y, CZ + 100),
    ],
    [
      new THREE.Vector3(CX - 80, ROAD_Y, CZ - 220),
      new THREE.Vector3(CX + 150, ROAD_Y, CZ - 220),
      new THREE.Vector3(CX + 150, ROAD_Y, CZ - 60),
      new THREE.Vector3(CX - 80, ROAD_Y, CZ - 60),
    ],
    [
      new THREE.Vector3(CX - 200, ROAD_Y, CZ + 80),
      new THREE.Vector3(CX - 200, ROAD_Y, CZ + 250),
      new THREE.Vector3(CX + 120, ROAD_Y, CZ + 200),
      new THREE.Vector3(CX + 120, ROAD_Y, CZ + 80),
    ],
  ];
  return routes.map(pts => new THREE.CatmullRomCurve3(pts, true, 'chordal'));
};

// Bus stop positions along routes
const BUS_STOPS: THREE.Vector3[] = [
  new THREE.Vector3(CX, ROAD_Y, CZ + 80),
  new THREE.Vector3(CX, ROAD_Y, CZ - 80),
  new THREE.Vector3(CX + 120, ROAD_Y, CZ),
  new THREE.Vector3(CX - 120, ROAD_Y, CZ),
  new THREE.Vector3(CX + 60, ROAD_Y, CZ + 150),
  new THREE.Vector3(CX - 60, ROAD_Y, CZ - 150),
  new THREE.Vector3(CX + 180, ROAD_Y, CZ + 60),
  new THREE.Vector3(CX - 180, ROAD_Y, CZ - 60),
];

// ── Realistic City Bus Body ─────────────────────────────────────────────────
const CityBusBody: React.FC<{ color: string; routeNum: string }> = ({ color, routeNum }) => {
  const isLight = color === '#f5f5f5' || color === '#FFF44F';
  const windowColor = '#a8d8ea';
  const trimColor = isLight ? '#222' : '#ddd';
  const W = 3.2, H = 3.6, L = 12;

  return (
    <group>
      <mesh position={[0, H * 0.3, 0]}>
        <boxGeometry args={[W, H * 0.55, L]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0, H * 0.7, 0]}>
        <boxGeometry args={[W - 0.15, H * 0.4, L - 0.3]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, H * 0.92, 0]}>
        <boxGeometry args={[W - 0.4, 0.15, L - 0.5]} />
        <meshStandardMaterial color="#ccc" metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[0, H * 0.98, 0]}>
        <boxGeometry args={[W * 0.6, 0.25, L * 0.7]} />
        <meshStandardMaterial color="#999" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, H * 0.62, -L / 2 - 0.02]}>
        <boxGeometry args={[W - 0.5, H * 0.4, 0.06]} />
        <meshStandardMaterial color={windowColor} transparent opacity={0.65} emissive={windowColor} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, H * 0.62, L / 2 + 0.02]}>
        <boxGeometry args={[W - 0.7, H * 0.32, 0.06]} />
        <meshStandardMaterial color={windowColor} transparent opacity={0.55} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const z = -L / 2 + 1.2 + i * (L - 2) / 8;
        return (
          <React.Fragment key={`w${i}`}>
            <mesh position={[-W / 2 - 0.02, H * 0.62, z]}>
              <boxGeometry args={[0.04, H * 0.3, 1.1]} />
              <meshStandardMaterial color={windowColor} transparent opacity={0.55} />
            </mesh>
            <mesh position={[W / 2 + 0.02, H * 0.62, z]}>
              <boxGeometry args={[0.04, H * 0.3, 1.1]} />
              <meshStandardMaterial color={windowColor} transparent opacity={0.55} />
            </mesh>
          </React.Fragment>
        );
      })}
      {[{ z: -L / 2 + 1.8 }, { z: L / 2 - 2.2 }, { z: L / 2 - 1.2 }].map((wh, wi) =>
        [-W / 2 + 0.15, W / 2 - 0.15].map((x, xi) => (
          <group key={`wh${wi}${xi}`} position={[x, 0.45, wh.z]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.45, 0.45, 0.3, 12]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
            </mesh>
          </group>
        ))
      )}
      {[-0.9, 0.9].map((x, i) => (
        <mesh key={`hl${i}`} position={[x, H * 0.35, -L / 2 - 0.03]}>
          <boxGeometry args={[0.6, 0.25, 0.08]} />
          <meshStandardMaterial color="#fff8dd" emissive="#ffee44" emissiveIntensity={0.7} />
        </mesh>
      ))}
      {[-0.9, 0.9].map((x, i) => (
        <mesh key={`tl${i}`} position={[x, H * 0.35, L / 2 + 0.03]}>
          <boxGeometry args={[0.5, 0.2, 0.06]} />
          <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={0.5} />
        </mesh>
      ))}
      <mesh position={[-W / 2 - 0.01, H * 0.42, 0]}>
        <boxGeometry args={[0.03, 0.08, L - 0.4]} />
        <meshStandardMaterial color={trimColor} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[W / 2 + 0.01, H * 0.42, 0]}>
        <boxGeometry args={[0.03, 0.08, L - 0.4]} />
        <meshStandardMaterial color={trimColor} metalness={0.8} roughness={0.2} />
      </mesh>
      {[-1, 1].map((side, i) => (
        <group key={`mirror${i}`} position={[side * (W / 2 + 0.3), H * 0.6, -L / 2 + 1.5]}>
          <mesh><boxGeometry args={[0.35, 0.2, 0.05]} /><meshStandardMaterial color="#333" metalness={0.6} roughness={0.3} /></mesh>
        </group>
      ))}
      <Text position={[0, H * 0.88, -L / 2 - 0.04]} fontSize={0.6} color="#fff" anchorX="center" anchorY="middle" outlineWidth={0.04} outlineColor="#000">{routeNum}</Text>
      <Text position={[0, H * 0.88, L / 2 + 0.04]} fontSize={0.5} color="#fff" anchorX="center" anchorY="middle" rotation={[0, Math.PI, 0]} outlineWidth={0.04} outlineColor="#000">{routeNum}</Text>
    </group>
  );
};

// ── School Bus ───────────────────────────────────────────────────────────────
const SchoolBusBody: React.FC<{ busNum: number }> = ({ busNum }) => {
  const bodyColor = '#FFB800';
  const windowColor = '#a8d8ea';
  const W = 2.8, H = 3.2, L = 10;

  return (
    <group>
      <mesh position={[0, H * 0.32, 0]}><boxGeometry args={[W, H * 0.55, L]} /><meshStandardMaterial color={bodyColor} metalness={0.2} roughness={0.55} /></mesh>
      <mesh position={[0, H * 0.68, 0]}><boxGeometry args={[W - 0.1, H * 0.35, L - 0.2]} /><meshStandardMaterial color={bodyColor} metalness={0.2} roughness={0.55} /></mesh>
      <mesh position={[0, H * 0.88, 0]}><boxGeometry args={[W - 0.2, 0.12, L - 0.3]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[0, H * 0.92, -L / 2 + 1]}><boxGeometry args={[1.8, 0.4, 0.1]} /><meshStandardMaterial color="#111" /></mesh>
      <Text position={[0, H * 0.92, -L / 2 + 0.94]} fontSize={0.25} color="#FFB800" anchorX="center" anchorY="middle">SCHOOL BUS</Text>
      <mesh position={[0, H * 0.2, -L / 2 - 0.8]}><boxGeometry args={[W - 0.4, H * 0.35, 1.6]} /><meshStandardMaterial color={bodyColor} metalness={0.2} roughness={0.55} /></mesh>
      <mesh position={[0, H * 0.55, -L / 2 - 0.02]}><boxGeometry args={[W - 0.4, H * 0.32, 0.05]} /><meshStandardMaterial color={windowColor} transparent opacity={0.6} /></mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const z = -L / 2 + 1.0 + i * (L - 1.5) / 7;
        return (
          <React.Fragment key={`sw${i}`}>
            <mesh position={[-W / 2 - 0.02, H * 0.58, z]}><boxGeometry args={[0.04, H * 0.22, 0.9]} /><meshStandardMaterial color={windowColor} transparent opacity={0.5} /></mesh>
            <mesh position={[W / 2 + 0.02, H * 0.58, z]}><boxGeometry args={[0.04, H * 0.22, 0.9]} /><meshStandardMaterial color={windowColor} transparent opacity={0.5} /></mesh>
          </React.Fragment>
        );
      })}
      {[-L / 2 + 1.5, L / 2 - 1.5].map((z) =>
        [-W / 2 + 0.15, W / 2 - 0.15].map((x, xi) => (
          <mesh key={`wh${z}${xi}`} position={[x, 0.4, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.25, 12]} />
            <meshStandardMaterial color="#111" metalness={0.4} roughness={0.5} />
          </mesh>
        ))
      )}
      {[-0.7, 0.7].map((x, i) => (
        <mesh key={`shl${i}`} position={[x, H * 0.22, -L / 2 - 1.62]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#ffee88" emissive="#ffee44" emissiveIntensity={0.6} />
        </mesh>
      ))}
      <group position={[-W / 2 - 0.3, H * 0.5, -L / 4]}>
        <mesh><boxGeometry args={[0.6, 0.5, 0.05]} /><meshStandardMaterial color="#cc0000" /></mesh>
        <Text position={[0, 0, -0.03]} fontSize={0.15} color="#fff" anchorX="center" anchorY="middle">STOP</Text>
      </group>
      <mesh position={[0, 0.08, 0]}><boxGeometry args={[W + 0.1, 0.15, L + 1.6]} /><meshStandardMaterial color="#222" /></mesh>
      <Text position={[0, H * 0.82, L / 2 + 0.04]} fontSize={0.4} color="#000" anchorX="center" anchorY="middle" rotation={[0, Math.PI, 0]}>{`S-${busNum}`}</Text>
    </group>
  );
};

// ── Bus Stop Shelter ─────────────────────────────────────────────────────────
const BusStopShelter: React.FC<{ position: THREE.Vector3 }> = ({ position: pos }) => {
  const colors = ['#e67e22', '#3498db', '#e74c3c', '#2ecc71'];
  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <mesh position={[0, 3.2, 0]}><boxGeometry args={[4, 0.15, 2]} /><meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} /></mesh>
      {[-1.8, 1.8].map((x, i) => (
        <mesh key={i} position={[x, 1.6, -0.9]}><cylinderGeometry args={[0.06, 0.06, 3.2, 8]} /><meshStandardMaterial color="#777" /></mesh>
      ))}
      <mesh position={[0, 1.6, -0.95]}><boxGeometry args={[3.6, 3, 0.06]} /><meshStandardMaterial color="#88aacc" transparent opacity={0.4} /></mesh>
      <mesh position={[0, 0.5, -0.5]}><boxGeometry args={[3, 0.1, 0.5]} /><meshStandardMaterial color="#8B4513" /></mesh>
      <group position={[2.2, 0, 0]}>
        <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.04, 0.04, 5, 8]} /><meshStandardMaterial color="#666" /></mesh>
        <mesh position={[0, 4.2, 0]}><boxGeometry args={[0.8, 0.6, 0.08]} /><meshStandardMaterial color="#0066cc" /></mesh>
        <Text position={[0, 4.2, 0.05]} fontSize={0.15} color="#fff" anchorX="center">BUS</Text>
      </group>
      {colors.map((c, i) => (
        <group key={i} position={[-1.2 + i * 0.8, 0, 0.8]}>
          <mesh position={[0, 0.9, 0]}><capsuleGeometry args={[0.2, 0.6, 4, 8]} /><meshStandardMaterial color={c} /></mesh>
          <mesh position={[0, 1.55, 0]}><sphereGeometry args={[0.18, 8, 8]} /><meshStandardMaterial color="#F5CBA7" /></mesh>
          <Text position={[0, 2.0, 0]} fontSize={0.12} color="#00ffcc" anchorX="center" outlineWidth={0.02} outlineColor="#000">mmora</Text>
        </group>
      ))}
    </group>
  );
};

// ── Single Bus Instance (closed loop, continuous) ────────────────────────────
const BusInstance: React.FC<{
  path: THREE.CatmullRomCurve3;
  busIndex: number;
  isSchoolBus: boolean;
  color?: string;
  routeNum?: string;
  busNum?: number;
}> = ({ path, busIndex, isSchoolBus, color = '#1a1a1a', routeNum = '1M', busNum = 1 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(busIndex * 0.08);
  const haltTimerRef = useRef(0);
  const isHaltedRef = useRef(false);
  const lastStopRef = useRef(-1);
  const { camera } = useThree();

  const pathLength = useMemo(() => path.getLength(), [path]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    if (isHaltedRef.current) {
      haltTimerRef.current += dt;
      if (haltTimerRef.current >= HALT_SECONDS) {
        isHaltedRef.current = false;
        haltTimerRef.current = 0;
      }
      if (groupRef.current) {
        const dist = camera.position.distanceTo(groupRef.current.position);
        updateBusRunningLevel(busIndex, dist < 200 ? Math.max(0.03, (1 - dist / 200) * 0.2) : 0);
      }
      return;
    }

    // Move along closed loop
    const step = (BUS_SPEED * dt) / pathLength;
    progressRef.current = (progressRef.current + step) % 1;

    if (groupRef.current) {
      const p = progressRef.current;
      const pos = path.getPointAt(p);
      groupRef.current.position.copy(pos);

      const tangent = path.getTangentAt(p).setY(0);
      if (tangent.lengthSq() > 0.000001) {
        tangent.normalize();
        groupRef.current.quaternion.setFromUnitVectors(BUS_FORWARD, tangent);
      }

      // Check proximity to bus stops for 1-minute halt
      for (let si = 0; si < BUS_STOPS.length; si++) {
        if (si === lastStopRef.current) continue;
        const stopDist = pos.distanceTo(BUS_STOPS[si]);
        if (stopDist < 18) {
          isHaltedRef.current = true;
          haltTimerRef.current = 0;
          lastStopRef.current = si;
          const camDist = camera.position.distanceTo(pos);
          if (camDist < 250) playBusArrivalSound(Math.max(0.3, 1 - camDist / 250));
          break;
        }
      }

      if (lastStopRef.current >= 0) {
        const lsDist = pos.distanceTo(BUS_STOPS[lastStopRef.current]);
        if (lsDist > 50) lastStopRef.current = -1;
      }

      // Running audio
      const dist = camera.position.distanceTo(pos);
      const vol = dist < 250 ? Math.max(0.06, 1 - dist / 250) : 0;
      updateBusRunningLevel(busIndex, vol);
    }
  });

  return (
    <group ref={groupRef}>
      {isSchoolBus ? <SchoolBusBody busNum={busNum || 1} /> : <CityBusBody color={color} routeNum={routeNum || '1M'} />}
    </group>
  );
};

// ── Main Export ──────────────────────────────────────────────────────────────
const CityBusSystem: React.FC = () => {
  const cityRoutes = useMemo(() => buildCityRoutes(), []);
  const schoolRoutes = useMemo(() => buildSchoolRoutes(), []);

  useEffect(() => {
    return () => {
      for (let i = 0; i < TOTAL_BUSES; i++) clearBusRunningLevel(i);
    };
  }, []);

  return (
    <group>
      {BUS_STOPS.map((pos, i) => (
        <BusStopShelter key={`stop${i}`} position={pos} />
      ))}
      {cityRoutes.map((path, i) => (
        <BusInstance key={`city${i}`} path={path} busIndex={i} isSchoolBus={false} color={CITY_BUS_COLORS[i]} routeNum={ROUTE_NUMBERS[i]} />
      ))}
      {schoolRoutes.map((path, i) => (
        <BusInstance key={`school${i}`} path={path} busIndex={5 + i} isSchoolBus={true} busNum={i + 1} />
      ))}
    </group>
  );
};

export default CityBusSystem;
