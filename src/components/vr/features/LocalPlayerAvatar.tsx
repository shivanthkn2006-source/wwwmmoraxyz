// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL PLAYER AVATAR - "Me" Avatar for VR World
// Shows the user's own avatar with "Me" label + Zoe Orb that follows them
// PROTOCOL PHANTOM: Integrates with Ghost Mode for battery savings
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { dispatchVRSpeaking, dispatchVRSpeakingEnd } from '@/hooks/useVRSpeakingToOrb';
import { speakAsZoe } from '@/utils/zoeVoice';
import { usePhantomVisible } from '@/stores/usePhantomStore';

interface LocalPlayerAvatarProps {
  displayName?: string;
}

// Zoe Orb that follows the player in 3D space
const ZoeOrbFollower: React.FC<{ playerRef: React.RefObject<THREE.Group> }> = ({ playerRef }) => {
  const orbRef = useRef<THREE.Group>(null);
  const targetPosition = useRef(new THREE.Vector3(1.5, 2, 0));
  const glowRef = useRef<THREE.Mesh>(null);
  const isListening = useRef(false);
  const tempForward = useRef(new THREE.Vector3());
  const tempRight = useRef(new THREE.Vector3());
  const tempTarget = useRef(new THREE.Vector3());
  const { camera } = useThree();
  
  // PROTOCOL PHANTOM: Check ghost mode
  const isPhantomVisible = usePhantomVisible();

  // Keep orb in front of camera so orientation is always clear to user
  useFrame((state) => {
    if (!orbRef.current || !playerRef.current) return;

    const time = state.clock.elapsedTime;

    tempForward.current.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    tempRight.current.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();

    // Front-right conversational anchor in camera space
    const forwardOffset = 1.25;
    const sideOffset = 0.75;
    const verticalOffset = 0.15 + (isPhantomVisible ? Math.sin(time * 1.2) * 0.08 : 0);

    tempTarget.current
      .copy(camera.position)
      .addScaledVector(tempForward.current, forwardOffset)
      .addScaledVector(tempRight.current, sideOffset);
    tempTarget.current.y += verticalOffset;

    targetPosition.current.copy(tempTarget.current);
    orbRef.current.position.lerp(targetPosition.current, isPhantomVisible ? 0.14 : 0.3);

    // Lightweight pulse only when visible to save GPU
    if (glowRef.current) {
      const pulse = isPhantomVisible ? Math.sin(time * 2.2) * 0.08 + 0.92 : 0.88;
      glowRef.current.scale.setScalar(pulse);
      if (isPhantomVisible) {
        glowRef.current.rotation.y += 0.012;
      }
    }
  });

  // Click to talk to Zoe
  const handleClick = () => {
    isListening.current = !isListening.current;
    const orbPos = orbRef.current?.position || new THREE.Vector3(0, 2, 0);

    if (isListening.current) {
      dispatchVRSpeaking({
        speakerId: 'zoe-orb',
        speakerType: 'character',
        speakerName: 'Zoe Orb',
        worldPosition: { x: orbPos.x, y: orbPos.y, z: orbPos.z },
        isSpeaking: true
      });
      speakAsZoe('I am in front of you. Ask for satellite view, mountains, or summit view and I will guide you.');
    } else {
      dispatchVRSpeakingEnd('zoe-orb');
      speakAsZoe('Voice guide paused. Tap me anytime to continue exploring.');
    }
  };

  return (
    <group ref={orbRef} onClick={handleClick}>
      {/* Main Orb - Glass sphere with Zoe consciousness */}
      <mesh>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshPhysicalMaterial
          color="#00d4ff"
          metalness={0.1}
          roughness={0.1}
          transmission={0.9}
          thickness={0.5}
          transparent
          opacity={0.8}
          envMapIntensity={2}
        />
      </mesh>

      {/* Inner core - pulsing energy */}
      <mesh ref={glowRef} scale={0.6}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Outer glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.25, 32]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Zoe Label */}
      <Html
        position={[0, 0.35, 0]}
        center
         distanceFactor={30}
         occlude={false}
         style={{ pointerEvents: 'none' }}
       >
         <div 
           className="px-1 py-0 rounded-full backdrop-blur-sm text-center whitespace-nowrap"
           style={{
             backgroundColor: 'rgba(0, 212, 255, 0.2)',
             border: '1px solid rgba(0, 212, 255, 0.4)',
             boxShadow: '0 0 6px rgba(0, 212, 255, 0.3)',
           }}
         >
           <span className="text-[4px] font-mono font-bold text-cyan-300">
            ZOE ✦
          </span>
        </div>
      </Html>
    </group>
  );
};

