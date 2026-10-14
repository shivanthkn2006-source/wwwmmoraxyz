/** Glowing pickups for village weapons, armour and quest items (Use to take). */
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { GEAR, takeGear, useGear, type Gear } from '@/lib/vrGear';

const COL = { weapon: '#c9d3df', armour: '#b07a3c', quest: '#ffd25a' };

const Item: React.FC<{ g: Gear }> = ({ g }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) { ref.current.rotation.y = clock.elapsedTime; ref.current.position.y = g.pos[1] + Math.sin(clock.elapsedTime * 2) * 0.08; } });
  return (
    <group ref={ref} position={g.pos}>
      <mesh><boxGeometry args={g.kind === 'weapon' ? [0.6, 0.12, 0.12] : g.kind === 'armour' ? [0.4, 0.45, 0.15] : [0.3, 0.3, 0.06]} />
        <meshStandardMaterial color={COL[g.kind]} emissive={COL[g.kind]} emissiveIntensity={0.7} metalness={0.6} roughness={0.35} /></mesh>
      <mesh><sphereGeometry args={[0.55, 12, 8]} /><meshBasicMaterial color="#ffe08a" transparent opacity={0.15} depthWrite={false} /></mesh>
    </group>
  );
};

export const VillageGear: React.FC = () => {
  const { camera } = useThree();
  const owned = useGear();
  useEffect(() => registerUse(() => {
    let best: { d: number; g: Gear } | null = null;
    for (const g of GEAR) { if (g.shop) continue;
      if (owned.includes(g.id)) continue;
      const d = Math.hypot(camera.position.x - g.pos[0], camera.position.z - g.pos[2]);
      if (!best || d < best.d) best = { d, g };
    }
    if (!best) return null;
    const g = best.g;
    // Quest items unlock in order: map → medallion → crest.
    const needs: Record<string, [string, string]> = { medallion: ['map', 'Old Village Map'], crest: ['medallion', 'Church Medallion'] };
    const req = needs[g.id];
    if (req && !owned.includes(req[0])) return { dist: best.d * 0.5, reach: 1.4, label: `Find the ${req[1]} first`, run: () => {} };
    return { dist: best.d * 0.5, reach: 1.4, label: `Pick up ${g.name}`, run: () => takeGear(g) };
  }), [camera, owned]);
  return <>{GEAR.filter((g) => !g.shop && !owned.includes(g.id)).map((g) => <Item key={g.id} g={g} />)}</>;
};
