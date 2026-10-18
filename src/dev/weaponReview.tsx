/** Localhost-only visual fixture. Loads no save tickers and never writes account progress. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { W870Model } from '@/components/vr/features/W870Model';
import { GEAR } from '@/lib/vrGear';
import { GearArt } from '@/components/vr/VRGearArt';
import { supabase } from '@/integrations/supabase/client';

async function start() {
  if (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(location.hostname)) return;
  const { data } = await supabase.auth.getUser();
  if (data.user?.email !== 'village-w870-review-20261018@mmora.xyz') return;
  const el = document.getElementById('r');
  const gear = GEAR.find((g) => g.id === 'w870');
  if (!el || !gear) return;
  createRoot(el).render(<main>
    <Canvas style={{ height: '80vh' }} dpr={1} camera={{ position: [-95.6, 1.28, -18.4], fov: 38 }}>
      <color attach="background" args={['#777d82']} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[-94, 4, -18]} intensity={3} />
      <Environment><Lightformer intensity={2} position={[-96, 4, -20]} scale={4} /><Lightformer intensity={1} position={[-97, 1, -20]} rotation-y={Math.PI / 2} scale={3} /></Environment>
      <group position={gear.pos}><W870Model /></group>
      <OrbitControls target={[-96, 0.9, -20]} enablePan={false} />
    </Canvas>
    <div aria-label="W-870 inventory artwork" style={{ width: 260, height: 100, margin: '20px auto' }}><GearArt id="w870" /></div>
  </main>);
}
void start();
