/**
 * Spore fog: once the Lord's Crest is taken, a green spore cloud fills the
 * core ward around the gate and terminal. Inside it the operative's
 * flashlight switches on by itself (a spotlight following the view), and
 * lingering in the thick centre stings a little health.
 */
import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGear } from '@/lib/vrGear';
import { SPOTS } from './VillageFusePuzzle';
import { playerSpot } from './VillageVillagers';

const C = SPOTS.terminal; const R = 16;
const PUFFS = Array.from({ length: 14 }, (_, i) => { const a = i * 2.4, r = 3 + (i * 7) % 12; return [C[0] + Math.cos(a) * r, 1 + (i % 3) * 0.8, C[1] + 4 + Math.sin(a) * r] as const; });
const FOG = new THREE.MeshBasicMaterial({ color: '#7fae6a', transparent: true, opacity: 0.16, depthWrite: false });

export const VillageSporeFog: React.FC = () => {
  const owned = useGear();
  return owned.includes('crest') ? <Fog /> : null;
};

const Fog: React.FC = () => {
  const { camera, scene } = useThree();
  const light = useRef<THREE.SpotLight>(null); const sting = useRef(0);
  const target = useRef(new THREE.Object3D());
  useFrame((_, dt) => {
    const ps = playerSpot(camera); const d = Math.hypot(ps.x - C[0], ps.z - (C[1] + 4)); const inside = d < R;
    const l = light.current; if (!l) return;
    if (!target.current.parent) scene.add(target.current);
    l.position.copy(camera.position);
    target.current.position.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(8));
    l.target = target.current; l.intensity = THREE.MathUtils.damp(l.intensity, inside ? 40 : 0, 6, dt);
    if (inside && d < 6) { sting.current -= dt; if (sting.current <= 0) { sting.current = 6; window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: 2 } })); } }
  });
  return (
    <group>
      <spotLight ref={light} angle={0.45} penumbra={0.6} distance={22} intensity={0} color="#fff4d6" />
      {PUFFS.map((p, i) => <mesh key={i} material={FOG} position={p as unknown as [number, number, number]}><sphereGeometry args={[3.2, 10, 8]} /></mesh>)}
    </group>
  );
};
