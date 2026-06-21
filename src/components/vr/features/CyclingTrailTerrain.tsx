/**
 * CYCLING TRAIL TERRAIN - Rideable paths with elevation changes
 * WebGL 1/2 compatible using TubeGeometry for smooth trails
 * 
 * Features:
 * - Winding trails with elevation profiles (flat, hilly, mountain)
 * - Trail surface textures (dirt, gravel, asphalt)
 * - Checkpoints with distance markers
 * - Trailside vegetation and guard rails on cliffs
 * - Difficulty-based coloring (green=easy, blue=medium, red=hard)
 * 
 * Progressive loading: renders at city/ground altitude level
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Season, SEASON_CONFIGS } from './SeasonsSystem';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface CyclingTrailTerrainProps {
  season: Season;
  position?: [number, number, number];
}

type TrailDifficulty = 'easy' | 'medium' | 'hard';

interface TrailConfig {
  name: string;
  difficulty: TrailDifficulty;
  points: THREE.Vector3[];
  width: number;
  color: string;
  checkpoints: number;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateTrailPoints(
  startX: number,
  startZ: number,
  length: number,
  elevationProfile: 'flat' | 'hilly' | 'mountain',
  seed: number
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const steps = Math.floor(length / 5);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const baseX = startX + Math.sin(t * Math.PI * 2 + seed) * 40 + t * 60;
    const baseZ = startZ + t * length;

    let y = 0;
    switch (elevationProfile) {
      case 'flat':
        y = Math.sin(t * Math.PI * 4 + seed) * 2 + 1;
        break;
      case 'hilly':
        y = Math.sin(t * Math.PI * 3 + seed) * 12 + Math.cos(t * Math.PI * 5) * 5 + 8;
        break;
      case 'mountain':
        y = t * 60 + Math.sin(t * Math.PI * 6 + seed) * 8;
        break;
    }

    pts.push(new THREE.Vector3(baseX, y, baseZ));
  }
  return pts;
}

const TRAIL_COLORS: Record<TrailDifficulty, string> = {
  easy: '#48bb78',
  medium: '#4299e1',
  hard: '#f56565',
};

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

/** Single trail rendered as a tube */
const Trail: React.FC<{
  config: TrailConfig;
  season: Season;
}> = ({ config, season }) => {
  const tubeGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(config.points);
    return new THREE.TubeGeometry(curve, config.points.length * 4, config.width, 6, false);
  }, [config]);

  // Surface color darkens in wet seasons
  const surfaceColor = useMemo(() => {
    if (season === 'winter') return '#8a8a8a'; // icy
    if (season === 'fall') return '#7a6a50'; // muddy
    return '#9a8a70'; // dry dirt
  }, [season]);

  // Checkpoint positions along trail
  const checkpoints = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(config.points);
    const pts: { position: THREE.Vector3; distance: number }[] = [];
    for (let i = 1; i <= config.checkpoints; i++) {
      const t = i / (config.checkpoints + 1);
      const pt = curve.getPointAt(t);
      pts.push({ position: pt, distance: Math.round(t * config.points.length * 5) });
    }
    return pts;
  }, [config]);

  return (
    <group>
      {/* Trail surface */}
      <mesh geometry={tubeGeo} receiveShadow castShadow>
        <meshStandardMaterial
          color={surfaceColor}
          roughness={0.9}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Trail difficulty stripe (center line) */}
      <mesh geometry={useMemo(() => {
        const curve = new THREE.CatmullRomCurve3(config.points.map(p => 
          new THREE.Vector3(p.x, p.y + config.width + 0.05, p.z)
        ));
        return new THREE.TubeGeometry(curve, config.points.length * 4, config.width * 0.15, 4, false);
      }, [config])}>
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={0.3}
          roughness={0.5}
        />
      </mesh>

      {/* Checkpoints */}
      {checkpoints.map((cp, i) => (
        <group key={i} position={[cp.position.x, cp.position.y + 3, cp.position.z]}>
          {/* Post */}
          <mesh>
            <cylinderGeometry args={[0.15, 0.15, 4, 6]} />
            <meshStandardMaterial color={config.color} />
          </mesh>
          {/* Sign */}
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[2, 1, 0.1]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <Html position={[0, 3, 0]} center distanceFactor={40}>
            <div className="bg-black/80 px-2 py-0.5 rounded text-white text-xs whitespace-nowrap pointer-events-none">
              🚴 {cp.distance}m • {config.name}
            </div>
          </Html>
        </group>
      ))}

      {/* Trail start sign */}
      <group position={[config.points[0].x, config.points[0].y + 2, config.points[0].z]}>
        <Html center distanceFactor={50}>
          <div
            className="px-3 py-1.5 rounded-lg text-white text-xs font-bold border whitespace-nowrap pointer-events-none"
            style={{
              backgroundColor: config.color + 'cc',
              borderColor: config.color,
            }}
          >
            🚴 {config.name} ({config.difficulty.toUpperCase()})
          </div>
        </Html>
      </group>
    </group>
  );
};

