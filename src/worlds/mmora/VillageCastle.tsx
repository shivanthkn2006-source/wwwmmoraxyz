/**
 * M'Mora Village gothic castle: rocky hill skirt, curtain walls with
 * battlements, four corner towers with spires, a central keep, and a gate
 * door plus a keep door that open with the Use / door symbol. Box/cone shapes
 * only, shared materials — cheap on phones.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { registerFloor } from '@/lib/vrFloor';
import { setSolidGroup, wallPieces } from '@/lib/vrSolids';

const CX = -70, CZ = 10, S = 24, H = 7, T = 0.8, UP = 4.65;
const M = {
  stone: new THREE.MeshStandardMaterial({ color: '#5f5b55', roughness: 0.95 }),
  dark: new THREE.MeshStandardMaterial({ color: '#2e2f33', roughness: 0.8 }),
  rock: new THREE.MeshStandardMaterial({ color: '#4a4640', roughness: 1 }),
  oak: new THREE.MeshStandardMaterial({ color: '#3b2614', roughness: 0.7 }),
  floor: new THREE.MeshStandardMaterial({ color: '#4d4740', roughness: 0.9 }),
  rug: new THREE.MeshStandardMaterial({ color: '#5a1414', roughness: 1 }),
  win: new THREE.MeshBasicMaterial({ color: '#ffcf7a' }),
};
const B: React.FC<{ m: THREE.Material; p: [number, number, number]; s: [number, number, number] }> = ({ m, p, s }) => (
  <mesh material={m} position={p}><boxGeometry args={s} /></mesh>
);

const Merlons: React.FC<{ len: number; y: number; p: [number, number]; along: 'x' | 'z' }> = ({ len, y, p, along }) => (
  <>{Array.from({ length: Math.floor(len / 1.6) }, (_, i) => {
    const o = -len / 2 + 0.8 + i * 1.6;
    return <B key={i} m={M.stone} p={along === 'x' ? [p[0] + o, y, p[1]] : [p[0], y, p[1] + o]} s={[0.8, 0.9, 0.8]} />;
  })}</>
);

function useDoor(pos: [number, number], label: string, up = false) {
  const [open, setOpen] = useState(false);
  return useDoorState(pos, label, up, open, setOpen);
}
function useDoorState(pos: [number, number], label: string, up: boolean, open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>>) {
  const { camera } = useThree();
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, open ? -1.6 : 0, 4, dt); });
  useEffect(() => registerUse(() => {
    if ((camera.position.y > 4) !== up) return null;
    const d = Math.hypot(camera.position.x - pos[0], camera.position.z - pos[1]);
    return { dist: d * 0.6, reach: 2.4, label: `${open ? 'Close' : 'Open'} the ${label}`, run: () => setOpen((v) => !v) };
  }), [camera, open, pos, label, up]);
  return { ref, open };
}

const Tower: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0, z]}>
    <mesh material={M.stone} position={[0, 6, 0]}><cylinderGeometry args={[2, 2.2, 12, 10]} /></mesh>
    <mesh material={M.dark} position={[0, 15, 0]}><coneGeometry args={[2.4, 6, 10]} /></mesh>
    <B m={M.win} p={[0, 9, 2.05]} s={[0.4, 0.9, 0.05]} />
  </group>
);

export const VillageCastle: React.FC = () => {
  const gate = useDoor([CX, CZ + S / 2 + 1.5], 'castle gate');
  const keep = useDoor([CX, CZ + 2 + 1.5], 'keep door');
  const hall = useDoor([CX, CZ - 2.5], 'great hall door');
  const study = useDoor([CX + 0.6, CZ - 4], 'study door');
  const bed = useDoor([CX, CZ - 3.5], 'bedchamber door', true);
  // Keep floors: stairs in the entrance hall (right side) rise to the upper storey.
  useEffect(() => registerFloor((x, z, eyeY) => {
    const lx = x - CX, lz = z - (CZ - 2);
    if (Math.abs(lx) > 3.9 || Math.abs(lz) > 3.9) return 0;
    if (lx > 2.7 && lz > 0.3) return Math.max(0, Math.min(UP, (UP * (3.9 - lz)) / 3.6));
    return eyeY > 4 ? UP : 0;
  }), []);
  const h = S / 2;
  // Solid walls: curtain walls, towers, keep and inner rooms; shut doors block.
  useEffect(() => {
    const t = 0.9, k = -2, G = 4.5, UPY = 4.5;
    type P = [number, number, number, number];
    const shut = (o: boolean, p: P) => (o ? [] : [p]);
    setSolidGroup('castle', [
      ...wallPieces(CX, CZ, 0, [
        [0, -h, S, t], [-h, 0, t, S], [h, 0, t, S], [-7.5, h, 10, t], [7.5, h, 10, t],
        ...[-h, h].flatMap((x) => [-h, h].map((z) => [x, z, 4, 4] as P)),
        ...shut(gate.open, [0, h + 0.45, 5, t]),
        [0, k - 4, 8, t], [-4, k, t, 8], [4, k, t, 8], [-2.6, k + 4, 2.8, t], [2.6, k + 4, 2.8, t],
        ...shut(keep.open, [0, k + 4.45, 2.4, t]),
      ]),
      ...wallPieces(CX, CZ, 0, [
        [-2.5, k, 3, 0.4], [1.85, k, 1.7, 0.4], ...shut(hall.open, [0, k, 2, 0.4]),
        [0, k - 3.2, 0.4, 1.6], ...shut(study.open, [0, k - 1.6, 0.4, 1.6]),
      ], 0, G),
      ...wallPieces(CX, CZ, 0, [[-2.5, k - 1.5, 3, 0.4], [2.5, k - 1.5, 3, 0.4], ...shut(bed.open, [0, k - 1.5, 2, 0.4])], UPY),
    ]);
    return () => setSolidGroup('castle', null);
  }, [gate.open, keep.open, hall.open, study.open, bed.open, h]);
  return (
    <group position={[CX, 0, CZ]}>
      {/* rocky hill skirt */}
      <mesh material={M.rock} position={[0, -1.5, 0]}><cylinderGeometry args={[S * 0.75, S * 0.95, 4, 14]} /></mesh>
      <B m={M.floor} p={[0, 0.05, 0]} s={[S, 0.1, S]} />
      {/* curtain walls (front has a gate gap) */}
      <B m={M.stone} p={[0, H / 2, -h]} s={[S, H, T]} />
      <B m={M.stone} p={[-h, H / 2, 0]} s={[T, H, S]} />
      <B m={M.stone} p={[h, H / 2, 0]} s={[T, H, S]} />
      <B m={M.stone} p={[-(h + 2) / 2 - 0.5, H / 2, h]} s={[h - 2, H, T]} />
      <B m={M.stone} p={[(h + 2) / 2 + 0.5, H / 2, h]} s={[h - 2, H, T]} />
      <B m={M.stone} p={[0, H - 1.25, h]} s={[4, 2.5, T]} />
      <Merlons len={S} y={H + 0.45} p={[0, -h]} along="x" />
      <Merlons len={S} y={H + 0.45} p={[0, h]} along="x" />
      <Merlons len={S} y={H + 0.45} p={[-h, 0]} along="z" />
      <Merlons len={S} y={H + 0.45} p={[h, 0]} along="z" />
      {[-h, h].map((x) => [-h, h].map((z) => <Tower key={`${x}${z}`} x={x} z={z} />))}
      <group ref={gate.ref} position={[-2, 0, h + 0.45]}><B m={M.oak} p={[2, 2.25, 0]} s={[4, 4.5, 0.2]} /></group>
      {/* central keep with a room inside */}
      <group position={[0, 0, -2]}>
        <B m={M.stone} p={[0, 6, -4]} s={[8, 12, T]} />
        <B m={M.stone} p={[-4, 6, 0]} s={[T, 12, 8]} />
        <B m={M.stone} p={[4, 6, 0]} s={[T, 12, 8]} />
        <B m={M.stone} p={[-2.6, 6, 4]} s={[2.8, 12, T]} />
        <B m={M.stone} p={[2.6, 6, 4]} s={[2.8, 12, T]} />
        <B m={M.stone} p={[0, 8.25, 4]} s={[2.4, 7.5, T]} />
        {/* upper floor (hole above the stairs) and the stair ramp */}
        <B m={M.floor} p={[-0.7, 4.5, 0]} s={[6.6, 0.3, 8]} />
        <B m={M.floor} p={[3.3, 4.5, -2]} s={[1.4, 0.3, 4]} />
        <mesh material={M.oak} position={[3.3, 2.3, 2.1]} rotation={[0.906, 0, 0]}><boxGeometry args={[1.2, 0.15, 5.84]} /></mesh>
        {Array.from({ length: 12 }, (_, i) => <B key={i} m={M.stone} p={[3.3, (i + 0.5) * 0.385, 3.75 - i * 0.3]} s={[1.2, 0.08, 0.3]} />)}
        {/* upper storey: landing / bedchamber with its own door */}
        <B m={M.stone} p={[-2.5, 6.9, -1.5]} s={[3, 4.5, 0.3]} />
        <B m={M.stone} p={[2.5, 6.9, -1.5]} s={[3, 4.5, 0.3]} />
        <group ref={bed.ref} position={[-1, 4.65, -1.5]}><B m={M.oak} p={[1, 1.5, 0]} s={[2, 3, 0.12]} /></group>
        <B m={M.rug} p={[0, 4.95, -2.8]} s={[2.2, 0.5, 2]} />
        <B m={M.oak} p={[0, 5.4, -3.8]} s={[2.2, 1.2, 0.15]} />
        <B m={M.oak} p={[-3, 5.05, -3]} s={[1, 0.8, 0.7]} />
        <B m={M.rug} p={[-1, 4.67, 1.5]} s={[3, 0.02, 2.5]} />
        {[-2, 2].map((x) => <B key={`u${x}`} m={M.win} p={[x, 9.5, -3.58]} s={[0.5, 1.2, 0.05]} />)}
        <pointLight position={[0, 8, 0]} intensity={0.9} distance={9} color="#ffcf8a" />
        <mesh material={M.dark} position={[0, 15.5, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[6, 7, 4]} /></mesh>
        <B m={M.rug} p={[0, 0.12, 0]} s={[2, 0.02, 6]} />
        <B m={M.oak} p={[-2, 0.9, -3.2]} s={[2.4, 1.8, 0.8]} />
        {[-2, 2].map((x) => <B key={x} m={M.win} p={[x, 7, 4.42]} s={[0.5, 1.2, 0.05]} />)}
        {/* inner rooms: entrance hall | great hall (left) and study (right) */}
        <B m={M.stone} p={[-2.5, 2.25, 0]} s={[3, 4.5, 0.3]} />
        <B m={M.stone} p={[2.5, 2.25, 0]} s={[3, 4.5, 0.3]} />
        <B m={M.stone} p={[0, 3.75, 0]} s={[2, 1.5, 0.3]} />
        <group ref={hall.ref} position={[-1, 0, 0]}><B m={M.oak} p={[1, 1.5, 0]} s={[2, 3, 0.12]} /></group>
        <B m={M.stone} p={[0, 2.25, -3.2]} s={[0.3, 4.5, 1.6]} />
        <B m={M.stone} p={[0, 3.75, -1.6]} s={[0.3, 1.5, 1.6]} />
        <group ref={study.ref} position={[0, 0, -0.8]} rotation={[0, Math.PI / 2, 0]}><B m={M.oak} p={[0.8, 1.5, 0]} s={[1.6, 3, 0.1]} /></group>
        <B m={M.oak} p={[2, 0.8, -3.4]} s={[1.6, 1.6, 0.5]} />
        <B m={M.rug} p={[-2, 0.12, -2]} s={[2.6, 0.02, 3]} />
        <pointLight position={[-2, 3.5, -2]} intensity={0.7} distance={6} color="#ffcf8a" />
        <pointLight position={[0, 3.5, 0]} intensity={1} distance={10} color="#ffcf8a" />
        <group ref={keep.ref} position={[-1.2, 0, 4.45]}><B m={M.oak} p={[1.2, 1.5, 0]} s={[2.4, 3, 0.15]} /></group>
      </group>
    </group>
  );
};
