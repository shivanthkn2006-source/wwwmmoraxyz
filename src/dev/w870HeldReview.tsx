/** Localhost-only disposable visual review, deliberately signed out. No save hosts. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';

async function start() {
  if (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(location.hostname)) return;
  // Seed only this disposable browser's device state before importing stores.
  localStorage.setItem('vr-gear-equipped', '["w870"]');
  localStorage.setItem('vr-third-person', '1');
  const { ThirdPersonAvatar } = await import('@/components/vr/ThirdPersonAvatar');
  const { setChunkStats } = await import('@/worlds/worldMode');
  setChunkStats(1, 1);
  const el = document.getElementById('r');
  if (!el) return;
  const view = new URLSearchParams(location.search).get('view');
  const { avatarMotion } = await import('@/lib/vrAvatarMotion');
  avatarMotion.pose = view === 'walk' ? 'walking' : 'idle';
  function Review() {
    useFrame(({ camera, clock }) => {
      // The production camera remains untouched. Move only fixture camera to check walking pose.
      camera.position.x = view === 'walk' ? Math.sin(clock.elapsedTime * 2) * 0.3 : 0;
    });
    return <ThirdPersonAvatar />;
  }
  createRoot(el).render(<Canvas style={{ height: '100vh' }} dpr={1} camera={{ position: [0, 2.4, 0], fov: 48 }} onCreated={({ camera, scene }) => {
    camera.rotation.x = -0.2;
    (window as unknown as Record<string, unknown>).__held = { camera, scene };
  }}>
    <color attach="background" args={['#777d82']} />
    <ambientLight intensity={0.65} />
    <directionalLight position={[3, 5, -1]} intensity={3} />
    <Environment><Lightformer intensity={3} position={[0, 3, 2]} scale={4} /><Lightformer intensity={2} position={[-2, 1, 0]} rotation-y={Math.PI / 2} scale={3} /></Environment>
    <Review />
  </Canvas>);
}
void start();