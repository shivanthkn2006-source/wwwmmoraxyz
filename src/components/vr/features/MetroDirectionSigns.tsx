/**
 * METRO DIRECTION SIGN BOARDS - Roadside signs pointing to metro stations
 * Placed on city roads, facing the user, indicating which direction to go
 * to reach the nearest metro station.
 * 
 * INDEPENDENT HOOK — does NOT wire into MetroTrainSystem or any other feature.
 * Only loads when user is at ground level and within city bounds.
 */

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

const CITY_RADIUS = 800;
const CITY_OFFSET_X = 60;
const CITY_OFFSET_Z = 45;

// ─── Station references for directional signs ──────────────────────────────
const METRO_STATIONS = [
  { name: 'Central Station', angle: 0 },
  { name: 'Park Avenue', angle: (1 / 14) * Math.PI * 2 },
  { name: 'Hospital Square', angle: (2 / 14) * Math.PI * 2 },
  { name: 'Temple Gate', angle: (3 / 14) * Math.PI * 2 },
  { name: 'Market Street', angle: (4 / 14) * Math.PI * 2 },
  { name: 'University', angle: (5 / 14) * Math.PI * 2 },
  { name: 'Stadium Road', angle: (6 / 14) * Math.PI * 2 },
  { name: 'Hotel District', angle: (7 / 14) * Math.PI * 2 },
  { name: 'Tech Park', angle: (8 / 14) * Math.PI * 2 },
  { name: 'Airport Link', angle: (9 / 14) * Math.PI * 2 },
  { name: 'Riverside', angle: (10 / 14) * Math.PI * 2 },
  { name: 'Old Town', angle: (11 / 14) * Math.PI * 2 },
  { name: 'Harbor Point', angle: (12 / 14) * Math.PI * 2 },
  { name: 'Skyline Junction', angle: (13 / 14) * Math.PI * 2 },
];

// ─── Sign placement: along major road axes, pointing toward nearest station ─
interface SignData {
  position: [number, number, number];
  stationName: string;
  arrowAngle: number; // radians, direction to station
  distance: string;
}

const generateSigns = (): SignData[] => {
  const signs: SignData[] = [];
  const ROAD_SPACING = 400;

  // Place signs at road intersections within city
  for (let rx = -CITY_RADIUS; rx <= CITY_RADIUS; rx += ROAD_SPACING) {
    for (let rz = -CITY_RADIUS; rz <= CITY_RADIUS; rz += ROAD_SPACING) {
      // Skip center (too many signs) and far corners
      if (Math.abs(rx) < 50 && Math.abs(rz) < 50) continue;
      if (Math.hypot(rx, rz) > CITY_RADIUS * 0.95) continue;

      // Find nearest station
      let nearestStation = METRO_STATIONS[0];
      let nearestDist = Infinity;

      for (const station of METRO_STATIONS) {
        // Station positions are on the perimeter ring
        const perim = CITY_RADIUS * 8;
        const t = station.angle / (Math.PI * 2);
        const d = t * perim;
        let sx: number, sz: number;
        if (d < CITY_RADIUS * 2) { sx = -CITY_RADIUS + d; sz = -CITY_RADIUS; }
        else if (d < CITY_RADIUS * 4) { sx = CITY_RADIUS; sz = -CITY_RADIUS + (d - CITY_RADIUS * 2); }
        else if (d < CITY_RADIUS * 6) { sx = CITY_RADIUS - (d - CITY_RADIUS * 4); sz = CITY_RADIUS; }
        else { sx = -CITY_RADIUS; sz = CITY_RADIUS - (d - CITY_RADIUS * 6); }

        const dist = Math.hypot(rx - sx, rz - sz);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestStation = station;

        }
      }

      const angle = Math.atan2(
        (() => {
          const perim = CITY_RADIUS * 8;
          const t = nearestStation.angle / (Math.PI * 2);
          const d = t * perim;
          if (d < CITY_RADIUS * 2) return -CITY_RADIUS;
          if (d < CITY_RADIUS * 4) return -CITY_RADIUS + (d - CITY_RADIUS * 2);
          if (d < CITY_RADIUS * 6) return CITY_RADIUS;
          return CITY_RADIUS - (d - CITY_RADIUS * 6);
        })() - rz,
        (() => {
          const perim = CITY_RADIUS * 8;
          const t = nearestStation.angle / (Math.PI * 2);
          const d = t * perim;
          if (d < CITY_RADIUS * 2) return -CITY_RADIUS + d;
          if (d < CITY_RADIUS * 4) return CITY_RADIUS;
          if (d < CITY_RADIUS * 6) return CITY_RADIUS - (d - CITY_RADIUS * 4);
          return -CITY_RADIUS;
        })() - rx,
      );

      // Offset sign from road center
      signs.push({
        position: [rx + 6, 0, rz + 6],
        stationName: nearestStation.name,
        arrowAngle: angle,
        distance: `${Math.round(nearestDist)}m`,
      });
    }
  }

  return signs;
};

