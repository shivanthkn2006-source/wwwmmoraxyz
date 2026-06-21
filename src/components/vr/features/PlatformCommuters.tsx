/**
 * PLATFORM COMMUTERS - Proximity-loaded metro station platform details
 * Only loads when user ENTERS a station platform area (within 30m).
 * Renders walking commuters, waiting passengers, benches, ticket machines.
 * 
 * INDEPENDENT HOOK — does NOT modify MetroTrainSystem.
 * Uses its own useFrame for proximity detection.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

const TRACK_HEIGHT = 8;
const CITY_RADIUS = 800;
const STATION_COUNT = 14;
const CITY_OFFSET_X = 60;
const CITY_OFFSET_Z = 45;
const PLATFORM_ACTIVATION_DISTANCE = 35; // Only load when within 35m

// ─── Station position generator (matches MetroTrainSystem) ──────────────────
const getStationPositions = (): Array<{ name: string; position: [number, number, number] }> => {
  const stationNames = [
    'Central Station', 'Park Avenue', 'Hospital Square', 'Temple Gate',
    'Market Street', 'University', 'Stadium Road', 'Hotel District',
    'Tech Park', 'Airport Link', 'Riverside', 'Old Town',
    'Harbor Point', 'Skyline Junction',
  ];

  return stationNames.slice(0, STATION_COUNT).map((name, index) => {
    const t = index / STATION_COUNT;
    const perimeter = CITY_RADIUS * 8;
    const d = t * perimeter;
    let x: number, z: number;
    if (d < CITY_RADIUS * 2) { x = -CITY_RADIUS + d; z = -CITY_RADIUS; }
    else if (d < CITY_RADIUS * 4) { x = CITY_RADIUS; z = -CITY_RADIUS + (d - CITY_RADIUS * 2); }
    else if (d < CITY_RADIUS * 6) { x = CITY_RADIUS - (d - CITY_RADIUS * 4); z = CITY_RADIUS; }
    else { x = -CITY_RADIUS; z = CITY_RADIUS - (d - CITY_RADIUS * 6); }
    return { name, position: [x, TRACK_HEIGHT, z] as [number, number, number] };
  });
};

// ─── Single commuter avatar (capsule with movement) ─────────────────────────
const CommuterAvatar: React.FC<{
  startPos: [number, number, number];
  speed: number;
  walkRange: number;
  color: string;
  seed: number;
}> = React.memo(({ startPos, speed, walkRange, color, seed }) => {
  const meshRef = useRef<THREE.Group>(null);
  const phaseRef = useRef(seed);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    phaseRef.current += delta * speed;
    // Walk back and forth
    const offset = Math.sin(phaseRef.current) * walkRange;
    meshRef.current.position.x = startPos[0] + offset;
    meshRef.current.position.z = startPos[2] + Math.cos(phaseRef.current * 0.7) * (walkRange * 0.3);
    // Slight bobbing
    meshRef.current.position.y = startPos[1] + Math.abs(Math.sin(phaseRef.current * 2)) * 0.05;
  });

  return (
    <group ref={meshRef} position={startPos}>
      {/* Body */}
      <mesh position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.15, 0.6, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#deb887" roughness={0.7} />
      </mesh>
    </group>
  );
});
CommuterAvatar.displayName = 'CommuterAvatar';

