/** Dev-only visual check of the M'Mora Village scenery (not part of the production build). */
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { VillageLook } from '@/worlds/mmora/VillageLook';
import { PickupHouses } from '@/worlds/mmora/PickupHouses';
const q = new URLSearchParams(location.search);
const pos = (q.get('cam') || '0,1.7,20').split(',').map(Number) as [number, number, number];
const look = (q.get('look') || '0,2,-60').split(',').map(Number) as [number, number, number];
createRoot(document.getElementById('r')!).render(
  <Canvas camera={{ position: pos, fov: 70, far: 600 }} onCreated={({ camera, gl, scene }) => {
    camera.lookAt(...look);
    (window as unknown as Record<string, unknown>).__vp = { gl, scene, camera };
  }}>
    <Suspense fallback={null}><VillageLook /><PickupHouses /></Suspense>
  </Canvas>,
);
