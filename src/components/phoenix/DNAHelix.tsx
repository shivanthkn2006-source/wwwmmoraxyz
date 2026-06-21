// ═══════════════════════════════════════════════════════════════════════════════
// DNA HELIX - 3D Light Particle Visualization
// The Sacred Upload Visualization
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

interface DNAHelixProps {
  isSyncing: boolean;
  progress: number;
  isComplete: boolean;
}

const HelixStrand: React.FC<{ 
  offset: number; 
  isSyncing: boolean; 
  progress: number;
  color: string;
}> = ({ offset, isSyncing, progress, color }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const particles = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const count = 40;
    
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const angle = t * Math.PI * 6 + offset;
      const radius = 0.8;
      const y = (t - 0.5) * 6;
      
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      ));
    }
    
    return points;
  }, [offset]);

  useFrame((state) => {
    if (groupRef.current) {
      const speed = isSyncing ? 0.5 : 0.1;
      groupRef.current.rotation.y += speed * 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((pos, i) => {
        const visible = isSyncing ? i < (progress / 100) * particles.length : true;
        const scale = isSyncing && i >= (progress / 100) * particles.length ? 0.3 : 1;
        
        return (
          <mesh key={i} position={pos} scale={scale}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={visible ? 2 : 0.2}
              transparent
              opacity={visible ? 1 : 0.3}
            />
          </mesh>
        );
      })}
      
      {/* Connection bars */}
      {particles.filter((_, i) => i % 4 === 0).map((pos, i) => (
        <mesh key={`bar-${i}`} position={pos}>
          <cylinderGeometry args={[0.02, 0.02, 1.6, 8]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.5}
            transparent
            opacity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
};

const GoldenAvatar: React.FC<{ visible: boolean }> = ({ visible }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && visible) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.05);
    }
  });

  if (!visible) return null;

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        <dodecahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={1.5}
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>
      <Sparkles
        count={100}
        scale={3}
        size={3}
        speed={0.5}
        color="#FFD700"
      />
    </Float>
  );
};

const Scene: React.FC<DNAHelixProps> = ({ isSyncing, progress, isComplete }) => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#FFD700" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4169E1" />
      
      {!isComplete && (
        <>
          <HelixStrand offset={0} isSyncing={isSyncing} progress={progress} color="#FFD700" />
          <HelixStrand offset={Math.PI} isSyncing={isSyncing} progress={progress} color="#4169E1" />
        </>
      )}
      
      <GoldenAvatar visible={isComplete} />
      
      <Sparkles
        count={50}
        scale={8}
        size={2}
        speed={0.3}
        color="#ffffff"
        opacity={0.5}
      />
    </>
  );
};

export const DNAHelix: React.FC<DNAHelixProps> = (props) => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene {...props} />
      </Canvas>
    </div>
  );
};
