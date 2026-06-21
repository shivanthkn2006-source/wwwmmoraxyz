import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { supabase } from '@/integrations/supabase/client';

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

interface Campaign {
  id: string;
  geofence_center_lat: number;
  geofence_center_lng: number;
  geofence_radius_meters: number;
  status: string;
}

interface MerchantHeatmapGlobeProps {
  onGeofenceSelect: (center: { lat: number; lng: number }, radius: number) => void;
  campaigns: Campaign[];
}

// Convert lat/lng to 3D position
const latLngToVector3 = (lat: number, lng: number, radius: number = 1): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

// Heatmap points visualization
const HeatmapPoints: React.FC<{ points: HeatmapPoint[] }> = ({ points }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(points.length * 3);
    const cols = new Float32Array(points.length * 3);

    points.forEach((point, i) => {
      const vec = latLngToVector3(point.lat, point.lng, 1.02);
      pos[i * 3] = vec.x;
      pos[i * 3 + 1] = vec.y;
      pos[i * 3 + 2] = vec.z;

      // Color based on intensity (blue -> yellow -> red)
      const intensity = Math.min(1, point.intensity);
      if (intensity < 0.5) {
        cols[i * 3] = intensity * 2;
        cols[i * 3 + 1] = intensity * 2;
        cols[i * 3 + 2] = 1;
      } else {
        cols[i * 3] = 1;
        cols[i * 3 + 1] = 1 - (intensity - 0.5) * 2;
        cols[i * 3 + 2] = 0;
      }
    });

    return [pos, cols];
  }, [points]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
};

// Geofence visualization
const GeofenceRing: React.FC<{ 
  lat: number; 
  lng: number; 
  radiusMeters: number;
  color?: string;
  isActive?: boolean;
}> = ({ lat, lng, radiusMeters, color = '#f59e0b', isActive = true }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  
  // Convert meters to globe scale (rough approximation)
  const radiusScale = (radiusMeters / 1000000) * 0.5;
  
  const position = useMemo(() => latLngToVector3(lat, lng, 1.01), [lat, lng]);
  
  useFrame((state) => {
    if (ringRef.current && isActive) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  // Calculate rotation to face outward from globe center
  const quaternion = useMemo(() => {
    const normal = position.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, normal);
    return quaternion;
  }, [position]);

  return (
    <group position={position} quaternion={quaternion}>
      <mesh ref={ringRef}>
        <ringGeometry args={[radiusScale * 0.8, radiusScale, 32]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={isActive ? 0.6 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      {isActive && (
        <mesh>
          <circleGeometry args={[radiusScale, 32]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};

// Earth globe
const Earth: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#1a365d"
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
};

// Click handler for geofence selection
const ClickHandler: React.FC<{
  onSelect: (lat: number, lng: number) => void;
}> = ({ onSelect }) => {
  const { camera, gl } = useThree();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);
      const intersection = new THREE.Vector3();
      
      if (raycaster.ray.intersectSphere(sphere, intersection)) {
        // Convert 3D position to lat/lng
        const phi = Math.acos(intersection.y);
        const theta = Math.atan2(intersection.z, -intersection.x);
        
        const lat = 90 - (phi * 180) / Math.PI;
        const lng = (theta * 180) / Math.PI - 180;
        
        onSelect(lat, lng);
      }
    };

    gl.domElement.addEventListener('dblclick', handleClick);
    return () => gl.domElement.removeEventListener('dblclick', handleClick);
  }, [camera, gl, onSelect]);

  return null;
};

const GlobeScene: React.FC<{
  heatmapPoints: HeatmapPoint[];
  campaigns: Campaign[];
  selectedPoint: { lat: number; lng: number } | null;
  onPointSelect: (lat: number, lng: number) => void;
}> = ({ heatmapPoints, campaigns, selectedPoint, onPointSelect }) => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1} />
      <Stars radius={100} depth={50} count={2000} factor={4} fade speed={1} />
      
      <Earth />
      <HeatmapPoints points={heatmapPoints} />
      
      {/* Existing campaign geofences */}
      {campaigns.map((campaign) => (
        <GeofenceRing
          key={campaign.id}
          lat={campaign.geofence_center_lat}
          lng={campaign.geofence_center_lng}
          radiusMeters={campaign.geofence_radius_meters}
          color="#10b981"
          isActive={campaign.status === 'active'}
        />
      ))}
      
      {/* Selected point for new geofence */}
      {selectedPoint && (
        <GeofenceRing
          lat={selectedPoint.lat}
          lng={selectedPoint.lng}
          radiusMeters={500}
          color="#f59e0b"
          isActive={true}
        />
      )}
      
      <ClickHandler onSelect={onPointSelect} />
      <OrbitControls 
        enablePan={false}
        minDistance={1.5}
        maxDistance={4}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
};

const MerchantHeatmapGlobe: React.FC<MerchantHeatmapGlobeProps> = ({ 
  onGeofenceSelect,
  campaigns 
}) => {
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch heatmap data from selfie pins
  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        const { data: pins, error } = await supabase
          .from('selfie_city_pins')
          .select('location_lat, location_lng, likes_count, sponsorship_score')
          .not('location_lat', 'is', null)
          .not('location_lng', 'is', null)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) throw error;

        // Convert pins to heatmap points
        const points: HeatmapPoint[] = (pins || []).map((pin: any) => ({
          lat: pin.location_lat,
          lng: pin.location_lng,
          intensity: Math.min(1, ((pin.likes_count || 0) + (pin.sponsorship_score || 0)) / 100)
        }));

        setHeatmapPoints(points);
      } catch (err) {
        console.error('Error fetching heatmap data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeatmapData();
  }, []);

  const handlePointSelect = (lat: number, lng: number) => {
    setSelectedPoint({ lat, lng });
    onGeofenceSelect({ lat, lng }, 500);
  };

  return (
    <div className="relative w-full h-full bg-slate-900">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-amber-500 animate-pulse">Loading heatmap data...</div>
        </div>
      )}
      
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <GlobeScene
          heatmapPoints={heatmapPoints}
          campaigns={campaigns}
          selectedPoint={selectedPoint}
          onPointSelect={handlePointSelect}
        />
      </Canvas>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="text-white/80 mb-2 font-medium">Activity Intensity</div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 rounded bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500" />
          <span className="text-white/60">Low → High</span>
        </div>
        <div className="mt-2 text-white/60">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500/60 mr-1" /> Active Campaign
        </div>
        <div className="text-white/60">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-500/60 mr-1" /> New Selection
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-xs text-white/80">
        Double-click on globe to select geofence location
      </div>
    </div>
  );
};

export default MerchantHeatmapGlobe;
