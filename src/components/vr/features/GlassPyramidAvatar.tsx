// ═══════════════════════════════════════════════════════════════════════════════
// GLASS PYRAMID AVATAR - Enterprise Lightweight Multiplayer Representation
// Floating Glass Pyramid with holographic material + speaking glow effect
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { PlayerPresence } from '@/hooks/useMultiplayerPresence';

interface GlassPyramidAvatarProps {
  player: PlayerPresence;
  isLocalPlayer?: boolean;
}

export const GlassPyramidAvatar: React.FC<GlassPyramidAvatarProps> = ({ 
  player, 
  isLocalPlayer = false 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const speakingIntensityRef = useRef(0);

  // Create pyramid geometry
  const pyramidGeometry = useMemo(() => {
    const geometry = new THREE.ConeGeometry(0.3, 0.6, 4);
    geometry.rotateY(Math.PI / 4); // Align pyramid edges
    return geometry;
  }, []);

  // Role-based colors
  const roleColor = useMemo(() => {
    switch (player.role) {
      case 'admin': return '#ff00ff'; // Magenta for admins
      case 'moderator': return '#00ffff'; // Cyan for moderators
      default: return '#00ff88'; // Green for users
    }
  }, [player.role]);

  useFrame((state) => {
    if (!meshRef.current) return;

    // Gentle floating rotation
    meshRef.current.rotation.y += 0.01;
    
    // Speaking glow effect
    const targetIntensity = player.is_speaking ? 1 : 0;
    speakingIntensityRef.current += (targetIntensity - speakingIntensityRef.current) * 0.1;
    
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.2 + speakingIntensityRef.current * 0.4;
      
      // Pulse when speaking
      if (player.is_speaking) {
        const pulse = Math.sin(state.clock.elapsedTime * 8) * 0.1;
        glowRef.current.scale.setScalar(1.5 + pulse);
      } else {
        glowRef.current.scale.setScalar(1.3);
      }
    }
  });

  // Don't render local player's avatar
  if (isLocalPlayer) return null;

  return (
    <Float 
      speed={1.5} 
      rotationIntensity={0.2} 
      floatIntensity={0.3}
    >
      <group 
        position={[player.position.x, player.position.y + 0.3, player.position.z]}
        rotation={[player.rotation.x, player.rotation.y, player.rotation.z]}
      >
        {/* Main Glass Pyramid */}
        <mesh 
          ref={meshRef}
          geometry={pyramidGeometry}
        >
          <meshPhysicalMaterial
            color={roleColor}
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
            color={roleColor}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Outer Glow Shell - Speaking Indicator */}
        <mesh ref={glowRef} scale={1.3}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshBasicMaterial
            color={player.is_speaking ? '#ffffff' : roleColor}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Connection Lines (holographic effect) */}
        {[0, 1, 2, 3].map((i) => (
          <mesh 
            key={i} 
            position={[0, -0.3, 0]} 
            rotation={[0, (Math.PI / 2) * i, 0]}
          >
            <boxGeometry args={[0.02, 0.4, 0.02]} />
            <meshBasicMaterial
              color={roleColor}
              transparent
              opacity={0.3}
            />
          </mesh>
        ))}

        {/* Display Name Label */}
        <Html
          position={[0, 0.6, 0]}
          center
          distanceFactor={8}
          occlude={false}
          style={{ pointerEvents: 'none' }}
        >
          <div 
            className="px-2 py-0.5 rounded-full backdrop-blur-sm text-center whitespace-nowrap"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: `1px solid ${roleColor}40`,
              boxShadow: player.is_speaking ? `0 0 10px ${roleColor}` : 'none',
            }}
          >
            <span 
              className="text-[10px] font-mono font-medium"
              style={{ color: roleColor }}
            >
              {player.display_name}
            </span>
            {player.role === 'admin' && (
              <span className="ml-1 text-[8px] text-magenta-400">★</span>
            )}
          </div>
        </Html>

        {/* Speaking Indicator Rings */}
        {player.is_speaking && (
          <>
            {[1, 2, 3].map((ring) => (
              <mesh 
                key={ring}
                rotation={[Math.PI / 2, 0, 0]}
                position={[0, 0, 0]}
              >
                <ringGeometry 
                  args={[0.3 + ring * 0.15, 0.32 + ring * 0.15, 32]} 
                />
                <meshBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.3 - ring * 0.08}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ))}
          </>
        )}
      </group>
    </Float>
  );
};

// Multi-player renderer component
interface MultiplayerAvatarsProps {
  players: PlayerPresence[];
  localUserId?: string;
}

export const MultiplayerAvatars: React.FC<MultiplayerAvatarsProps> = ({ 
  players, 
  localUserId 
}) => {
  return (
    <>
      {players.map((player) => (
        <GlassPyramidAvatar
          key={player.user_id}
          player={player}
          isLocalPlayer={player.user_id === localUserId}
        />
      ))}
    </>
  );
};

export default GlassPyramidAvatar;
