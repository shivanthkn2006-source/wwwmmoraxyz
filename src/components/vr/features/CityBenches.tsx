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

// Every bench part as [x, y, z, w, h, d, tiltX] in bench space, by material.
const LIGHT: number[][] = [], DARK: number[][] = [], METAL: number[][] = [];
[0, 1, 2, 3, 4].forEach((i) => (i % 2 === 0 ? LIGHT : DARK).push([0, 0.42, -0.18 + i * 0.09, 1.4, 0.035, 0.07, 0]));
[0, 1, 2].forEach((i) => (i % 2 === 0 ? LIGHT : DARK).push([0, 0.58 + i * 0.1, -0.25, 1.4, 0.035, 0.06, 0.15]));
[-0.55, 0.55].forEach((x) => {
  METAL.push([x, 0.21, 0.15, 0.04, 0.42, 0.04, 0], [x, 0.35, -0.22, 0.04, 0.7, 0.04, 0], [x, 0.1, -0.04, 0.04, 0.04, 0.42, 0]);
});
[-0.6, 0.6].forEach((x) => METAL.push([x, 0.56, -0.04, 0.04, 0.04, 0.45, 0]));

const BOX = new THREE.BoxGeometry(1, 1, 1);
const MATS = {
  light: new THREE.MeshStandardMaterial({ color: BENCH_COLOR, roughness: 0.85 }),
  dark: new THREE.MeshStandardMaterial({ color: BENCH_DARK, roughness: 0.85 }),
  metal: new THREE.MeshStandardMaterial({ color: METAL_COLOR, metalness: 0.7, roughness: 0.3 }),
};

/** One instanced mesh per material: ~46 benches × 16 parts drawn in 3 batches instead of 736. */
const BenchParts: React.FC<{ benches: Array<{ pos: [number, number, number]; rot: number }>; parts: number[][]; mat: THREE.Material }> = ({ benches, parts, mat }) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(BOX, mat, benches.length * parts.length);
    const bench = new THREE.Matrix4(), part = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let k = 0;
    for (const b of benches) {
      bench.makeRotationY(b.rot).setPosition(b.pos[0], b.pos[1], b.pos[2]);
      for (const [x, y, z, w, h, d, tilt] of parts) {
        part.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(tilt, 0, 0)), new THREE.Vector3(w, h, d));
        m.setMatrixAt(k++, new THREE.Matrix4().multiplyMatrices(bench, part));
      }
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    return m;
  }, [benches, parts, mat]);
  React.useEffect(() => () => { mesh.dispose(); }, [mesh]);
  return <primitive object={mesh} onClick={() => window.dispatchEvent(new CustomEvent('vr-avatar-sit'))} />;
};

export const CityBenches: React.FC = () => {
  const benchData = useMemo(generateBenchPositions, []);
  return (
    <group>
      <BenchParts benches={benchData} parts={LIGHT} mat={MATS.light} />
      <BenchParts benches={benchData} parts={DARK} mat={MATS.dark} />
      <BenchParts benches={benchData} parts={METAL} mat={MATS.metal} />
    </group>
  );
};

export default CityBenches;
