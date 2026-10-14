/** The hooded merchant hiding behind the trees at the village edge (Use → shop). */
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { boxPoly, setSolidGroup } from '@/lib/vrSolids';

export const MERCHANT_POS: [number, number, number] = [-52, 0, 30];

export const VillageMerchant: React.FC = () => {
  const { camera } = useThree();
  const lamp = useRef<THREE.PointLight>(null);
  const M = useMemo(() => ({
    coat: new THREE.MeshStandardMaterial({ color: '#2a2a33', roughness: 1 }),
    hood: new THREE.MeshStandardMaterial({ color: '#1b1b20', roughness: 1 }),
    eye: new THREE.MeshBasicMaterial({ color: '#ffd76a' }),
    crate: new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 0.95 }),
    glass: new THREE.MeshStandardMaterial({ color: '#ffcf7a', emissive: '#ffb347', emissiveIntensity: 1.6 }),
  }), []);
  useEffect(() => {
    setSolidGroup('merchant', [boxPoly(MERCHANT_POS[0] - 1.2, MERCHANT_POS[2], 1, 1.4)]);
    return () => setSolidGroup('merchant', null);
  }, []);
  useEffect(() => registerUse(() => {
    const d = Math.hypot(camera.position.x - MERCHANT_POS[0], camera.position.z - MERCHANT_POS[2]);
    if (d > 3) return null;
    return { dist: d, reach: 3, label: 'Trade with the merchant', run: () => window.dispatchEvent(new CustomEvent('vr-merchant-open')) };
  }), [camera]);
  useFrame(({ clock }) => { if (lamp.current) lamp.current.intensity = 1.4 + Math.sin(clock.elapsedTime * 7) * 0.2; });
  return (
    <group position={MERCHANT_POS} rotation={[0, Math.PI / 2, 0]}>
      <mesh material={M.coat} position={[0, 0.8, 0]}><coneGeometry args={[0.45, 1.6, 12]} /></mesh>
      <mesh material={M.hood} position={[0, 1.72, 0]}><sphereGeometry args={[0.24, 12, 10]} /></mesh>
      <mesh material={M.eye} position={[-0.07, 1.74, 0.21]}><sphereGeometry args={[0.025, 6, 6]} /></mesh>
      <mesh material={M.eye} position={[0.07, 1.74, 0.21]}><sphereGeometry args={[0.025, 6, 6]} /></mesh>
      <mesh material={M.crate} position={[0, 0.4, -1.2]}><boxGeometry args={[1.4, 0.8, 0.9]} /></mesh>
      <mesh material={M.glass} position={[0.5, 0.95, -1.2]}><sphereGeometry args={[0.12, 10, 8]} /></mesh>
      <pointLight ref={lamp} position={[0.5, 1.1, -1.2]} color="#ffb347" distance={7} intensity={1.4} />
    </group>
  );
};
export default VillageMerchant;
