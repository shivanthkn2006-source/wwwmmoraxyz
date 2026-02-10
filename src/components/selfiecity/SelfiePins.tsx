import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { SelfieCityPin } from '@/hooks/useSelfieCityStore';
import type { GlobeFlyToEvent } from '@/services/globeNavigationService';

// ============================================
// CONSTANTS
// ============================================
const GLOBE_RADIUS = 1;
const PIN_HEIGHT = 0.15; // Height of data line above surface
const AVATAR_SIZE = 0.04;

// ============================================
// HELPER: Convert Lat/Lon to 3D Vector
// ============================================
export function latLonToVector3(lat: number, lon: number, radius: number = GLOBE_RADIUS): THREE.Vector3 {
  // Convert degrees to radians
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  // Spherical to Cartesian conversion
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
}

// ============================================
// SINGLE SELFIE PIN COMPONENT
// ============================================
interface SelfiePinProps {
  selfie: SelfieCityPin;
  onSelect: (selfie: SelfieCityPin) => void;
  isSelected: boolean;
}

const SelfiePin: React.FC<SelfiePinProps> = ({ selfie, onSelect, isSelected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const lineRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  
  // Calculate 3D position from lat/lon
  const surfacePosition = useMemo(() => 
    latLonToVector3(selfie.location.lat, selfie.location.lng, GLOBE_RADIUS),
    [selfie.location.lat, selfie.location.lng]
  );
  
  const pinPosition = useMemo(() => 
    latLonToVector3(selfie.location.lat, selfie.location.lng, GLOBE_RADIUS + PIN_HEIGHT),
    [selfie.location.lat, selfie.location.lng]
  );
  
  // Calculate rotation to point outward from globe center
  const rotation = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const direction = pinPosition.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    return new THREE.Euler().setFromQuaternion(quaternion);
  }, [pinPosition]);
  
  // Animation for hover/select states
  const targetScale = isHovered || isSelected ? 1.4 : 1;
  const currentScale = useRef(1);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Smooth scale animation
      currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale, delta * 10);
      groupRef.current.scale.setScalar(currentScale.current);
    }
    
    // Pulse effect for data line when hovered
    if (lineRef.current) {
      const pulse = isHovered ? Math.sin(state.clock.elapsedTime * 4) * 0.3 + 0.7 : 0.5;
      (lineRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  });
  
  const handleClick = useCallback(() => {
    onSelect(selfie);
  }, [selfie, onSelect]);
  
  // Data line color based on premium status
  const lineColor = selfie.isPremium ? '#ffd700' : '#00ffff';
  
  return (
    <group ref={groupRef} position={pinPosition}>
      {/* Data Line - Glowing vertical connection to surface */}
      <mesh
        ref={lineRef}
        position={[0, -PIN_HEIGHT / 2, 0]}
        rotation={rotation}
      >
        <cylinderGeometry args={[0.002, 0.002, PIN_HEIGHT, 8]} />
        <meshBasicMaterial
          color={lineColor}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Pulsing Ring at Base */}
      <mesh position={surfacePosition} rotation={rotation}>
        <ringGeometry args={[0.015, 0.02, 16]} />
        <meshBasicMaterial
          color={lineColor}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Avatar Marker using Html (2D in 3D) */}
      <Html
        position={[0, 0, 0]}
        center
        occlude
        distanceFactor={2}
        style={{
          transition: 'all 0.2s ease-out',
          pointerEvents: 'auto',
        }}
        zIndexRange={[100, 0]}
      >
        <div
          className={`
            relative cursor-pointer select-none
            transition-all duration-200 ease-out
            ${isHovered || isSelected ? 'scale-110' : 'scale-100'}
          `}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
        >
          {/* Avatar Circle */}
          <div 
            className={`
              w-10 h-10 rounded-full overflow-hidden
              border-2 shadow-lg
              ${selfie.isPremium 
                ? 'border-yellow-400 shadow-yellow-400/50' 
                : 'border-cyan-400 shadow-cyan-400/50'
              }
              ${isHovered || isSelected ? 'ring-2 ring-white/50' : ''}
            `}
            style={{
              backgroundImage: `url(${selfie.avatarUrl || selfie.imageUrl || '/placeholder.svg'})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          
          {/* Premium Badge */}
          {selfie.isPremium && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-[8px]">★</span>
            </div>
          )}
          
          {/* Hover Tooltip - Glassmorphism Style */}
          {isHovered && (
            <div 
              className="
                absolute left-1/2 -translate-x-1/2 bottom-full mb-2
                min-w-[160px] p-3 rounded-xl
                bg-black/70 backdrop-blur-md
                border border-white/20
                text-white text-center
                animate-in fade-in-0 slide-in-from-bottom-2
                duration-200
              "
            >
              <p className="font-semibold text-sm truncate">
                {selfie.userName || 'Anonymous'}
              </p>
              {selfie.caption && (
                <p className="text-xs text-white/70 mt-1 line-clamp-2">
                  {selfie.caption}
                </p>
              )}
              {selfie.detectedProducts?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {selfie.detectedProducts.slice(0, 3).map((product, i) => (
                    <span 
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200"
                    >
                      {product.brand || product.name}
                    </span>
                  ))}
                </div>
              )}
              {selfie.location.name && (
                <p className="text-[10px] text-white/50 mt-2">
                  📍 {selfie.location.name}
                </p>
              )}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

// ============================================
// SELFIE PINS CONTAINER
// ============================================
interface SelfiePinsProps {
  selfies: SelfieCityPin[];
  onSelfieSelect?: (selfie: SelfieCityPin) => void;
}

const SelfiePins: React.FC<SelfiePinsProps> = ({ selfies, onSelfieSelect }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const controlsRef = useRef<any>(null);
  const { camera, gl } = useThree();
  
  // Shared fly-to animation function
  const flyToCoordinates = useCallback((lat: number, lng: number, duration: number = 1500) => {
    const targetPosition = latLonToVector3(lat, lng, GLOBE_RADIUS + 0.5);
    const startPosition = camera.position.clone();
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      camera.position.lerpVectors(startPosition, targetPosition, eased);
      camera.lookAt(0, 0, 0);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [camera]);

  // Listen for external fly-to events from voice commands or search
  useEffect(() => {
    const handleExternalFlyTo = (e: CustomEvent<GlobeFlyToEvent>) => {
      const { lat, lng, duration } = e.detail;
      console.log('[SelfiePins] External fly-to:', e.detail.name, lat, lng);
      flyToCoordinates(lat, lng, duration || 2000);
    };

    window.addEventListener('selfie-city-globe-fly-to', handleExternalFlyTo as EventListener);
    return () => window.removeEventListener('selfie-city-globe-fly-to', handleExternalFlyTo as EventListener);
  }, [flyToCoordinates]);

  // Handle selfie selection with fly-to animation
  const handleSelect = useCallback((selfie: SelfieCityPin) => {
    setSelectedId(selfie.id);
    flyToCoordinates(selfie.location.lat, selfie.location.lng, 1500);
    onSelfieSelect?.(selfie);
  }, [flyToCoordinates, onSelfieSelect]);
  
  return (
    <group>
      {selfies.map((selfie) => (
        <SelfiePin
          key={selfie.id}
          selfie={selfie}
          onSelect={handleSelect}
          isSelected={selectedId === selfie.id}
        />
      ))}
    </group>
  );
};

export default SelfiePins;
