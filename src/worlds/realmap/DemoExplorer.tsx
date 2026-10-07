/**
 * @demo_explorer — a clearly labelled demo player walking a 25 m loop near the
 * player's start spot, so multiplayer visibility can be checked solo.
 * Shown to everyone (owner's choice); it is labelled "demo" so nobody
 * mistakes it for a real member.
 */
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { humanGeometry, HUMAN_MATERIAL } from '@/lib/vrHumanLook';

const PERSON = humanGeometry();

export const DEMO_RADIUS = 25;

export function demoPosition(t: number): [number, number] {
  const a = t * 0.12; // ≈ walking pace on a 25 m circle
  return [Math.cos(a) * DEMO_RADIUS, Math.sin(a) * DEMO_RADIUS];
}

export const DemoExplorer: React.FC = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const [x, z] = demoPosition(t);
    const [nx, nz] = demoPosition(t + 0.1);
    ref.current.position.set(x, 0, z);
    ref.current.rotation.y = Math.atan2(nx - x, nz - z);
  });
  return (
    <group ref={ref}>
      <mesh geometry={PERSON} material={HUMAN_MATERIAL} />
      <Html position={[0, 2.4, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <div className="surface-warm-tan rounded-full px-2 py-0.5 text-[10px] whitespace-nowrap text-white">@demo_explorer · demo</div>
      </Html>
    </group>
  );
};
