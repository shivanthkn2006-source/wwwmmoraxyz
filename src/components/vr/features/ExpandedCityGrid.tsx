/**
 * EXPANDED CITY GRID - 1 Mile (~1600m) City with Named Buildings
 * Every 500m: KFC, McDonald's, Starbucks, cafes, hospitals, hotels,
 * schools, churches, temples, high-rises, parks, 5-star hotels
 * Uses distance-based label rendering to prevent GPU overload
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

// 1 mile ≈ 1609m, we use 1600 for clean grid
const CITY_RADIUS = 800; // 1600m diameter
const ROAD_SPACING = 400;
const ROAD_CLEARANCE = 54;

const pushOffRoadAxis = (value: number, clearance: number = ROAD_CLEARANCE): number => {
  const nearestRoad = Math.round(value / ROAD_SPACING) * ROAD_SPACING;
  const delta = value - nearestRoad;

  if (Math.abs(delta) < clearance) {
    const direction = delta === 0 ? 1 : Math.sign(delta);
    return nearestRoad + direction * clearance;
  }

  return value;
};

const ensureOffRoadPosition = (
  x: number,
  z: number,
  clearance: number = ROAD_CLEARANCE,
): [number, number] => {
  return [pushOffRoadAxis(x, clearance), pushOffRoadAxis(z, clearance)];
};

export interface CityPOI {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  color: string;
  height: number;
  width: number;
  depth: number;
}

// Generate POIs in city blocks (between roads) so roads stay clear
const generateCityPOIs = (): CityPOI[] => {
  const pois: CityPOI[] = [];
  let idCounter = 0;

  // Building templates with brand colors
  const templates: Array<{
    name: string; type: string; color: string;
    height: number; width: number; depth: number;
  }> = [
    { name: 'KFC', type: 'restaurant', color: '#c8102e', height: 5, width: 8, depth: 8 },
    { name: "McDonald's", type: 'restaurant', color: '#ffc300', height: 5, width: 9, depth: 9 },
    { name: 'Starbucks', type: 'cafe', color: '#00704a', height: 4, width: 7, depth: 7 },
    { name: 'City Café', type: 'cafe', color: '#6b4226', height: 3.5, width: 6, depth: 6 },
    { name: 'Fashion Boutique', type: 'fashion_store', color: '#db2777', height: 6, width: 10, depth: 8 },
    { name: 'Pet Shop', type: 'pet_shop', color: '#0ea5e9', height: 5.5, width: 9, depth: 8 },
    { name: 'Laundry Store', type: 'laundry', color: '#0f766e', height: 4.5, width: 8, depth: 7 },
    { name: 'Vegetable Market', type: 'vegetable_market', color: '#65a30d', height: 4, width: 12, depth: 10 },
    { name: 'Fruit Market', type: 'fruit_market', color: '#ea580c', height: 4, width: 12, depth: 10 },
    { name: 'General Hospital', type: 'hospital', color: '#e0f0ff', height: 25, width: 20, depth: 16 },
    { name: 'Grand Hyatt Hotel', type: 'hotel_5star', color: '#c4a35a', height: 40, width: 14, depth: 14 },
    { name: 'Marriott Hotel', type: 'hotel_5star', color: '#7b2d26', height: 35, width: 12, depth: 12 },
    { name: 'Central School', type: 'school', color: '#f59e0b', height: 8, width: 18, depth: 14 },
    { name: 'St. Mary Church', type: 'church', color: '#d4c5a9', height: 18, width: 10, depth: 16 },
    { name: 'Shiva Temple', type: 'temple', color: '#e07b39', height: 15, width: 12, depth: 12 },
    { name: 'Omega Tower', type: 'highrise', color: '#2563eb', height: 60, width: 12, depth: 12 },
    { name: 'Skyline Plaza', type: 'highrise', color: '#0ea5e9', height: 50, width: 14, depth: 10 },
    { name: 'Central Park', type: 'park', color: '#22c55e', height: 0.3, width: 40, depth: 40 },
    { name: 'Fire Station #1', type: 'fire_station', color: '#dc2626', height: 6, width: 10, depth: 8 },
    { name: 'Police HQ', type: 'police_station', color: '#1e40af', height: 8, width: 12, depth: 10 },
    { name: 'City Stadium', type: 'stadium', color: '#7c3aed', height: 22, width: 35, depth: 35 },
  ];

  // Build city-block centers between roads so we never place POIs directly on road axes
  const roadLines: number[] = [];
  for (let p = -CITY_RADIUS; p <= CITY_RADIUS; p += ROAD_SPACING) {
    roadLines.push(p);
  }

  const blockCenters: [number, number][] = [];
  for (let xi = 0; xi < roadLines.length - 1; xi++) {
    for (let zi = 0; zi < roadLines.length - 1; zi++) {
      blockCenters.push([
        (roadLines[xi] + roadLines[xi + 1]) / 2,
        (roadLines[zi] + roadLines[zi + 1]) / 2,
      ]);
    }
  }

  const jitterPattern: Array<[number, number]> = [
    [0, 0],
    [65, -45],
    [-70, 35],
    [42, 72],
    [-55, -68],
    [88, 12],
    [-30, 92],
    [76, -80],
  ];

  templates.forEach((template, idx) => {
    const [cx, cz] = blockCenters[idx % blockCenters.length];
    const [jx, jz] = jitterPattern[Math.floor(idx / blockCenters.length) % jitterPattern.length];
    const waveX = Math.sin(idx * 2.7) * 18;
    const waveZ = Math.cos(idx * 3.1) * 18;

    const requiredClearance = Math.max(ROAD_CLEARANCE, Math.max(template.width, template.depth) * 0.5 + 12);
    const [x, z] = ensureOffRoadPosition(cx + jx + waveX, cz + jz + waveZ, requiredClearance);

    pois.push({
      id: `city-poi-${idCounter++}`,
      name: template.name,
      type: template.type,
      position: [x, 0, z],
      color: template.color,
      height: template.height,
      width: template.width,
      depth: template.depth,
    });
  });

  // Reduced from 40 to 12 fill buildings to prevent GPU overload
  for (let i = 0; i < 12; i++) {
    const [cx, cz] = blockCenters[(i * 3) % blockCenters.length];
    const angle = (i / 12) * Math.PI * 2;
    const ring = 38 + (i % 3) * 26;

    const [x, z] = ensureOffRoadPosition(
      cx + Math.cos(angle) * ring,
      cz + Math.sin(angle) * ring,
      ROAD_CLEARANCE,
    );

    pois.push({
      id: `city-fill-${idCounter++}`,
      name: `Building ${i + 1}`,
      type: 'commercial',
      position: [x, 0, z],
      color: '#4a5568',
      height: 10 + Math.sin(i * 2.3) * 15,
      width: 6 + Math.sin(i * 1.7) * 4,
      depth: 6 + Math.cos(i * 1.3) * 4,
    });
  }

  return pois;
};

// Single named building with sign - label only renders when camera is nearby
const CityBuilding: React.FC<{ poi: CityPOI; showLabel: boolean; cameraPos?: THREE.Vector3 }> = React.memo(({ poi, showLabel, cameraPos }) => {
  const isPark = poi.type === 'park';

  // Only render expensive Text label when camera is within 120m
  const isNearby = cameraPos
    ? Math.hypot(cameraPos.x - poi.position[0], cameraPos.z - poi.position[2]) < 120
    : false;

  return (
    <group position={poi.position}>
      {/* Building body */}
      <mesh position={[0, poi.height / 2, 0]} castShadow receiveShadow>
        {isPark ? (
          <cylinderGeometry args={[poi.width / 2, poi.width / 2, poi.height, 16]} />
        ) : (
          <boxGeometry args={[poi.width, poi.height, poi.depth]} />
        )}
        <meshStandardMaterial
          color={poi.color}
          metalness={poi.type === 'highrise' ? 0.7 : 0.2}
          roughness={poi.type === 'highrise' ? 0.2 : 0.7}
          emissive={poi.color}
          emissiveIntensity={poi.type === 'highrise' ? 0.25 : poi.type === 'hospital' ? 0.3 : poi.type === 'hotel_5star' ? 0.2 : 0.1}
        />
      </mesh>

      {/* Windows for tall buildings - only when nearby to save draw calls */}
      {isNearby && poi.height > 10 && !isPark && Array.from({ length: Math.min(Math.floor(poi.height / 3), 6) }).map((_, floor) => (
        <mesh
          key={floor}
          position={[0, floor * 3 + 2, poi.depth / 2 + 0.05]}
        >
          <planeGeometry args={[poi.width * 0.8, 1.5]} />
          <meshStandardMaterial color="#87ceeb" emissive="#87ceeb" emissiveIntensity={0.3} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Roof accent */}
      {!isPark && (
        <mesh position={[0, poi.height + 0.3, 0]}>
          <boxGeometry args={[poi.width + 0.5, 0.6, poi.depth + 0.5]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      )}

      {/* Church cross */}
      {poi.type === 'church' && (
        <group position={[0, poi.height + 3, 0]}>
          <mesh><boxGeometry args={[0.3, 4, 0.3]} /><meshStandardMaterial color="#c4a35a" /></mesh>
          <mesh position={[0, 1, 0]}><boxGeometry args={[2, 0.3, 0.3]} /><meshStandardMaterial color="#c4a35a" /></mesh>
        </group>
      )}

      {/* Temple dome */}
      {poi.type === 'temple' && (
        <mesh position={[0, poi.height + 2, 0]}>
          <sphereGeometry args={[3, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#d4a017" metalness={0.6} />
        </mesh>
      )}

      {/* Hospital cross */}
      {poi.type === 'hospital' && (
        <group position={[0, poi.height / 2, poi.depth / 2 + 0.1]}>
          <mesh><boxGeometry args={[1, 4, 0.2]} /><meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} /></mesh>
          <mesh><boxGeometry args={[4, 1, 0.2]} /><meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} /></mesh>
        </group>
      )}

      {/* Park trees - reduced count */}
      {isPark && Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2;
        const r = poi.width / 3;
        return (
          <group key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
            <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.15, 0.2, 4, 6]} /><meshStandardMaterial color="#5D4037" /></mesh>
            <mesh position={[0, 5, 0]}><sphereGeometry args={[1.5, 6, 6]} /><meshStandardMaterial color="#2E7D32" /></mesh>
          </group>
        );
      })}

      {/* Floating name label - ONLY renders when camera is within 120m to prevent GPU overload */}
      {showLabel && isNearby && (
        <Text
          position={[0, poi.height + 5, 0]}
          fontSize={2.5}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.15}
          outlineColor="#000000"
          maxWidth={20}
        >
          {poi.name}
        </Text>
      )}
    </group>
  );
});

