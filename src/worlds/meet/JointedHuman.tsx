/**
 * A walking person in the shared VR look: legs and arms swing with real
 * movement speed (read from its own world position), and the right arm reaches
 * when `reachAt` (a timestamp, ms) is recent — used for pickups.
 */
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { headGeometry, humanParts, HUMAN_MATERIAL, HIP_X, HIP_Y, SHOULDER_X, SHOULDER_Y } from '@/lib/vrHumanLook';

const P = humanParts();
// Female look: same body, head with ponytail swapped in on top of the default head.
const HEAD_F = (() => { const g = headGeometry(true); g.translate(0, 1.68, 0); return g; })();
const tmp = new THREE.Vector3();

export const JointedHuman: React.FC<{ reachAt?: number; female?: boolean }> = ({ reachAt = 0, female = false }) => {
  const root = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Mesh>(null), legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null), armR = useRef<THREE.Mesh>(null);
  const last = useRef<THREE.Vector3 | null>(null);
  const speed = useRef(0), phase = useRef(0);
  useFrame((_, dt) => {
    const g = root.current; if (!g) return;
    const d = Math.min(dt, 0.1);
    g.getWorldPosition(tmp);
    if (!last.current) last.current = tmp.clone();
    const v = Math.hypot(tmp.x - last.current.x, tmp.z - last.current.z) / Math.max(d, 1e-3);
    last.current.copy(tmp);
    speed.current += (Math.min(v, 12) - speed.current) * Math.min(1, d * 6);
    const run = speed.current > 6.5;
    phase.current += d * (run ? 11 : 7) * Math.min(1, speed.current / 1.5);
    const amp = speed.current < 0.25 ? 0 : run ? 0.9 : 0.55;
    const s = Math.sin(phase.current) * amp;
    const since = (performance.now() - reachAt) / 700;
    const r = since >= 0 && since < 1 ? Math.sin(since * Math.PI) : 0;
    if (legL.current) legL.current.rotation.x = s;
    if (legR.current) legR.current.rotation.x = -s;
    if (armL.current) armL.current.rotation.x = -s * 0.8;
    if (armR.current) armR.current.rotation.x = s * 0.8 - r * 1.4;
  });
  return (
    <group ref={root}>
      <mesh geometry={P.body} material={HUMAN_MATERIAL} />
      {female && <mesh geometry={HEAD_F} material={HUMAN_MATERIAL} scale={1.01} />}
      <mesh ref={legL} geometry={P.leg} material={HUMAN_MATERIAL} position={[-HIP_X, HIP_Y, 0]} />
      <mesh ref={legR} geometry={P.leg} material={HUMAN_MATERIAL} position={[HIP_X, HIP_Y, 0]} />
      <mesh ref={armL} geometry={P.arm} material={HUMAN_MATERIAL} position={[-SHOULDER_X, SHOULDER_Y, 0]} />
      <mesh ref={armR} geometry={P.arm} material={HUMAN_MATERIAL} position={[SHOULDER_X, SHOULDER_Y, 0]} />
    </group>
  );
};