// ─── Single Metro Direction Sign ────────────────────────────────────────────
const MetroSignPost: React.FC<{
  position: [number, number, number];
  stationName: string;
  arrowAngle: number;
  distance: string;
}> = React.memo(({ position, stationName, arrowAngle, distance }) => (
  <group position={position} rotation={[0, -arrowAngle + Math.PI / 2, 0]}>
    {/* Pole */}
    <mesh position={[0, 2, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.06, 4, 6]} />
      <meshStandardMaterial color="#1e40af" metalness={0.5} roughness={0.4} />
    </mesh>

    {/* Metro icon circle at top */}
    <mesh position={[0, 4.2, 0]}>
      <cylinderGeometry args={[0.35, 0.35, 0.08, 16]} />
      <meshStandardMaterial color="#1e40af" emissive="#1e40af" emissiveIntensity={0.3} />
    </mesh>
    <Text position={[0, 4.2, 0.06]} fontSize={0.25} color="#ffffff" anchorX="center">
      Ⓜ
    </Text>

    {/* Direction board */}
    <mesh position={[0, 3.5, 0]} castShadow>
      <boxGeometry args={[2.4, 0.8, 0.08]} />
      <meshStandardMaterial color="#1e3a5f" roughness={0.5} metalness={0.2} />
    </mesh>

    {/* Station name */}
    <Text
      position={[0, 3.6, 0.05]}
      fontSize={0.16}
      color="#ffffff"
      anchorX="center"
      anchorY="middle"
      maxWidth={2.2}
      outlineWidth={0.008}
      outlineColor="#000"
    >
      🚇 {stationName}
    </Text>

    {/* Distance */}
    <Text
      position={[0, 3.3, 0.05]}
      fontSize={0.12}
      color="#fbbf24"
      anchorX="center"
      anchorY="middle"
    >
      ← {distance} →
    </Text>

    {/* Arrow direction indicator */}
    <mesh position={[0.9, 3.5, 0.05]} rotation={[0, 0, -Math.PI / 4]}>
      <coneGeometry args={[0.1, 0.25, 3]} />
      <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.4} />
    </mesh>
  </group>
));
MetroSignPost.displayName = 'MetroSignPost';

// ─── Main Export ─────────────────────────────────────────────────────────────
export const MetroDirectionSigns: React.FC = React.memo(() => {
  const { camera } = useThree();
  const [nearSigns, setNearSigns] = React.useState<SignData[]>([]);
  const allSigns = React.useMemo(() => generateSigns(), []);
  const checkRef = useRef(0);

  // Only show signs within 200m of the camera for performance
  useFrame((state) => {
    const now = state.clock.elapsedTime * 1000;
    if (now - checkRef.current < 600) return;
    checkRef.current = now;

    const cx = camera.position.x - CITY_OFFSET_X;
    const cz = camera.position.z - CITY_OFFSET_Z;

    // Don't render if user is too high (aerial view)
    if (camera.position.y > 40) {
      if (nearSigns.length > 0) setNearSigns([]);
      return;
    }

    const visible = allSigns.filter((s) => {
      const dx = s.position[0] - cx;
      const dz = s.position[2] - cz;
      return dx * dx + dz * dz < 200 * 200;
    });

    setNearSigns(visible);
  });

  if (nearSigns.length === 0) return null;

  return (
    <group position={[CITY_OFFSET_X, 0, CITY_OFFSET_Z]}>
      {nearSigns.map((sign, i) => (
        <MetroSignPost
          key={`msign-${i}`}
          position={sign.position}
          stationName={sign.stationName}
          arrowAngle={sign.arrowAngle}
          distance={sign.distance}
        />
      ))}
    </group>
  );
});
MetroDirectionSigns.displayName = 'MetroDirectionSigns';

export default MetroDirectionSigns;
