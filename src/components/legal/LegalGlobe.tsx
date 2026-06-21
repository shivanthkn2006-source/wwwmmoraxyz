import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';
import { CONTINENT_STATUS, ContinentStatus } from '@/data/mmoraLegalFramework';

interface LegalGlobeProps {
  onContinentHover?: (continent: ContinentStatus | null) => void;
  selectedContinent?: string | null;
}

// Convert lat/lng to 3D sphere position
const latLngToVector3 = (lat: number, lng: number, radius: number = 1.5): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

// Rotating wireframe globe
const WireframeGlobe: React.FC = () => {
  const globeRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  // Generate longitude lines
  const longitudeLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    for (let lng = 0; lng < 360; lng += 30) {
      const points: THREE.Vector3[] = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        points.push(latLngToVector3(lat, lng, 1.5));
      }
      lines.push(points);
    }
    return lines;
  }, []);

  // Generate latitude lines
  const latitudeLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      const points: THREE.Vector3[] = [];
      for (let lng = 0; lng <= 360; lng += 5) {
        points.push(latLngToVector3(lat, lng, 1.5));
      }
      lines.push(points);
    }
    return lines;
  }, []);

  return (
    <group ref={globeRef}>
      {/* Core sphere */}
      <Sphere args={[1.48, 32, 32]}>
        <meshBasicMaterial 
          color="#0a0a1a" 
          transparent 
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </Sphere>
      
      {/* Wireframe lines */}
      {longitudeLines.map((points, i) => (
        <Line 
          key={`lng-${i}`} 
          points={points} 
          color="hsl(200, 80%, 50%)" 
          lineWidth={0.5}
          transparent
          opacity={0.3}
        />
      ))}
      {latitudeLines.map((points, i) => (
        <Line 
          key={`lat-${i}`} 
          points={points} 
          color="hsl(200, 80%, 50%)" 
          lineWidth={0.5}
          transparent
          opacity={0.3}
        />
      ))}
    </group>
  );
};

// Continent markers
const ContinentMarkers: React.FC<{
  onHover?: (continent: ContinentStatus | null) => void;
  selected?: string | null;
}> = ({ onHover, selected }) => {
  const markersRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (markersRef.current) {
      markersRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  const getStatusColor = (status: ContinentStatus['status']) => {
    switch (status) {
      case 'compliant': return '#22c55e';
      case 'active': return '#3b82f6';
      case 'pending': return '#f59e0b';
      default: return '#64748b';
    }
  };

  return (
    <group ref={markersRef}>
      {CONTINENT_STATUS.map((continent) => {
        const position = latLngToVector3(continent.position.lat, continent.position.lng, 1.55);
        const isSelected = selected === continent.code;
        
        return (
          <group key={continent.code} position={position}>
            <Sphere 
              args={[isSelected ? 0.08 : 0.05, 16, 16]}
              onPointerEnter={() => onHover?.(continent)}
              onPointerLeave={() => onHover?.(null)}
            >
              <meshBasicMaterial 
                color={getStatusColor(continent.status)} 
                transparent
                opacity={isSelected ? 1 : 0.8}
              />
            </Sphere>
            {/* Glow effect */}
            <Sphere args={[isSelected ? 0.12 : 0.08, 16, 16]}>
              <meshBasicMaterial 
                color={getStatusColor(continent.status)} 
                transparent
                opacity={0.2}
              />
            </Sphere>
          </group>
        );
      })}
    </group>
  );
};

const LegalGlobe: React.FC<LegalGlobeProps> = ({ onContinentHover, selectedContinent }) => {
  return (
    <div className="w-full h-full min-h-[300px]">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <WireframeGlobe />
        <ContinentMarkers onHover={onContinentHover} selected={selectedContinent} />
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          autoRotate={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI * 3 / 4}
        />
      </Canvas>
    </div>
  );
};

export default LegalGlobe;
