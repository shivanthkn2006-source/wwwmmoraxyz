import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { BioMetrics } from '@/hooks/useBioTelemetry';

interface HumanWireframeProps {
  metrics: BioMetrics;
}

const HumanWireframe = ({ metrics }: HumanWireframeProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef(0);
  
  // Determine color based on stress/heart rate
  const baseColor = useMemo(() => {
    if (metrics.heartRate > 100 || metrics.stressLevel === 'high') {
      return new THREE.Color(0xff3366); // Red/pink for stress
    }
    if (metrics.stressLevel === 'elevated') {
      return new THREE.Color(0xffaa00); // Orange for elevated
    }
    if (metrics.energyLevel < 30) {
      return new THREE.Color(0x8866ff); // Purple for low energy
    }
    return new THREE.Color(0x00ffff); // Cyan for optimal
  }, [metrics.heartRate, metrics.stressLevel, metrics.energyLevel]);
  
  // Flicker effect for low energy
  const shouldFlicker = metrics.energyLevel < 40;
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Gentle rotation
      groupRef.current.rotation.y += delta * 0.1;
      
      // Heartbeat pulse synchronized to actual heart rate
      const pulseSpeed = metrics.heartRate / 60; // beats per second
      pulseRef.current += delta * pulseSpeed * Math.PI * 2;
      const pulse = Math.sin(pulseRef.current) * 0.03 + 1;
      
      // Apply flicker for low energy
      const flickerAmount = shouldFlicker 
        ? (Math.random() > 0.95 ? 0.3 : 1) 
        : 1;
      
      groupRef.current.scale.setScalar(pulse * flickerAmount);
    }
  });
  
  // Create human body wireframe geometry
  const createBodyGeometry = () => {
    const points: THREE.Vector3[] = [];
    
    // Head (sphere outline)
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * 0.25, 1.7 + Math.sin(angle) * 0.3, 0));
    }
    
    // Neck
    points.push(new THREE.Vector3(0, 1.4, 0));
    points.push(new THREE.Vector3(0, 1.2, 0));
    
    // Shoulders
    points.push(new THREE.Vector3(-0.5, 1.2, 0));
    points.push(new THREE.Vector3(0.5, 1.2, 0));
    
    // Spine with ribcage suggestion
    for (let i = 0; i < 10; i++) {
      const y = 1.2 - i * 0.1;
      const width = 0.3 + Math.sin(i / 10 * Math.PI) * 0.15;
      points.push(new THREE.Vector3(-width, y, 0));
      points.push(new THREE.Vector3(0, y, 0));
      points.push(new THREE.Vector3(width, y, 0));
    }
    
    // Pelvis
    points.push(new THREE.Vector3(-0.25, 0.2, 0));
    points.push(new THREE.Vector3(0, 0.15, 0));
    points.push(new THREE.Vector3(0.25, 0.2, 0));
    
    // Legs
    points.push(new THREE.Vector3(-0.2, -0.8, 0));
    points.push(new THREE.Vector3(0.2, -0.8, 0));
    
    return points;
  };
  
  const bodyPoints = useMemo(() => createBodyGeometry(), []);
  
  return (
    <group ref={groupRef}>
      {/* Central spine line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={6}
            array={new Float32Array([
              0, 1.7, 0,
              0, 1.4, 0,
              0, 1.2, 0,
              0, 0.5, 0,
              0, 0.15, 0,
              0, -0.8, 0
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={baseColor} opacity={0.8} transparent />
      </line>
      
      {/* Shoulder line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={5}
            array={new Float32Array([
              -0.6, 1.2, 0,
              -0.3, 1.2, 0,
              0, 1.2, 0,
              0.3, 1.2, 0,
              0.6, 1.2, 0
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={baseColor} opacity={0.8} transparent />
      </line>
      
      {/* Left arm */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={4}
            array={new Float32Array([
              -0.6, 1.2, 0,
              -0.7, 0.8, 0,
              -0.65, 0.3, 0,
              -0.6, -0.1, 0
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={baseColor} opacity={0.6} transparent />
      </line>
      
      {/* Right arm */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={4}
            array={new Float32Array([
              0.6, 1.2, 0,
              0.7, 0.8, 0,
              0.65, 0.3, 0,
              0.6, -0.1, 0
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={baseColor} opacity={0.6} transparent />
      </line>
      
      {/* Ribcage */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`rib-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={3}
              array={new Float32Array([
                -0.35 + i * 0.02, 1.0 - i * 0.1, 0,
                0, 0.95 - i * 0.1, 0.1,
                0.35 - i * 0.02, 1.0 - i * 0.1, 0
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={baseColor} opacity={0.4} transparent />
        </line>
      ))}
      
      {/* Pelvis */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={3}
            array={new Float32Array([
              -0.3, 0.2, 0,
              0, 0.1, 0,
              0.3, 0.2, 0
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={baseColor} opacity={0.6} transparent />
      </line>
      
      {/* Left leg */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={4}
            array={new Float32Array([
              -0.2, 0.15, 0,
              -0.25, -0.3, 0,
              -0.22, -0.8, 0,
              -0.2, -1.3, 0
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={baseColor} opacity={0.6} transparent />
      </line>
      
      {/* Right leg */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={4}
            array={new Float32Array([
              0.2, 0.15, 0,
              0.25, -0.3, 0,
              0.22, -0.8, 0,
              0.2, -1.3, 0
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={baseColor} opacity={0.6} transparent />
      </line>
      
      {/* Head outline */}
      <mesh position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial color={baseColor} wireframe opacity={0.7} transparent />
      </mesh>
      
      {/* Heart glow (pulses with heart rate) */}
      <mesh position={[-0.08, 0.9, 0.05]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial 
          color={metrics.heartRate > 100 ? 0xff3366 : 0xff6688} 
          transparent 
          opacity={0.6 + Math.sin(Date.now() / (60000 / metrics.heartRate)) * 0.3}
        />
      </mesh>
      
      {/* Energy aura */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.8, 0.6, 2.8, 12, 1, true]} />
        <meshBasicMaterial 
          color={baseColor} 
          transparent 
          opacity={metrics.energyLevel / 500}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
};

interface HumanHologramProps {
  metrics: BioMetrics;
  className?: string;
}

const HumanHologram = ({ metrics, className = '' }: HumanHologramProps) => {
  return (
    <div className={`relative ${className}`}>
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none oni-scanlines opacity-30 z-10" />
      
      {/* Grid background */}
      <div className="absolute inset-0 opacity-20 cosmic-grid-lines" />
      
      <Canvas
        camera={{ position: [0, 0.5, 3.5], fov: 45 }}
        className="!bg-transparent"
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={0.5} color="#00ffff" />
        <pointLight position={[-5, -5, 5]} intensity={0.3} color="#ff66aa" />
        
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
          <HumanWireframe metrics={metrics} />
        </Float>
        
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 1.5}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>
      
      {/* Status indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          metrics.stressLevel === 'low' ? 'bg-omega-cyan animate-pulse' :
          metrics.stressLevel === 'moderate' ? 'bg-omega-green animate-pulse' :
          metrics.stressLevel === 'elevated' ? 'bg-omega-gold animate-pulse' :
          'bg-accent animate-pulse'
        }`} />
        <span className="text-xs font-share-tech text-muted-foreground uppercase">
          {metrics.activityState}
        </span>
      </div>
    </div>
  );
};

export default HumanHologram;
