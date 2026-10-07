/**
 * Beach on the north edge of M'Mora World: sand, gentle sea, beach benches
 * (in MMoraBenches) with lamps, and at night a full moon whose light spreads
 * across the water. ~6 meshes, no textures or downloads.
 */
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useNight } from '@/components/vr/NightMode';

export const BEACH_Z = -62;   // where the sand starts
export const SHORE_Z = -82;   // where the water starts

const SEA = new THREE.MeshStandardMaterial({ color: '#2f7ea6', roughness: 0.25, metalness: 0.2, transparent: true, opacity: 0.92 });

export const MMoraBeach: React.FC = () => {
  const { night } = useNight();
  const sea = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (sea.current) sea.current.position.y = 0.02 + Math.sin(clock.elapsedTime * 0.8) * 0.04;
  });
  SEA.color.set(night ? '#0f2a40' : '#2f7ea6');
  return (
    <group>
      {/* Sand */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, (BEACH_Z + SHORE_Z) / 2]}>
        <planeGeometry args={[400, BEACH_Z - SHORE_Z]} />
        <meshStandardMaterial color={night ? '#8d826c' : '#e6d3a3'} roughness={1} />
      </mesh>
      {/* Wet shoreline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, SHORE_Z + 1.5]}>
        <planeGeometry args={[400, 3]} />
        <meshStandardMaterial color={night ? '#5e5648' : '#bfa978'} roughness={0.6} />
      </mesh>
      {/* Sea */}
      <mesh ref={sea} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, SHORE_Z - 100]} material={SEA}>
        <planeGeometry args={[400, 200]} />
      </mesh>
      {night && (
        <>
          {/* Full moon over the sea */}
          <mesh position={[0, 70, SHORE_Z - 180]}>
            <sphereGeometry args={[12, 24, 16]} />
            <meshBasicMaterial color="#fbf6e4" fog={false} />
          </mesh>
          <mesh position={[0, 70, SHORE_Z - 181]}>
            <sphereGeometry args={[20, 16, 12]} />
            <meshBasicMaterial color="#f4ecc8" transparent opacity={0.12} depthWrite={false} fog={false} />
          </mesh>
          {/* Moonlight path spreading across the water */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, SHORE_Z - 90]}>
            <planeGeometry args={[14, 180]} />
            <meshBasicMaterial color="#f6eecb" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <directionalLight position={[0, 70, SHORE_Z - 180]} intensity={0.45} color="#cfdcff" />
        </>
      )}
    </group>
  );
};