/** Guard rail segments along cliff edges */
const GuardRails: React.FC<{
  points: THREE.Vector3[];
  side: 'left' | 'right';
  offset: number;
}> = ({ points, side, offset }) => {
  const railMeshRef = useRef<THREE.InstancedMesh>(null);
  const postCount = Math.floor(points.length / 3);

  useEffect(() => {
    if (!railMeshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < postCount; i++) {
      const idx = i * 3;
      if (idx >= points.length) break;
      const p = points[idx];
      const dir = side === 'left' ? -1 : 1;
      dummy.position.set(p.x + dir * offset, p.y + 0.5, p.z);
      dummy.scale.set(0.1, 1, 0.1);
      dummy.updateMatrix();
      railMeshRef.current.setMatrixAt(i, dummy.matrix);
    }
    railMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [points, side, offset, postCount]);

  return (
    <instancedMesh ref={railMeshRef} args={[undefined, undefined, postCount]}>
      <cylinderGeometry args={[1, 1, 1, 4]} />
      <meshStandardMaterial color="#8b7355" roughness={0.8} />
    </instancedMesh>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const CyclingTrailTerrain: React.FC<CyclingTrailTerrainProps> = ({
  season,
  position = [200, 0, -100],
}) => {
  // Define trails
  const trails: TrailConfig[] = useMemo(() => [
    {
      name: 'Valley Loop',
      difficulty: 'easy' as TrailDifficulty,
      points: generateTrailPoints(0, 0, 150, 'flat', 1),
      width: 1.5,
      color: TRAIL_COLORS.easy,
      checkpoints: 3,
    },
    {
      name: 'Ridge Runner',
      difficulty: 'medium' as TrailDifficulty,
      points: generateTrailPoints(-30, -80, 200, 'hilly', 2),
      width: 1.2,
      color: TRAIL_COLORS.medium,
      checkpoints: 4,
    },
    {
      name: 'Summit Ascent',
      difficulty: 'hard' as TrailDifficulty,
      points: generateTrailPoints(20, -160, 180, 'mountain', 3),
      width: 1.0,
      color: TRAIL_COLORS.hard,
      checkpoints: 5,
    },
  ], []);

  return (
    <group position={position}>
      {/* Trails */}
      {trails.map((trail, i) => (
        <Trail key={i} config={trail} season={season} />
      ))}

      {/* Guard rails on the hard trail */}
      <GuardRails points={trails[2].points} side="right" offset={2} />

      {/* Trailside rocks */}
      {trails.map((trail, ti) =>
        trail.points
          .filter((_, i) => i % 8 === 0)
          .map((pt, i) => (
            <mesh
              key={`rock-${ti}-${i}`}
              position={[pt.x + (Math.random() - 0.5) * 6, pt.y, pt.z + (Math.random() - 0.5) * 6]}
              castShadow
            >
              <dodecahedronGeometry args={[0.5 + Math.random() * 1.5, 0]} />
              <meshStandardMaterial
                color={season === 'winter' ? '#778899' : '#6b5b4f'}
                roughness={0.95}
                flatShading
              />
            </mesh>
          ))
      )}

      {/* Trail map info board */}
      <group position={[0, 3, 5]}>
        <mesh>
          <boxGeometry args={[4, 3, 0.2]} />
          <meshStandardMaterial color="#4a3728" />
        </mesh>
        <Html position={[0, 0, 0.15]} center distanceFactor={40}>
          <div className="bg-amber-900/90 px-4 py-3 rounded border border-amber-600/60 text-white text-xs pointer-events-none w-40">
            <div className="font-bold text-sm mb-1">🗺️ Trail Map</div>
            <div className="text-green-400">● Valley Loop - Easy</div>
            <div className="text-blue-400">● Ridge Runner - Medium</div>
            <div className="text-red-400">● Summit Ascent - Hard</div>
          </div>
        </Html>
      </group>
    </group>
  );
};

export { CyclingTrailTerrain };
export default CyclingTrailTerrain;
