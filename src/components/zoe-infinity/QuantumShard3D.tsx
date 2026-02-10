// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM SHARD - The Holographic 3D Crystal for Genesis Imprint
// Year 2120 Authentication Artifact - "Touch the Shard to Resonate"
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

type ShardState = 'locked' | 'scanning' | 'unlocked' | 'error';

interface CrystalCoreProps {
  state: ShardState;
  onTouch?: () => void;
}

// The actual 3D crystal mesh
const CrystalCore: React.FC<CrystalCoreProps> = ({ state, onTouch }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const { camera } = useThree();
  
  // State-based colors
  const stateColors = useMemo(() => ({
    locked: { primary: '#ff3366', glow: '#ff0044', intensity: 2 },
    scanning: { primary: '#00ffff', glow: '#00ccff', intensity: 8 },
    unlocked: { primary: '#00ff88', glow: '#00ffaa', intensity: 6 },
    error: { primary: '#ff4444', glow: '#ff0000', intensity: 4 },
  }), []);
  
  const currentColors = stateColors[state];
  
  // Animation based on state
  useFrame((frameState, delta) => {
    if (!meshRef.current) return;
    
    // Base rotation
    const baseSpeed = state === 'scanning' ? 3 : state === 'locked' ? 0.3 : 0.8;
    meshRef.current.rotation.y += delta * baseSpeed;
    
    // Vertical oscillation
    const time = frameState.clock.elapsedTime;
    meshRef.current.position.y = Math.sin(time * (state === 'scanning' ? 4 : 1.5)) * 0.1;
    
    // Pulsing scale for scanning
    if (state === 'scanning') {
      const pulse = 1 + Math.sin(time * 8) * 0.05;
      meshRef.current.scale.setScalar(pulse);
    } else if (state === 'unlocked') {
      // Explosion effect - scale up briefly
      const scale = meshRef.current.scale.x;
      if (scale < 1.3) {
        meshRef.current.scale.setScalar(scale + delta * 2);
      }
    } else {
      meshRef.current.scale.setScalar(1);
    }
    
    // Glow pulsing
    if (glowRef.current) {
      glowRef.current.intensity = currentColors.intensity + Math.sin(time * 3) * 2;
    }
  });
  
  // Crystal geometry - octahedron for diamond-like appearance
  const crystalGeometry = useMemo(() => {
    const geo = new THREE.OctahedronGeometry(1, 2);
    return geo;
  }, []);
  
  return (
    <group>
      {/* Core Crystal */}
      <Float 
        speed={state === 'scanning' ? 4 : 2} 
        rotationIntensity={state === 'scanning' ? 2 : 0.5}
        floatIntensity={state === 'scanning' ? 1 : 0.5}
      >
        <mesh
          ref={meshRef}
          geometry={crystalGeometry}
          onClick={onTouch}
          onPointerDown={onTouch}
        >
          <MeshTransmissionMaterial
            backside
            samples={16}
            thickness={0.5}
            chromaticAberration={state === 'scanning' ? 0.5 : 0.1}
            anisotropy={0.3}
            distortion={state === 'scanning' ? 1 : 0.2}
            distortionScale={0.5}
            temporalDistortion={state === 'scanning' ? 0.5 : 0.1}
            color={currentColors.primary}
            attenuationColor={currentColors.glow}
            attenuationDistance={0.5}
            transmissionSampler
          />
        </mesh>
        
        {/* Inner glow core */}
        <pointLight
          ref={glowRef}
          color={currentColors.glow}
          intensity={currentColors.intensity}
          distance={5}
        />
      </Float>
      
      {/* Energy rings for scanning state */}
      {state === 'scanning' && (
        <>
          <EnergyRing delay={0} color={currentColors.glow} />
          <EnergyRing delay={0.5} color={currentColors.glow} />
          <EnergyRing delay={1} color={currentColors.glow} />
        </>
      )}
      
      {/* Shatter particles for unlocked state */}
      {state === 'unlocked' && <ShatterParticles color={currentColors.glow} />}
    </group>
  );
};

// Energy ring that expands outward during scanning
const EnergyRing: React.FC<{ delay: number; color: string }> = ({ delay, color }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!ringRef.current) return;
    const time = (state.clock.elapsedTime + delay) % 2;
    const scale = 0.5 + time * 1.5;
    const opacity = 1 - time / 2;
    
    ringRef.current.scale.setScalar(scale);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
  });
  
  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1, 64]} />
      <meshBasicMaterial color={color} transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Particle explosion for unlock state
const ShatterParticles: React.FC<{ color: string }> = ({ color }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 100;
  
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      // Start at center
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      
      // Random outward velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 3;
      
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vel[i * 3 + 1] = Math.cos(phi) * speed;
      vel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }
    
    return [pos, vel];
  }, []);
  
  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += velocities[i * 3] * delta;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.05} transparent opacity={0.8} />
    </points>
  );
};

// Main exported component
interface QuantumShardProps {
  state: ShardState;
  onTouch?: () => void;
  className?: string;
}

export const QuantumShard: React.FC<QuantumShardProps> = ({ state, onTouch, className }) => {
  return (
    <div className={`w-full h-full ${className || ''}`}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance'
        }}
        dpr={[1, 2]}
      >
        {/* Ambient lighting */}
        <ambientLight intensity={0.2} />
        
        {/* Directional light for highlights */}
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        
        {/* Environment for reflections */}
        <Environment preset="night" />
        
        {/* The Crystal */}
        <CrystalCore state={state} onTouch={onTouch} />
        
        {/* Shadow beneath crystal */}
        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.4}
          scale={5}
          blur={2}
          far={3}
          color={state === 'scanning' ? '#00ffff' : state === 'error' ? '#ff0000' : '#ffffff'}
        />
      </Canvas>
    </div>
  );
};

export default QuantumShard;
