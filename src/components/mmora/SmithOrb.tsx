import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 5000;

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0.94, b: 1 }; // Default cyan
}

interface ParticleCloudProps {
  isSpeaking?: boolean;
  moodColor?: string;
}

function ParticleCloud({ isSpeaking = false, moodColor = '#00F0FF' }: ParticleCloudProps) {
  const meshRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  const colorsRef = useRef<Float32Array | null>(null);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    // Get time-based color shift
    const hour = new Date().getHours();
    let hintColor = { r: 0, g: 0.94, b: 1 }; // Default cyan
    
    if (hour >= 6 && hour < 12) {
      // Morning: Gold hint
      hintColor = { r: 1, g: 0.84, b: 0 };
    } else if (hour >= 18 || hour < 6) {
      // Night: Deep Violet hint
      hintColor = { r: 0.54, g: 0.17, b: 0.89 };
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Spherical distribution with some randomness
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 1.5 + Math.random() * 0.5;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Mix colors: Electric Cyan, Deep Navy, Stardust White with time hint
      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        // Electric Cyan #00F0FF
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0.94;
        colors[i * 3 + 2] = 1;
      } else if (colorChoice < 0.7) {
        // Deep Navy #001133
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0.07;
        colors[i * 3 + 2] = 0.2;
      } else if (colorChoice < 0.85) {
        // Stardust White
        colors[i * 3] = 0.9;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 1;
      } else {
        // Time-based hint
        colors[i * 3] = hintColor.r;
        colors[i * 3 + 1] = hintColor.g;
        colors[i * 3 + 2] = hintColor.b;
      }
    }

    colorsRef.current = colors;
    return { positions, colors };
  }, []);

  // Update colors based on mood
  useEffect(() => {
    if (!meshRef.current || !colorsRef.current) return;
    
    const moodRgb = hexToRgb(moodColor);
    const geometry = meshRef.current.geometry;
    const colorArray = geometry.attributes.color.array as Float32Array;

    // Blend mood color into 30% of particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (Math.random() < 0.3) {
        const i3 = i * 3;
        colorArray[i3] = moodRgb.r;
        colorArray[i3 + 1] = moodRgb.g;
        colorArray[i3 + 2] = moodRgb.b;
      }
    }
    
    geometry.attributes.color.needsUpdate = true;
  }, [moodColor]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta;
    const geometry = meshRef.current.geometry;
    const posArray = geometry.attributes.position.array as Float32Array;
    
    const pulseIntensity = isSpeaking ? 0.3 : 0.05;
    const pulseSpeed = isSpeaking ? 8 : 1;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const originalX = positions[i3];
      const originalY = positions[i3 + 1];
      const originalZ = positions[i3 + 2];

      // Sine wave undulation
      const wave = Math.sin(timeRef.current * pulseSpeed + i * 0.01) * pulseIntensity;
      const scale = 1 + wave;

      posArray[i3] = originalX * scale;
      posArray[i3 + 1] = originalY * scale;
      posArray[i3 + 2] = originalZ * scale;
    }

    geometry.attributes.position.needsUpdate = true;
    
    // Slow rotation
    meshRef.current.rotation.y += delta * 0.1;
    meshRef.current.rotation.x += delta * 0.05;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

interface SmithOrbProps {
  isSpeaking?: boolean;
  floatUp?: boolean;
  moodColor?: string;
}

export default function SmithOrb({ isSpeaking = false, floatUp = false, moodColor = '#00F0FF' }: SmithOrbProps) {
  return (
    <div 
      className="fixed inset-0 z-0 pointer-events-none transition-transform duration-700"
      style={{ transform: floatUp ? 'translateY(-100px)' : 'translateY(0)' }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <ParticleCloud isSpeaking={isSpeaking} moodColor={moodColor} />
      </Canvas>
    </div>
  );
}
