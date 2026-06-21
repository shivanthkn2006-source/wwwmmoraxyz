/**
 * YELLOW STONE NATIONAL PARK - Ultra-realistic high-altitude mountain system
 * WebGL 1/2 compatible using BufferGeometry + instanced meshes for performance
 * 
 * Features:
 * - Procedural height-mapped mountains with multi-layer rock faces
 * - Snow/ice caps with altitude-based distribution
 * - Mountain climbing routes (visible paths up the face)
 * - Base camp structures at foothills
 * - Avalanche debris fields
 * - Wind-eroded ridgelines
 * 
 * Progressive loading: Only renders when vrLoader.showTerrain is true
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Season, SEASON_CONFIGS } from './SeasonsSystem';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface EverestMountainRangeProps {
  season: Season;
  position?: [number, number, number];
  /** Quality tier: low=fewer verts, ultra=full detail */
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

interface MountainPeakData {
  position: [number, number, number];
  height: number;
  baseRadius: number;
  segments: number;
  snowLine: number; // 0-1 ratio from base
  hasClimbingRoute: boolean;
  name: string;
  rockLayers: number;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Generate a displaced cone geometry simulating eroded rock faces */
function createErodedMountainGeometry(
  baseRadius: number,
  height: number,
  radialSegments: number,
  heightSegments: number,
  seed: number
): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(baseRadius, height, radialSegments, heightSegments);
  const pos = geo.attributes.position;
  const arr = pos.array as Float32Array;

  // Displace vertices for realistic rocky look
  for (let i = 0; i < pos.count; i++) {
    const x = arr[i * 3];
    const y = arr[i * 3 + 1];
    const z = arr[i * 3 + 2];

    // Height-based displacement (more jagged near top)
    const heightRatio = (y + height / 2) / height;
    const noiseScale = 0.15 * baseRadius * (0.3 + heightRatio * 0.7);

    // Pseudo-random displacement using seed
    const hash = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453;
    const noise = (hash - Math.floor(hash)) * 2 - 1;

    const ridgeNoise = Math.sin(Math.atan2(z, x) * 5 + seed) * noiseScale * 0.3;

    arr[i * 3] += noise * noiseScale * 0.6 + ridgeNoise;
    arr[i * 3 + 2] += noise * noiseScale * 0.4;
    
    // Vertical displacement for ridgelines
    if (heightRatio > 0.5) {
      arr[i * 3 + 1] += (noise * 0.5 + 0.2) * noiseScale * 0.5;
    }
  }

  geo.computeVertexNormals();
  return geo;
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

/** Single high-altitude peak with rock layers, snow cap, and optional climbing route */
const HighAltitudePeak: React.FC<{
  data: MountainPeakData;
  season: Season;
}> = ({ data, season }) => {
  const groupRef = useRef<THREE.Group>(null);
  const windRef = useRef(0);

  // Rock face color by season + altitude
  const rockColor = useMemo(() => {
    const base = season === 'winter' ? '#4a5568' : season === 'fall' ? '#6b5b4f' : '#5a6650';
    return base;
  }, [season]);

  const darkRockColor = useMemo(() => {
    return season === 'winter' ? '#2d3748' : '#3d4a3a';
  }, [season]);

  // Generate eroded geometry (cached per peak)
  const mountainGeo = useMemo(() => {
    return createErodedMountainGeometry(
      data.baseRadius,
      data.height,
      data.segments,
      Math.max(4, Math.floor(data.segments / 2)),
      data.position[0] + data.position[2] * 7
    );
  }, [data]);

  // Snow cap geometry 
  const snowGeo = useMemo(() => {
    const snowHeight = data.height * (1 - data.snowLine);
    const snowRadius = data.baseRadius * (1 - data.snowLine) * 1.02;
    return createErodedMountainGeometry(snowRadius, snowHeight, data.segments, 3, data.position[0] * 3);
  }, [data]);

  const snowLineY = data.height * data.snowLine - data.height / 2;

  // Subtle wind sway for snow particles
  useFrame((state) => {
    windRef.current = Math.sin(state.clock.elapsedTime * 0.3 + data.position[0]) * 0.002;
    if (groupRef.current) {
      groupRef.current.rotation.y += windRef.current * 0.1;
    }
  });

  // Climbing route markers
  const climbingRoutePoints = useMemo(() => {
    if (!data.hasClimbingRoute) return [];
    const points: [number, number, number][] = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 1.5 + Math.PI * 0.25; // Spiral up
      const radius = data.baseRadius * (1 - t * 0.85);
      const y = t * data.height - data.height / 2;
      points.push([
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius,
      ]);
    }
    return points;
  }, [data]);

