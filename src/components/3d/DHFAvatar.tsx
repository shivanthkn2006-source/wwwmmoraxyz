// ═══════════════════════════════════════════════════════════════════════════════
// DHF AVATAR — Draco-compressed, thermal-safe 3D avatar scene
// Draco decoding runs in a Web Worker (main thread stays free). DPR is clamped
// on mobile so the GPU never runs hot, and the whole scene is only ever mounted
// through SafeCanvasWrapper (viewport + capability + thermal gated).
// ═══════════════════════════════════════════════════════════════════════════════

import { WebGLBoundary } from '@/components/3d/WebGLBoundary';
import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Environment, Lightformer } from '@react-three/drei';

const DEFAULT_MODEL = '/models/avatar-draco.glb';
const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

export function DHFAvatar({ src = DEFAULT_MODEL, scale = 1 }: { src?: string; scale?: number }) {
  const { scene } = useGLTF(src, DRACO_DECODER);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} scale={scale} position={[0, -1, 0]} />;
}

/** Mobile / low-power devices cap at 1x; desktop tops out at 1.5x. */
export const resolveDpr = (isMobile: boolean): [number, number] =>
  isMobile ? [1, 1] : [1, 1.5];

export interface AvatarSceneProps {
  src?: string;
  scale?: number;
}

export default function AvatarScene({ src = DEFAULT_MODEL, scale = 1 }: AvatarSceneProps) {
  const isMobile =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(max-width: 768px)').matches ||
      (navigator.hardwareConcurrency ?? 8) < 6);

  return (
    <WebGLBoundary moduleName="dhf-avatar" className="h-full w-full">
      <Canvas
        dpr={resolveDpr(isMobile)}
        camera={{ position: [0, 0.6, 3.2], fov: 40 }}
        gl={{ antialias: !isMobile, powerPreference: 'low-power' }}
        frameloop="demand"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} />
        <Environment>
          <Lightformer intensity={2} position={[0, 4, 2]} scale={[8, 8, 1]} />
          <Lightformer
            intensity={1}
            color="#8bb"
            position={[-4, 1, -1]}
            rotation-y={Math.PI / 2}
            scale={[14, 1, 1]}
          />
        </Environment>
        <Suspense fallback={null}>
          <DHFAvatar src={src} scale={scale} />
        </Suspense>
      </Canvas>
    </WebGLBoundary>
  );
}

// Warm the compressed asset only when this chunk is actually requested.
useGLTF.preload(DEFAULT_MODEL, DRACO_DECODER);