CityBuilding.displayName = 'CityBuilding';

// Camera position tracker for distance-based label rendering
const CameraTracker: React.FC<{ onUpdate: (pos: THREE.Vector3) => void }> = ({ onUpdate }) => {
  const lastReportAt = useRef(0);
  useFrame(({ camera }) => {
    const now = performance.now();
    if (now - lastReportAt.current > 500) { // Update every 500ms, not every frame
      lastReportAt.current = now;
      onUpdate(camera.position);
    }
  });
  return null;
};

// Main expanded city component
export const ExpandedCityGrid: React.FC<{ showLabels?: boolean }> = ({ showLabels = true }) => {
  const pois = useMemo(() => generateCityPOIs(), []);
  const [cameraPos, setCameraPos] = React.useState<THREE.Vector3>(new THREE.Vector3(0, 250, 0));

  // Road grid across the city
  const roads = useMemo(() => {
    const roadList: Array<{ key: string; pos: [number, number, number]; rot: [number, number, number]; length: number }> = [];
    let idx = 0;
    // Horizontal roads
    for (let z = -CITY_RADIUS; z <= CITY_RADIUS; z += ROAD_SPACING) {
      roadList.push({
        key: `road-h-${idx++}`,
        pos: [0, 0.16, z],
        rot: [-Math.PI / 2, 0, Math.PI / 2],
        length: CITY_RADIUS * 2,
      });
    }
    // Vertical roads
    for (let x = -CITY_RADIUS; x <= CITY_RADIUS; x += ROAD_SPACING) {
      roadList.push({
        key: `road-v-${idx++}`,
        pos: [x, 0.16, 0],
        rot: [-Math.PI / 2, 0, 0],
        length: CITY_RADIUS * 2,
      });
    }
    return roadList;
  }, []);

  return (
    <group>
      {/* Camera tracker for distance-based label rendering */}
      <CameraTracker onUpdate={setCameraPos} />

      {/* Extended lush green terrain - visible from mountains */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[CITY_RADIUS * 4, CITY_RADIUS * 4]} />
        <meshStandardMaterial color="#2d5a1e" roughness={0.85} />
      </mesh>
      {/* Secondary outer ground ring for extended visibility */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[CITY_RADIUS * 8, CITY_RADIUS * 8]} />
        <meshStandardMaterial color="#1a4012" roughness={0.95} />
      </mesh>
      {/* Far terrain ring visible from Everest */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[12000, 12000]} />
        <meshStandardMaterial color="#1b3a0f" roughness={1} />
      </mesh>

      {/* Road network */}
      {roads.map(r => (
        <group key={r.key} position={r.pos}>
          <mesh rotation={r.rot}>
            <planeGeometry args={[8, r.length]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
          {/* Center line */}
          <mesh rotation={r.rot} position={[0, 0.01, 0]}>
            <planeGeometry args={[0.2, r.length]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.15} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* All city buildings - with distance-based labels */}
      {pois.map(poi => (
        <CityBuilding key={poi.id} poi={poi} showLabel={showLabels} cameraPos={cameraPos} />
      ))}
    </group>
  );
};

// Export POI list for proximity narrator
export const getCityPOIs = generateCityPOIs;

export default ExpandedCityGrid;