  return (
    <group ref={groupRef} position={data.position}>
      {/* Main rock body */}
      <mesh geometry={mountainGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={rockColor}
          roughness={0.95}
          metalness={0.02}
          flatShading
        />
      </mesh>

      {/* Dark rock layer (lower half) */}
      {data.rockLayers >= 2 && (
        <mesh position={[0, -data.height * 0.15, 0]} castShadow>
          <coneGeometry args={[data.baseRadius * 1.05, data.height * 0.5, data.segments, 2]} />
          <meshStandardMaterial color={darkRockColor} roughness={0.98} flatShading />
        </mesh>
      )}

      {/* Snow/ice cap */}
      <mesh
        geometry={snowGeo}
        position={[0, snowLineY + (data.height * (1 - data.snowLine)) / 2, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={season === 'winter' ? '#f0f4ff' : '#ffffff'}
          roughness={season === 'winter' ? 0.2 : 0.35}
          metalness={0.05}
          flatShading
        />
      </mesh>

      {/* Glacial ice streaks */}
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2 + 0.5;
        const streakH = data.height * 0.4;
        return (
          <mesh
            key={`ice-${i}`}
            position={[
              Math.cos(angle) * data.baseRadius * 0.5,
              data.height * 0.1,
              Math.sin(angle) * data.baseRadius * 0.5,
            ]}
            rotation={[0, angle, Math.PI * 0.08]}
          >
            <boxGeometry args={[data.baseRadius * 0.08, streakH, data.baseRadius * 0.02]} />
            <meshStandardMaterial
              color="#c8e6f0"
              transparent
              opacity={0.6}
              roughness={0.1}
              metalness={0.3}
            />
          </mesh>
        );
      })}

      {/* Climbing route path markers */}
      {data.hasClimbingRoute && climbingRoutePoints.map((pt, i) => (
        <mesh key={`route-${i}`} position={pt}>
          <sphereGeometry args={[0.8, 6, 6]} />
          <meshStandardMaterial
            color="#ff6b35"
            emissive="#ff6b35"
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}

      {/* Summit flag */}
      {data.hasClimbingRoute && (
        <group position={[0, data.height / 2 + 2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.1, 0.1, 4, 4]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
          <mesh position={[0.8, 1.5, 0]}>
            <planeGeometry args={[1.5, 1]} />
            <meshStandardMaterial color="#ff0000" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Peak label */}
      <Html position={[0, data.height / 2 + 8, 0]} center distanceFactor={80}>
        <div className="bg-black/70 px-3 py-1 rounded text-white text-xs border border-white/20 whitespace-nowrap pointer-events-none">
          <div className="font-bold">{data.name}</div>
          <div className="text-white/60">{Math.round(data.height * 30)}m</div>
        </div>
      </Html>
    </group>
  );
};

/** Boulder / rock scatter near mountain bases */
const RockField: React.FC<{
  center: [number, number, number];
  radius: number;
  count: number;
  season: Season;
}> = ({ center, radius, count, season }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const rockColor = season === 'winter' ? '#6b7280' : '#5c5040';

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      dummy.position.set(
        center[0] + Math.cos(angle) * dist,
        center[1] + Math.random() * 1.5,
        center[2] + Math.sin(angle) * dist
      );
      const s = 0.5 + Math.random() * 3;
      dummy.scale.set(s, s * (0.4 + Math.random() * 0.8), s);
      dummy.rotation.set(Math.random() * 0.3, Math.random() * Math.PI * 2, Math.random() * 0.3);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [center, radius, count]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={rockColor} roughness={0.95} flatShading />
    </instancedMesh>
  );
};

/** Base camp with tents */
const BaseCamp: React.FC<{
  position: [number, number, number];
  season: Season;
}> = ({ position, season }) => {
  const tentColor = season === 'winter' ? '#e53e3e' : '#f6ad55';

  return (
    <group position={position}>
      {/* Tents */}
      {[[-3, 0, 0], [3, 0, 2], [0, 0, -3], [5, 0, -1]].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh castShadow>
            <coneGeometry args={[1.5, 2, 4]} />
            <meshStandardMaterial color={i % 2 === 0 ? tentColor : '#4299e1'} />
          </mesh>
        </group>
      ))}

      {/* Camp fire (emissive glow) */}
      <mesh position={[1, 0.3, 0]}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial
          color="#ff4500"
          emissive="#ff6600"
          emissiveIntensity={1.2}
        />
      </mesh>
      <pointLight position={[1, 1, 0]} color="#ff6600" intensity={2} distance={15} />

      {/* Label */}
      <Html position={[0, 4, 0]} center distanceFactor={60}>
        <div className="bg-orange-900/80 px-2 py-1 rounded text-white text-xs border border-orange-400/50 whitespace-nowrap pointer-events-none">
          ⛺ Base Camp
        </div>
      </Html>
    </group>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const EverestMountainRange: React.FC<EverestMountainRangeProps> = ({
  season,
  position = [0, 0, -500],
  quality = 'medium',
}) => {
  const segmentsByQuality = { low: 6, medium: 10, high: 14, ultra: 18 };
  const segments = segmentsByQuality[quality];

  // Generate the mountain range layout
  const peaks: MountainPeakData[] = useMemo(() => {
    const snowLineBase = season === 'winter' ? 0.25 : season === 'summer' ? 0.7 : 0.5;
    return [
      // Central mega peak - Yellow Stone National Park
      {
        position: [0, 0, 0] as [number, number, number],
        height: 350,
        baseRadius: 120,
        segments: segments + 4,
        snowLine: snowLineBase - 0.1,
        hasClimbingRoute: true,
        name: '🏔️ Yellow Stone National Park',
        rockLayers: 3,
      },
      // Surrounding high peaks
      {
        position: [-200, 0, 50] as [number, number, number],
        height: 280,
        baseRadius: 90,
        segments,
        snowLine: snowLineBase,
        hasClimbingRoute: true,
        name: 'K2 Shadow',
        rockLayers: 2,
      },
      {
        position: [180, 0, 80] as [number, number, number],
        height: 260,
        baseRadius: 85,
        segments,
        snowLine: snowLineBase,
        hasClimbingRoute: false,
        name: 'Annapurna Echo',
        rockLayers: 2,
      },
      {
        position: [-100, 0, -120] as [number, number, number],
        height: 220,
        baseRadius: 70,
        segments,
        snowLine: snowLineBase + 0.05,
        hasClimbingRoute: false,
        name: 'Lhotse Mirror',
        rockLayers: 2,
      },
      {
        position: [120, 0, -100] as [number, number, number],
        height: 240,
        baseRadius: 80,
        segments,
        snowLine: snowLineBase,
        hasClimbingRoute: true,
        name: 'Makalu Peak',
        rockLayers: 2,
      },
      // Mid-range peaks
      ...Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 250 + Math.random() * 100;
        return {
          position: [Math.cos(angle) * dist, 0, Math.sin(angle) * dist] as [number, number, number],
          height: 100 + Math.random() * 120,
          baseRadius: 40 + Math.random() * 30,
          segments: Math.max(6, segments - 2),
          snowLine: snowLineBase + 0.1,
          hasClimbingRoute: false,
          name: `Peak ${i + 1}`,
          rockLayers: 1,
        };
      }),
    ];
  }, [season, segments]);

  return (
    <group position={position}>
      {/* Peaks */}
      {peaks.map((peak, i) => (
        <HighAltitudePeak key={i} data={peak} season={season} />
      ))}

      {/* Rock fields at bases of major peaks */}
      <RockField center={[0, 0, 80]} radius={60} count={40} season={season} />
      <RockField center={[-200, 0, 120]} radius={40} count={25} season={season} />
      <RockField center={[180, 0, 150]} radius={45} count={30} season={season} />

      {/* Base camps */}
      <BaseCamp position={[40, 0, 100]} season={season} />
      <BaseCamp position={[-160, 0, 130]} season={season} />

      {/* Valley floor between peaks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 50]} receiveShadow>
        <circleGeometry args={[200, 24]} />
        <meshStandardMaterial
          color={season === 'winter' ? '#d4dce6' : '#6b7c5a'}
          roughness={0.9}
        />
      </mesh>

      {/* Glacier river through valley */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 80]}>
        <planeGeometry args={[8, 300]} />
        <meshStandardMaterial
          color={season === 'winter' ? '#a8c8d8' : '#5b9bd5'}
          roughness={0.1}
          metalness={0.3}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
};

export { EverestMountainRange };
export default EverestMountainRange;
