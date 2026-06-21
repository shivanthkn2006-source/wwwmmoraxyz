import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGlobeCoordinates, BiomeConfig } from '@/hooks/useGlobeCoordinates';
import type { DeviceTier } from '@/hooks/useDeviceTier';

// ============================================
// CONFIGURATION
// ============================================
const BASE_PARTICLE_COUNT = 2000;
const WEATHER_FADE_SPEED = 0.03;

interface WeatherSystemProps {
  enabled?: boolean;
  debugMode?: boolean;
  particleMultiplier?: number;
  tier?: DeviceTier;
}

// Get adjusted particle count based on tier
const getParticleCount = (tier: DeviceTier, multiplier: number): number => {
  const baseCount = tier === 'C' ? 500 : tier === 'B' ? 1000 : tier === 'A' ? 1500 : BASE_PARTICLE_COUNT;
  return Math.floor(baseCount * multiplier);
};

// ============================================
// SNOW PARTICLES
// ============================================
const SnowParticles: React.FC<{ intensity: number; opacity: number; particleCount: number }> = ({ 
  intensity, 
  opacity, 
  particleCount 
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particleData = useRef<{ positions: Float32Array; velocities: Float32Array; phases: Float32Array }>();
  
  // Initialize particle data
  useMemo(() => {
    const count = Math.floor(particleCount * intensity);
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    const phases = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3;
      positions[i * 3 + 1] = Math.random() * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3 - 1;
      velocities[i] = 0.002 + Math.random() * 0.003;
      phases[i] = Math.random() * Math.PI * 2;
    }
    
    particleData.current = { positions, velocities, phases };
  }, [intensity, particleCount]);
  
  useFrame((state) => {
    if (!meshRef.current || !particleData.current || opacity < 0.01) return;
    
    const { positions, velocities, phases } = particleData.current;
    const time = state.clock.elapsedTime;
    const dummy = new THREE.Object3D();
    const count = Math.floor(particleCount * intensity);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] -= velocities[i];
      
      if (positions[i * 3 + 1] < -1) {
        positions[i * 3 + 1] = 2;
        positions[i * 3] = (Math.random() - 0.5) * 3;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 3 - 1;
      }
      
      const sway = Math.sin(time * 0.5 + phases[i]) * 0.01;
      
      dummy.position.set(
        positions[i * 3] + sway,
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );
      dummy.scale.setScalar(0.008 + Math.random() * 0.004);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  const count = Math.floor(particleCount * intensity);
  
  if (opacity < 0.01 || count === 0) return null;
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial 
        color="#ffffff" 
        transparent 
        opacity={opacity * 0.8}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

// ============================================
// RAIN PARTICLES
// ============================================
const RainParticles: React.FC<{ intensity: number; opacity: number; particleCount: number }> = ({ 
  intensity, 
  opacity, 
  particleCount 
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particleData = useRef<{ positions: Float32Array; velocities: Float32Array }>();
  
  useMemo(() => {
    const count = Math.floor(particleCount * intensity * 1.5);
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 1] = Math.random() * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1.5;
      velocities[i] = 0.03 + Math.random() * 0.02;
    }
    
    particleData.current = { positions, velocities };
  }, [intensity, particleCount]);
  
  useFrame(() => {
    if (!meshRef.current || !particleData.current || opacity < 0.01) return;
    
    const { positions, velocities } = particleData.current;
    const dummy = new THREE.Object3D();
    const count = Math.floor(particleCount * intensity * 1.5);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] -= velocities[i];
      
      if (positions[i * 3 + 1] < -1.5) {
        positions[i * 3 + 1] = 3;
        positions[i * 3] = (Math.random() - 0.5) * 4;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1.5;
      }
      
      dummy.position.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );
      dummy.scale.set(0.002, 0.04, 0.002);
      dummy.rotation.z = 0.1;
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  const count = Math.floor(particleCount * intensity * 1.5);
  
  if (opacity < 0.01 || count === 0) return null;
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <cylinderGeometry args={[1, 1, 1, 4]} />
      <meshBasicMaterial 
        color="#88ccff" 
        transparent 
        opacity={opacity * 0.5}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

// ============================================
// DUST PARTICLES
// ============================================
const DustParticles: React.FC<{ intensity: number; opacity: number; particleCount: number }> = ({ 
  intensity, 
  opacity, 
  particleCount 
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particleData = useRef<{ positions: Float32Array; velocities: Float32Array; phases: Float32Array }>();
  
  useMemo(() => {
    const count = Math.floor(particleCount * intensity * 0.5);
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 1] = (Math.random() - 0.3) * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
      velocities[i * 3] = 0.005 + Math.random() * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
      phases[i] = Math.random() * Math.PI * 2;
    }
    
    particleData.current = { positions, velocities, phases };
  }, [intensity, particleCount]);
  
  useFrame((state) => {
    if (!meshRef.current || !particleData.current || opacity < 0.01) return;
    
    const { positions, velocities, phases } = particleData.current;
    const time = state.clock.elapsedTime;
    const dummy = new THREE.Object3D();
    const count = Math.floor(particleCount * intensity * 0.5);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] += velocities[i * 3];
      positions[i * 3 + 1] += Math.sin(time + phases[i]) * 0.001;
      positions[i * 3 + 2] += velocities[i * 3 + 2];
      
      if (positions[i * 3] > 2) {
        positions[i * 3] = -2;
        positions[i * 3 + 1] = (Math.random() - 0.3) * 2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
      }
      
      dummy.position.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );
      dummy.scale.setScalar(0.01 + Math.random() * 0.015);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  const count = Math.floor(particleCount * intensity * 0.5);
  
  if (opacity < 0.01 || count === 0) return null;
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial 
        color="#d4a574" 
        transparent 
        opacity={opacity * 0.4}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

// ============================================
// HEAT HAZE EFFECT (for deserts) - Disabled on low tiers
// ============================================
const HeatHaze: React.FC<{ intensity: number; opacity: number; tier: DeviceTier }> = ({ 
  intensity, 
  opacity, 
  tier 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current || opacity < 0.01) return;
    
    const time = state.clock.elapsedTime;
    meshRef.current.rotation.z = Math.sin(time * 0.5) * 0.02;
    meshRef.current.position.y = Math.sin(time * 0.3) * 0.05 - 0.3;
  });
  
  // Disable heat haze on low-tier devices
  if (tier === 'C' || opacity < 0.01) return null;
  
  return (
    <mesh ref={meshRef} position={[0, -0.3, -1.5]}>
      <planeGeometry args={[4, 1, tier === 'B' ? 16 : 32, tier === 'B' ? 4 : 8]} />
      <meshBasicMaterial 
        color="#ffaa66" 
        transparent 
        opacity={opacity * 0.15 * intensity}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// ============================================
// MAIN WEATHER SYSTEM COMPONENT
// ============================================
const WeatherSystem: React.FC<WeatherSystemProps> = ({ 
  enabled = true, 
  debugMode = false,
  particleMultiplier = 1,
  tier = 'B'
}) => {
  const { latitude, longitude, isRotating, getCurrentBiome } = useGlobeCoordinates();
  
  // Calculate particle count based on tier
  const particleCount = useMemo(() => getParticleCount(tier, particleMultiplier), [tier, particleMultiplier]);
  
  // Target and current opacity for smooth transitions
  const [weatherState, setWeatherState] = useState({
    snowOpacity: 0,
    rainOpacity: 0,
    dustOpacity: 0,
    currentBiome: null as BiomeConfig | null,
  });
  
  const targetOpacity = useRef({ snow: 0, rain: 0, dust: 0 });
  
  // Update target opacity based on current biome
  useEffect(() => {
    const biome = getCurrentBiome();
    
    // Only show weather when not actively rotating (performance)
    const shouldShow = enabled && !isRotating;
    
    targetOpacity.current = {
      snow: shouldShow && biome.weatherEffect === 'snow' ? biome.intensity : 0,
      rain: shouldShow && biome.weatherEffect === 'rain' ? biome.intensity : 0,
      dust: shouldShow && biome.weatherEffect === 'dust' ? biome.intensity : 0,
    };
    
    setWeatherState(prev => ({ ...prev, currentBiome: biome }));
  }, [latitude, longitude, isRotating, enabled, getCurrentBiome]);
  
  // Smooth opacity transitions
  useFrame(() => {
    setWeatherState(prev => ({
      ...prev,
      snowOpacity: THREE.MathUtils.lerp(prev.snowOpacity, targetOpacity.current.snow, WEATHER_FADE_SPEED),
      rainOpacity: THREE.MathUtils.lerp(prev.rainOpacity, targetOpacity.current.rain, WEATHER_FADE_SPEED),
      dustOpacity: THREE.MathUtils.lerp(prev.dustOpacity, targetOpacity.current.dust, WEATHER_FADE_SPEED),
    }));
  });
  
  if (!enabled) return null;
  
  return (
    <group>
      {/* Snow Effect */}
      <SnowParticles 
        intensity={weatherState.currentBiome?.intensity || 1} 
        opacity={weatherState.snowOpacity}
        particleCount={particleCount}
      />
      
      {/* Rain Effect */}
      <RainParticles 
        intensity={weatherState.currentBiome?.intensity || 1} 
        opacity={weatherState.rainOpacity}
        particleCount={particleCount}
      />
      
      {/* Dust Effect */}
      <DustParticles 
        intensity={weatherState.currentBiome?.intensity || 1} 
        opacity={weatherState.dustOpacity}
        particleCount={particleCount}
      />
      
      {/* Heat Haze for deserts (disabled on Tier C) */}
      <HeatHaze 
        intensity={weatherState.currentBiome?.intensity || 1} 
        opacity={weatherState.dustOpacity}
        tier={tier}
      />
      
      {/* Debug overlay */}
      {debugMode && weatherState.currentBiome && (
        <group position={[0, 1.5, 0]}>
          {/* Debug info would go here */}
        </group>
      )}
    </group>
  );
};

export default WeatherSystem;
