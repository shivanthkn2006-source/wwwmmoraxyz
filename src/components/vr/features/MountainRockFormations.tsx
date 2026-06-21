/**
 * MOUNTAIN ROCK FORMATIONS - Realistic boulder and rock systems
 * WebGL 1/2 compatible using InstancedMesh for GPU efficiency
 * 
 * Features:
 * - Procedural rock clusters at mountain bases
 * - Cliff faces with layered sedimentary look
 * - Scree slopes (loose rock debris)
 * - Moss/lichen coloring based on season
 * - Balanced for performance: single draw call per formation type
 */

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Season } from './SeasonsSystem';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface MountainRockFormationsProps {
  season: Season;
  position?: [number, number, number];
  /** Scale of the formation area */
  spread?: number;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

/** Large boulder cluster - instanced for single draw call */
const BoulderCluster: React.FC<{
  center: [number, number, number];
  count: number;
  radius: number;
  maxSize: number;
  season: Season;
  seed: number;
}> = ({ center, count, radius, maxSize, season, seed }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const rng = useMemo(() => seededRandom(seed), [seed]);

  const rockColor = useMemo(() => {
    switch (season) {
      case 'winter': return '#7a8590';
      case 'spring': return '#6a705a'; // mossy
      case 'summer': return '#8a7d6d';
      case 'fall': return '#7a6a55';
    }
  }, [season]);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * radius;
      const size = 0.5 + rng() * maxSize;

      dummy.position.set(
        center[0] + Math.cos(angle) * dist,
        center[1] + size * 0.3,
        center[2] + Math.sin(angle) * dist
      );
      dummy.scale.set(
        size * (0.6 + rng() * 0.8),
        size * (0.3 + rng() * 0.7),
        size * (0.6 + rng() * 0.8)
      );
      dummy.rotation.set(rng() * 0.4, rng() * Math.PI * 2, rng() * 0.4);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Slight color variation per rock
      const variation = 0.85 + rng() * 0.3;
      color.set(rockColor).multiplyScalar(variation);
      meshRef.current.setColorAt(i, color);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [center, count, radius, maxSize, rng, rockColor]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial vertexColors roughness={0.92} metalness={0.02} flatShading />
    </instancedMesh>
  );
};

/** Scree slope - many small loose rocks sliding down */
const ScreeSlope: React.FC<{
  start: [number, number, number];
  angle: number; // radians around Y
  length: number;
  width: number;
  count: number;
  season: Season;
}> = ({ start, angle, length, width, count, season }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const color = season === 'winter' ? '#9aa0a8' : '#7d7060';

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const lateral = (Math.random() - 0.5) * width;
      const downSlope = t * length;
      const slopeY = start[1] - t * length * 0.4; // 40% grade

      dummy.position.set(
        start[0] + Math.cos(angle) * downSlope + Math.sin(angle) * lateral,
        slopeY + Math.random() * 0.5,
        start[2] + Math.sin(angle) * downSlope - Math.cos(angle) * lateral
      );

      const s = 0.1 + Math.random() * 0.6;
      dummy.scale.set(s, s * 0.5, s);
      dummy.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [start, angle, length, width, count]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} roughness={0.95} flatShading />
    </instancedMesh>
  );
};

/** Cliff face - layered sedimentary wall */
const CliffFace: React.FC<{
  position: [number, number, number];
  width: number;
  height: number;
  rotation?: number;
  season: Season;
}> = ({ position, width, height, rotation = 0, season }) => {
  const layers = useMemo(() => {
    const result: { y: number; thickness: number; color: string }[] = [];
    let y = 0;
    const colors = ['#6b5b4f', '#7a6d5f', '#5a5045', '#8a7d6d', '#4a4035'];
    let idx = 0;

    while (y < height) {
      const thickness = 0.5 + Math.random() * 2;
      result.push({
        y: y + thickness / 2,
        thickness,
        color: colors[idx % colors.length],
      });
      y += thickness + 0.05;
      idx++;
    }
    return result;
  }, [height]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {layers.map((layer, i) => (
        <mesh key={i} position={[0, layer.y, 0]} castShadow receiveShadow>
          <boxGeometry args={[
            width + (Math.random() - 0.5) * 2, 
            layer.thickness, 
            2 + Math.random() * 1.5
          ]} />
          <meshStandardMaterial
            color={season === 'winter' ? '#8a8d90' : layer.color}
            roughness={0.95}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const MountainRockFormations: React.FC<MountainRockFormationsProps> = ({
  season,
  position = [0, 0, -300],
  spread = 1,
}) => {
  return (
    <group position={position}>
      {/* Main boulder clusters near mountain bases */}
      <BoulderCluster center={[-80, 0, 30]} count={30} radius={25} maxSize={4} season={season} seed={42} />
      <BoulderCluster center={[90, 0, 50]} count={25} radius={20} maxSize={3.5} season={season} seed={99} />
      <BoulderCluster center={[0, 0, 100]} count={35} radius={30} maxSize={5} season={season} seed={137} />
      <BoulderCluster center={[-150, 0, -20]} count={20} radius={18} maxSize={3} season={season} seed={256} />

      {/* Scree slopes */}
      <ScreeSlope start={[-50, 40, -30]} angle={0.3} length={50} width={15} count={80} season={season} />
      <ScreeSlope start={[70, 35, -50]} angle={-0.5} length={40} width={12} count={60} season={season} />
      <ScreeSlope start={[10, 50, -80]} angle={0.8} length={60} width={20} count={100} season={season} />

      {/* Cliff faces */}
      <CliffFace position={[-120, 0, -50]} width={30} height={25} rotation={0.2} season={season} />
      <CliffFace position={[130, 0, -40]} width={25} height={20} rotation={-0.4} season={season} />
      <CliffFace position={[0, 0, -100]} width={40} height={30} rotation={0} season={season} />

      {/* Isolated dramatic boulders */}
      {[
        [30, 2, 60, 3],
        [-60, 1.5, 80, 2.5],
        [100, 3, 20, 4],
        [-20, 2, -40, 3.5],
      ].map(([x, y, z, size], i) => (
        <mesh key={`dramatic-${i}`} position={[x, y, z]} castShadow>
          <dodecahedronGeometry args={[size as number, 1]} />
          <meshStandardMaterial
            color={season === 'winter' ? '#7a8088' : '#6a5d50'}
            roughness={0.93}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
};

export { MountainRockFormations };
export default MountainRockFormations;