// ─── Station Platform Detail (benches, ticket machines, info boards) ────────
const PlatformDetails: React.FC<{
  stationName: string;
  position: [number, number, number];
}> = React.memo(({ stationName, position }) => {
  const commuterColors = ['#1e3a5f', '#4a1942', '#2d4a22', '#6b3a2a', '#333333', '#1a365d', '#4a2040', '#2a4a3e'];

  const commuters = useMemo(() => {
    const result: Array<{
      startPos: [number, number, number];
      speed: number;
      walkRange: number;
      color: string;
      seed: number;
    }> = [];
    
    // 8-12 commuters per platform
    const count = 8 + Math.floor(Math.abs(Math.sin(position[0] * 0.1)) * 4);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 2 + Math.random() * 4;
      result.push({
        startPos: [Math.cos(angle) * r, 0.3, Math.sin(angle) * r - 1],
        speed: 0.3 + Math.random() * 0.5,
        walkRange: 1 + Math.random() * 2,
        color: commuterColors[i % commuterColors.length],
        seed: i * 1.7,
      });
    }
    return result;
  }, [position]);

  return (
    <group position={position}>
      {/* Commuters on platform */}
      {commuters.map((c, i) => (
        <CommuterAvatar key={`commuter-${i}`} {...c} />
      ))}

      {/* Platform benches */}
      {[-4, 0, 4].map((bx, i) => (
        <group key={`bench-${i}`} position={[bx, 0.3, -2.5]}>
          <mesh>
            <boxGeometry args={[1.5, 0.08, 0.5]} />
            <meshStandardMaterial color="#8b5e3c" roughness={0.9} />
          </mesh>
          {[-0.6, 0.6].map((lx, li) => (
            <mesh key={`leg-${li}`} position={[lx, -0.15, 0]}>
              <boxGeometry args={[0.06, 0.3, 0.06]} />
              <meshStandardMaterial color="#555555" metalness={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Ticket machine */}
      <group position={[-5.5, 0, 2]}>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[0.8, 1.6, 0.6]} />
          <meshStandardMaterial color="#1e40af" metalness={0.3} roughness={0.5} />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 1.1, 0.31]}>
          <planeGeometry args={[0.5, 0.4]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} />
        </mesh>
        <Text position={[0, 1.1, 0.32]} fontSize={0.06} color="#000" anchorX="center">
          BUY TICKET
        </Text>
      </group>

      {/* Info/departure board */}
      <group position={[0, 3.2, -3]}>
        <mesh>
          <boxGeometry args={[3, 1.2, 0.1]} />
          <meshStandardMaterial color="#111111" roughness={0.3} />
        </mesh>
        <Text position={[0, 0.3, 0.06]} fontSize={0.15} color="#00ff00" anchorX="center">
          {stationName}
        </Text>
        <Text position={[0, 0, 0.06]} fontSize={0.1} color="#ffaa00" anchorX="center">
          Next Train: 2 min
        </Text>
        <Text position={[0, -0.25, 0.06]} fontSize={0.08} color="#22d3ee" anchorX="center">
          Platform 1 ← | → Platform 2
        </Text>
      </group>

      {/* Large station name sign - visible from distance */}
      <group position={[0, 5.5, 0]}>
        <mesh>
          <boxGeometry args={[6, 1.5, 0.12]} />
          <meshStandardMaterial color="#1e40af" roughness={0.4} metalness={0.3} />
        </mesh>
        <Text position={[0, 0.2, 0.07]} fontSize={0.45} color="#ffffff" anchorX="center" outlineWidth={0.03} outlineColor="#000">
          🚇 {stationName}
        </Text>
        <Text position={[0, -0.3, 0.07]} fontSize={0.18} color="#fbbf24" anchorX="center">
          METRO LINE • ALL STATIONS
        </Text>
        {/* Back side */}
        <Text position={[0, 0.2, -0.07]} fontSize={0.45} color="#ffffff" anchorX="center" outlineWidth={0.03} outlineColor="#000" rotation={[0, Math.PI, 0]}>
          🚇 {stationName}
        </Text>
      </group>

      {/* Exit/Route signs on platform pillars */}
      <group position={[-6, 2.5, 0]}>
        <mesh>
          <boxGeometry args={[1.5, 0.6, 0.08]} />
          <meshStandardMaterial color="#1e40af" emissive="#1e40af" emissiveIntensity={0.2} />
        </mesh>
        <Text position={[0, 0, 0.05]} fontSize={0.15} color="#ffffff" anchorX="center">
          ← EXIT
        </Text>
      </group>
      <group position={[6, 2.5, 0]}>
        <mesh>
          <boxGeometry args={[1.5, 0.6, 0.08]} />
          <meshStandardMaterial color="#16a34a" emissive="#16a34a" emissiveIntensity={0.2} />
        </mesh>
        <Text position={[0, 0, 0.05]} fontSize={0.15} color="#ffffff" anchorX="center">
          TRANSFER →
        </Text>
      </group>

      {/* Waste bins */}
      {[3.5, -3.5].map((bx, i) => (
        <mesh key={`bin-${i}`} position={[bx, 0.35, 2.5]}>
          <cylinderGeometry args={[0.2, 0.18, 0.7, 8]} />
          <meshStandardMaterial color="#2d5016" roughness={0.8} />
        </mesh>
      ))}

      {/* Platform edge warning strip (extra yellow line) */}
      <mesh position={[0, 0.32, 3.5]}>
        <boxGeometry args={[14, 0.02, 0.15]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} />
      </mesh>

      {/* Safety warning text on platform */}
      <Text position={[0, 0.5, 3.8]} fontSize={0.12} color="#ef4444" anchorX="center" rotation={[-Math.PI / 4, 0, 0]}>
        ⚠️ MIND THE GAP ⚠️
      </Text>
    </group>
  );
});
PlatformDetails.displayName = 'PlatformDetails';

// ─── Main Export ─────────────────────────────────────────────────────────────
export const PlatformCommuters: React.FC = React.memo(() => {
  const { camera } = useThree();
  const [activeStations, setActiveStations] = React.useState<number[]>([]);
  const stations = useMemo(() => getStationPositions(), []);
  const checkRef = useRef(0);

  useFrame((state) => {
    const now = state.clock.elapsedTime * 1000;
    if (now - checkRef.current < 400) return;
    checkRef.current = now;

    // Camera position relative to city offset
    const cx = camera.position.x - CITY_OFFSET_X;
    const cz = camera.position.z - CITY_OFFSET_Z;
    const cy = camera.position.y;

    // Only activate at platform height (near track height)
    if (cy > TRACK_HEIGHT + 15 || cy < 0) {
      if (activeStations.length > 0) setActiveStations([]);
      return;
    }

    const nearStations: number[] = [];
    for (let i = 0; i < stations.length; i++) {
      const s = stations[i];
      const dx = s.position[0] - cx;
      const dz = s.position[2] - cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < PLATFORM_ACTIVATION_DISTANCE) {
        nearStations.push(i);
      }
    }

    // Only update if changed
    if (nearStations.length !== activeStations.length || nearStations.some((v, i) => v !== activeStations[i])) {
      setActiveStations(nearStations);
    }
  });

  if (activeStations.length === 0) return null;

  return (
    <group position={[CITY_OFFSET_X, 0, CITY_OFFSET_Z]}>
      {activeStations.map((idx) => {
        const station = stations[idx];
        return (
          <PlatformDetails
            key={`platform-${idx}`}
            stationName={station.name}
            position={station.position}
          />
        );
      })}
    </group>
  );
});
PlatformCommuters.displayName = 'PlatformCommuters';

export default PlatformCommuters;
