import React, { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import LeonCharacterModel from './LeonCharacterModel';
import HelenaCharacterModel from './HelenaCharacterModel';
import PartyCharacterModel from './PartyCharacterModel';
import type { VRAvatarVariant } from '@/hooks/useVRAvatarProfile';

export type AvatarAnimState = 'idle' | 'walking' | 'running' | 'sitting' | 'jumping';

interface RealisticHumanoidAvatarProps {
  position: THREE.Vector3;
  rotation: number;
  animState: AvatarAnimState;
  displayName?: string;
  isLocalPlayer?: boolean;
  avatarVariant?: VRAvatarVariant;
}

const AvatarFallback: React.FC = () => (
  <group>
    <mesh position={[0, 0.95, 0]}>
      <capsuleGeometry args={[0.24, 1.15, 6, 10]} />
      <meshStandardMaterial color="#59606e" roughness={0.75} metalness={0.15} />
    </mesh>
    <mesh position={[0, 1.78, 0]}>
      <sphereGeometry args={[0.18, 14, 14]} />
      <meshStandardMaterial color="#c7a080" roughness={0.7} />
    </mesh>
  </group>
);

export const RealisticHumanoidAvatar: React.FC<RealisticHumanoidAvatarProps> = ({
  position,
  rotation,
  animState,
  displayName = '@player',
  isLocalPlayer = false,
  avatarVariant = 'male',
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const modelPoseRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!rootRef.current || !modelPoseRef.current) return;

    const t = state.clock.elapsedTime;
    const isWalking = animState === 'walking';
    const isRunning = animState === 'running';

    const bob = isRunning
      ? Math.sin(t * 10) * 0.035
      : isWalking
        ? Math.sin(t * 6.5) * 0.02
        : animState === 'idle'
          ? Math.sin(t * 1.6) * 0.008
          : 0;

    rootRef.current.position.copy(position);
    rootRef.current.position.y += bob;
    rootRef.current.rotation.y = rotation;

    modelPoseRef.current.rotation.x = animState === 'sitting' ? -0.18 : 0;
    modelPoseRef.current.rotation.z = isRunning
      ? Math.sin(t * 10) * 0.02
      : isWalking
        ? Math.sin(t * 6.5) * 0.012
        : 0;
  });

  return (
    <group ref={rootRef}>
      <group
        ref={modelPoseRef}
        position={[0, animState === 'sitting' ? -0.28 : 0, 0]}
        rotation={[0, 0, 0]}
        scale={[1, 1, 1]}
      >
        <Suspense fallback={<AvatarFallback />}>
          {avatarVariant === 'female' ? (
            <HelenaCharacterModel pose={animState === 'sitting' ? 'riding' : 'standing'} targetHeight={1.72} />
          ) : avatarVariant === 'party-male' ? (
            <PartyCharacterModel animState={animState} pose={animState === 'sitting' ? 'riding' : 'standing'} targetHeight={1.78} />
          ) : (
            <LeonCharacterModel
              pose={animState === 'sitting' ? 'riding' : 'standing'}
              targetHeight={1.78}
            />
          )}
        </Suspense>
      </group>

      <Html
        position={[0, 2.15, 0]}
        center
        sprite
        zIndexRange={[10, 0]}
        occlude={false}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '2px 6px',
            borderRadius: 9999,
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: 10,
            lineHeight: 1,
            fontWeight: 500,
            letterSpacing: 0.2,
            whiteSpace: 'nowrap',
            border: '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(4px)',
            transform: 'translateZ(0)',
          }}
        >
          {displayName}
        </span>
      </Html>
    </group>
  );
};

export default RealisticHumanoidAvatar;