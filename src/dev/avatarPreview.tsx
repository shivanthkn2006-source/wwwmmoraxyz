/** Dev-only visual check of the realistic third-person avatar (not part of the production build). */
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { ThirdPersonAvatar } from '@/components/vr/ThirdPersonAvatar';
import { enterMMora } from '@/worlds/worldMode';

// The avatar only shows inside the village world.
enterMMora([0, 1.6, 6]);

const q = new URLSearchParams(location.search);
const pos = (q.get('cam') || '0,1.7,4').split(',').map(Number) as [number, number, number];
const look = (q.get('look') || '0,1.2,-2.8').split(',').map(Number) as [number, number, number];

createRoot(document.getElementById('r')!).render(
  <Canvas camera={{ position: pos, fov: 60, far: 600 }} onCreated={({ camera }) => camera.lookAt(...look)}>
    <ambientLight intensity={0.9} />
    <directionalLight position={[3, 6, 4]} intensity={1.4} />
    <directionalLight position={[-4, 3, -3]} intensity={0.5} color="#bcd" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#3a3f36" roughness={1} />
    </mesh>
    <Suspense fallback={null}>
      <ThirdPersonAvatar />
    </Suspense>
  </Canvas>,
);
