/** Dev-only visual check of the realistic third-person avatar (not part of the production build). */
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { ThirdPersonAvatar } from '@/components/vr/ThirdPersonAvatar';
import { enterMMora } from '@/worlds/worldMode';
import LeonCharacterModel from '@/components/vr/features/LeonCharacterModel';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/** Load a GLB, auto-fit to ~1.78 m and ground at y=0. */
const GlbProbe: React.FC<{ url: string }> = ({ url }) => {
  const { scene } = useGLTF(url);
  const model = React.useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3(); box.getSize(size);
    const s = 1.78 / Math.max(size.y, 0.0001);
    const ctr = new THREE.Vector3(); box.getCenter(ctr);
    c.scale.setScalar(s);
    c.position.set(-ctr.x * s, -box.min.y * s, -ctr.z * s);
    return c;
  }, [scene]);
  return <primitive object={model} />;
};

// The avatar only shows inside the village world.
enterMMora([0, 1.6, 6]);

const q = new URLSearchParams(location.search);
const pos = (q.get('cam') || '0,1.7,4').split(',').map(Number) as [number, number, number];
const look = (q.get('look') || '0,1.2,-2.8').split(',').map(Number) as [number, number, number];

createRoot(document.getElementById('r')!).render(
  <Canvas camera={{ position: pos, fov: 60, far: 600 }} onCreated={({ camera, gl, scene }) => {
    camera.lookAt(...look);
    (window as unknown as Record<string, unknown>).__vp = { gl, scene, camera };
  }}>
    <ambientLight intensity={0.9} />
    <directionalLight position={[3, 6, 4]} intensity={1.4} />
    <directionalLight position={[-4, 3, -3]} intensity={0.5} color="#bcd" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#3a3f36" roughness={1} />
    </mesh>
    <Suspense fallback={null}>
      {q.get('raw') === '1' ? <LeonCharacterModel pose="standing" targetHeight={1.78} />
        : q.get('glb') ? <GlbProbe url={`/src/assets/models/${q.get('glb')}`} />
        : <ThirdPersonAvatar />}
    </Suspense>
  </Canvas>,
);
