// ═══════════════════════════════════════════════════════════════════════════════
// CITY BENCHES - 50 realistic wooden park benches placed alongside roads
// Clickable for avatar sit interaction
// Separate wiring - independent component
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import * as THREE from 'three';

const BENCH_COLOR = '#8B6914';
const BENCH_DARK = '#5a4210';
const METAL_COLOR = '#3a3a3a';

// Generate 50 bench positions along roads (offset from road center)
const generateBenchPositions = (): Array<{ pos: [number, number, number]; rot: number }> => {
  const positions: Array<{ pos: [number, number, number]; rot: number }> = [];
  const cx = 60, cz = 45;

  // Along main roads - offset 6 units from center
  // North-South road
  for (let i = 0; i < 8; i++) {
    const z = cz - 180 + i * 45;
    positions.push({ pos: [cx + 8, 0, z], rot: Math.PI / 2 });
    positions.push({ pos: [cx - 8, 0, z + 20], rot: -Math.PI / 2 });
  }

  // East-West road
  for (let i = 0; i < 8; i++) {
    const x = cx - 180 + i * 45;
    positions.push({ pos: [x, 0, cz + 8], rot: 0 });
    positions.push({ pos: [x + 20, 0, cz - 8], rot: Math.PI });
  }

  // Park area benches
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    positions.push({
      pos: [cx + Math.cos(angle) * 30, 0, cz + Math.sin(angle) * 30],
      rot: angle + Math.PI / 2,
    });
  }

  // Fill remaining to reach ~50
  const extra = [
    [cx + 50, 0, cz + 50], [cx - 50, 0, cz - 50],
    [cx + 100, 0, cz], [cx - 100, 0, cz],
    [cx, 0, cz + 100], [cx, 0, cz - 100],
    [cx + 70, 0, cz + 70], [cx - 70, 0, cz - 70],
  ];
  extra.forEach(([x, y, z]) => {
    positions.push({ pos: [x, y, z] as [number, number, number], rot: Math.random() * Math.PI * 2 });
  });

  return positions.slice(0, 50);
};

const SingleBench: React.FC<{ position: [number, number, number]; rotation: number }> = ({ position, rotation }) => {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('vr-avatar-sit'));
  };

  return (
    <group position={position} rotation={[0, rotation, 0]} onClick={handleClick}>
      {/* Seat planks (5 wooden slats) */}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={`seat-${i}`} position={[0, 0.42, -0.18 + i * 0.09]}>
          <boxGeometry args={[1.4, 0.035, 0.07]} />
          <meshStandardMaterial color={i % 2 === 0 ? BENCH_COLOR : BENCH_DARK} roughness={0.85} />
        </mesh>
      ))}

      {/* Backrest planks (3 slats) */}
      {[0, 1, 2].map(i => (
        <mesh key={`back-${i}`} position={[0, 0.58 + i * 0.1, -0.25]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[1.4, 0.035, 0.06]} />
          <meshStandardMaterial color={i % 2 === 0 ? BENCH_COLOR : BENCH_DARK} roughness={0.85} />
        </mesh>
      ))}

      {/* Metal legs (2 sides) */}
      {[-0.55, 0.55].map(x => (
        <group key={`leg-${x}`} position={[x, 0, 0]}>
          {/* Front leg */}
          <mesh position={[0, 0.21, 0.15]}>
            <boxGeometry args={[0.04, 0.42, 0.04]} />
            <meshStandardMaterial color={METAL_COLOR} metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Back leg */}
          <mesh position={[0, 0.35, -0.22]}>
            <boxGeometry args={[0.04, 0.7, 0.04]} />
            <meshStandardMaterial color={METAL_COLOR} metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Support bar */}
          <mesh position={[0, 0.1, -0.04]}>
            <boxGeometry args={[0.04, 0.04, 0.42]} />
            <meshStandardMaterial color={METAL_COLOR} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Armrests */}
      {[-0.6, 0.6].map(x => (
        <mesh key={`arm-${x}`} position={[x, 0.56, -0.04]}>
          <boxGeometry args={[0.04, 0.04, 0.45]} />
          <meshStandardMaterial color={METAL_COLOR} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

export const CityBenches: React.FC = () => {
  const benchData = useMemo(generateBenchPositions, []);

  return (
    <group>
      {benchData.map((b, i) => (
        <SingleBench key={i} position={b.pos} rotation={b.rot} />
      ))}
    </group>
  );
};

export default CityBenches;
