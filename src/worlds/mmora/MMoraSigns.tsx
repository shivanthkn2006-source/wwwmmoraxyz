/**
 * M'Mora World street signs (same 7 ft / 2.13 m standard as the Real Map),
 * small herb glows on outdoor herbs, and a blue beacon over the portal home.
 */
import React, { useEffect } from 'react';
import { setSolidGroup, boxPoly } from '@/lib/vrSolids';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { RETURN_PORTAL_POS } from '@/worlds/worldMode';

const POLE = new THREE.MeshStandardMaterial({ color: '#9aa0a6', metalness: 0.6, roughness: 0.4 });
const BOARD = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.6 });
const PORTAL_GLOW = new THREE.MeshBasicMaterial({ color: '#387BF6', transparent: true, opacity: 0.45, depthWrite: false });

/** [x, z, rotY, name] — at the crossings between the houses. */
export const MMORA_SIGNS: [number, number, number, string][] = [
  [8, 2, 0, 'Doorway Street'], [-14, -8, Math.PI / 2, 'Herb Lane'], [24, 12, 0, 'Coin Row'],
  [-12, 20, Math.PI / 2, 'Lantern Way'], [10, -26, 0, 'Relic Road'], [34, -2, Math.PI / 2, 'East Gate'],
  [-34, -6, Math.PI / 2, 'West Gate'], [4, 32, 0, 'North Square'],
];

export const StreetSign7ft: React.FC<{ x: number; z: number; rot: number; text: string }> = ({ x, z, rot, text }) => {
  useEffect(() => { const key = `sign:${text}:${x}:${z}`; setSolidGroup(key, [boxPoly(x, z, 0.18, 0.18), { ...boxPoly(x, z, 2.6, 0.12, rot), y0: 1.5, y1: 2.3 }]); return () => setSolidGroup(key, null); }, [x, z, rot, text]);
  return (
  <group position={[x, 0, z]} rotation={[0, rot, 0]}>
    <mesh position={[0, 1.065, 0]} material={POLE}><cylinderGeometry args={[0.06, 0.06, 2.13, 6]} /></mesh>
    <mesh position={[0, 1.88, 0]} material={BOARD}><boxGeometry args={[2.6, 0.5, 0.06]} /></mesh>
    <Html position={[0, 1.88, 0.05]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div className="vr-street-sign">{text}</div>
    </Html>
  </group>
); };

export const MMoraSigns: React.FC = () => (
  <group>
    {MMORA_SIGNS.map(([x, z, r, t]) => <StreetSign7ft key={t} x={x} z={z} rot={r} text={t} />)}
    <mesh position={[RETURN_PORTAL_POS[0], 9, RETURN_PORTAL_POS[2]]} material={PORTAL_GLOW}>
      <cylinderGeometry args={[0.5, 0.5, 12, 10, 1, true]} />
    </mesh>
  </group>
);
export default MMoraSigns;
