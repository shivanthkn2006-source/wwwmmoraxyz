// ═══════════════════════════════════════════════════════════════════════════════
// WEATHER VISUAL EFFECTS - Particle-Based Weather System
// Rain, Snow, Fog, Storm effects using Three.js particles
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Cloud, Sky } from '@react-three/drei';
import * as THREE from 'three';

export type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'storm' | 'cloudy';

interface WeatherEffectsProps {
  weather: WeatherType;
  intensity?: number; // 0-1
}

// Rain Particle System - with null safety
const RainEffect: React.FC<{ intensity: number }> = ({ intensity }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = Math.floor(5000 * intensity);
  
  const positions = useMemo(() => {
    if (particleCount === 0) return new Float32Array(0);
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100;     // x
      pos[i * 3 + 1] = Math.random() * 50;           // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100; // z
    }
    return pos;
  }, [particleCount]);

  useFrame((state, delta) => {
    if (!pointsRef.current || particleCount === 0) return;
    
    const posAttr = pointsRef.current.geometry.attributes.position;
    if (!posAttr) return;
    
    const posArray = posAttr.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      posArray[i * 3 + 1] -= delta * 30 * intensity; // Fall speed
      if (posArray[i * 3 + 1] < 0) {
        posArray[i * 3 + 1] = 50; // Reset to top
      }
    }
    posAttr.needsUpdate = true;
  });

  if (particleCount === 0 || positions.length === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#a0c4ff"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
};

// Snow Particle System - with null safety
const SnowEffect: React.FC<{ intensity: number }> = ({ intensity }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = Math.floor(3000 * intensity);
  
  const [positions, velocities] = useMemo(() => {
    if (particleCount === 0) return [new Float32Array(0), new Float32Array(0)];
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = Math.random() * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
      vel[i * 3] = (Math.random() - 0.5) * 0.5; // Horizontal drift
      vel[i * 3 + 1] = Math.random() * 0.5 + 0.5; // Fall speed
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    return [pos, vel];
  }, [particleCount]);

  useFrame((state, delta) => {
    if (!pointsRef.current || particleCount === 0) return;
    
    const posAttr = pointsRef.current.geometry.attributes.position;
    if (!posAttr) return;
    
    const posArray = posAttr.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      // Gentle swaying motion
      posArray[i * 3] += Math.sin(state.clock.elapsedTime + i) * delta * velocities[i * 3];
      posArray[i * 3 + 1] -= delta * 5 * velocities[i * 3 + 1] * intensity;
      posArray[i * 3 + 2] += Math.cos(state.clock.elapsedTime + i) * delta * velocities[i * 3 + 2];
      
      if (posArray[i * 3 + 1] < 0) {
        posArray[i * 3 + 1] = 50;
      }
    }
    posAttr.needsUpdate = true;
  });

  if (particleCount === 0 || positions.length === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
};

// Fog Effect
const FogEffect: React.FC<{ intensity: number }> = ({ intensity }) => {
  return (
    <>
      <fog attach="fog" args={['#94a3b8', 5, 50 - (intensity * 30)]} />
      {/* Volumetric fog clouds */}
      {Array.from({ length: Math.floor(10 * intensity) }).map((_, i) => (
        <Cloud
          key={i}
          position={[
            (Math.random() - 0.5) * 80,
            Math.random() * 5,
            (Math.random() - 0.5) * 80
          ]}
          opacity={0.3 * intensity}
          speed={0.1}
          segments={20}
        />
      ))}
    </>
  );
};

// Storm Effect (Rain + Lightning + Clouds)
const StormEffect: React.FC<{ intensity: number }> = ({ intensity }) => {
  const [lightning, setLightning] = useState(false);
  const lightRef = useRef<THREE.PointLight>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.1 * intensity) {
        setLightning(true);
        setTimeout(() => setLightning(false), 100);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [intensity]);

  return (
    <>
      <RainEffect intensity={intensity * 1.5} />
      {/* Lightning flash */}
      {lightning && (
        <pointLight
          ref={lightRef}
          position={[
            (Math.random() - 0.5) * 50,
            30,
            (Math.random() - 0.5) * 50
          ]}
          intensity={100}
          color="#ffffff"
          distance={200}
        />
      )}
      {/* Dark storm clouds */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Cloud
          key={i}
          position={[
            (Math.random() - 0.5) * 100,
            25 + Math.random() * 10,
            (Math.random() - 0.5) * 100
          ]}
          opacity={0.8}
          speed={0.4}
          color="#374151"
          segments={40}
        />
      ))}
      {/* Ambient darkness */}
      <ambientLight intensity={0.1} />
    </>
  );
};

// Cloudy Effect
const CloudyEffect: React.FC<{ intensity: number }> = ({ intensity }) => {
  return (
    <>
      {Array.from({ length: Math.floor(15 * intensity) }).map((_, i) => (
        <Cloud
          key={i}
          position={[
            (Math.random() - 0.5) * 120,
            20 + Math.random() * 15,
            (Math.random() - 0.5) * 120
          ]}
          opacity={0.5 + Math.random() * 0.3}
          speed={0.2}
          segments={30}
        />
      ))}
    </>
  );
};

// Main Weather Effects Component
const WeatherEffects: React.FC<WeatherEffectsProps> = ({ 
  weather, 
  intensity = 0.7 
}) => {
  switch (weather) {
    case 'rain':
      return <RainEffect intensity={intensity} />;
    case 'snow':
      return <SnowEffect intensity={intensity} />;
    case 'fog':
      return <FogEffect intensity={intensity} />;
    case 'storm':
      return <StormEffect intensity={intensity} />;
    case 'cloudy':
      return <CloudyEffect intensity={intensity} />;
    case 'clear':
    default:
      return null;
  }
};

// Weather State Hook - Manages weather with voice command integration
export const useWeatherState = () => {
  const [currentWeather, setCurrentWeather] = useState<WeatherType>('clear');
  const [intensity, setIntensity] = useState(0.7);

  useEffect(() => {
    const handleWeatherCommand = (event: CustomEvent) => {
      const { action } = event.detail;
      switch (action) {
        case 'set_rain':
          setCurrentWeather('rain');
          break;
        case 'set_snow':
          setCurrentWeather('snow');
          break;
        case 'set_fog':
          setCurrentWeather('fog');
          break;
        case 'set_storm':
          setCurrentWeather('storm');
          break;
        case 'set_cloudy':
          setCurrentWeather('cloudy');
          break;
        case 'set_sunny':
        case 'set_clear':
          setCurrentWeather('clear');
          break;
      }
    };

    window.addEventListener('vr-environment', handleWeatherCommand as EventListener);
    return () => window.removeEventListener('vr-environment', handleWeatherCommand as EventListener);
  }, []);

  return { currentWeather, setCurrentWeather, intensity, setIntensity };
};

export default WeatherEffects;