// Main Local Player Avatar Component
export const LocalPlayerAvatar: React.FC<LocalPlayerAvatarProps> = ({ 
  displayName = 'Me' 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  
  // PROTOCOL PHANTOM: Check ghost mode for reduced rendering
  const isPhantomVisible = usePhantomVisible();

  // Avatar follows camera position (first-person view representation)
  useFrame(() => {
    if (!groupRef.current) return;
    
    // Position avatar at camera location (slightly below for visibility)
    groupRef.current.position.copy(camera.position);
    groupRef.current.position.y -= 1.2; // Below camera eye level
    
    // Rotate to match camera direction
    groupRef.current.rotation.y = camera.rotation.y;
  });

  // Role-based glow color for "Me"
  const meColor = '#00ff88'; // Green for local player

  // PROTOCOL PHANTOM: Reduce Float animation intensity in ghost mode
  const floatSpeed = isPhantomVisible ? 1.2 : 0;
  const floatIntensity = isPhantomVisible ? 0.2 : 0;
  const rotationIntensity = isPhantomVisible ? 0.1 : 0;

  return (
    <>
      <Float 
        speed={floatSpeed} 
        rotationIntensity={rotationIntensity} 
        floatIntensity={floatIntensity}
      >
        <group ref={groupRef}>
          {/* Glass Pyramid Body - Same style as other players */}
          <mesh ref={meshRef} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.3, 0.6, 4]} />
            <meshPhysicalMaterial
              color={meColor}
              metalness={0.9}
              roughness={0.1}
              transmission={0.6}
              thickness={0.5}
              transparent
              opacity={0.7}
              envMapIntensity={1}
            />
          </mesh>

          {/* Inner Glow Core */}
          <mesh scale={0.5}>
            <octahedronGeometry args={[0.15, 0]} />
            <meshBasicMaterial
              color={meColor}
              transparent
              opacity={0.8}
            />
          </mesh>

          {/* Outer Glow Shell */}
          <mesh scale={1.3}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshBasicMaterial
              color={meColor}
              transparent
              opacity={0.2}
              side={THREE.BackSide}
            />
          </mesh>

          {/* "Me" Name Tag */}
          <Html
            position={[0, 0.8, 0]}
            center
            distanceFactor={8}
            occlude={false}
            style={{ pointerEvents: 'none' }}
          >
            <div 
              className="px-3 py-1 rounded-full backdrop-blur-sm text-center whitespace-nowrap"
              style={{
                backgroundColor: 'rgba(0, 255, 136, 0.3)',
                border: '2px solid rgba(0, 255, 136, 0.8)',
                boxShadow: '0 0 15px rgba(0, 255, 136, 0.6)',
              }}
            >
              <span 
                className="text-[12px] font-mono font-bold"
                style={{ color: '#00ff88' }}
              >
                {displayName}
              </span>
              <span className="ml-1 text-[10px] text-green-300">★</span>
            </div>
          </Html>

          {/* Connection Lines (holographic effect) */}
          {[0, 1, 2, 3].map((i) => (
            <mesh 
              key={i} 
              position={[0, -0.3, 0]} 
              rotation={[0, (Math.PI / 2) * i, 0]}
            >
              <boxGeometry args={[0.02, 0.4, 0.02]} />
              <meshBasicMaterial
                color={meColor}
                transparent
                opacity={0.4}
              />
            </mesh>
          ))}
        </group>
      </Float>

      {/* Zoe Orb Companion - Follows the player */}
      <ZoeOrbFollower playerRef={groupRef} />
    </>
  );
};

export default LocalPlayerAvatar;
