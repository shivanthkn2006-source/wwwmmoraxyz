import { useState, useCallback, useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================
// BIOME DEFINITIONS
// ============================================
export type BiomeType = 'antarctica' | 'amazon' | 'sahara' | 'arctic' | 'ocean' | 'temperate' | null;

export interface GlobeCoordinates {
  latitude: number;
  longitude: number;
  biome: BiomeType;
  isRotating: boolean;
  rotationSpeed: number;
}

export interface BiomeConfig {
  type: BiomeType;
  name: string;
  weatherEffect: 'snow' | 'rain' | 'dust' | 'none';
  intensity: number;
}

// Biome detection based on lat/lng
export const detectBiome = (lat: number, lon: number): BiomeConfig => {
  // Antarctica - Snow
  if (lat < -60) {
    return { type: 'antarctica', name: 'Antarctica', weatherEffect: 'snow', intensity: 1.0 };
  }
  
  // Arctic - Snow (lighter)
  if (lat > 66) {
    return { type: 'arctic', name: 'Arctic', weatherEffect: 'snow', intensity: 0.7 };
  }
  
  // Amazon Rainforest - Rain
  if (lat >= -10 && lat <= 10 && lon >= -75 && lon <= -50) {
    return { type: 'amazon', name: 'Amazon Rainforest', weatherEffect: 'rain', intensity: 1.0 };
  }
  
  // Congo Rainforest - Rain
  if (lat >= -5 && lat <= 5 && lon >= 10 && lon <= 30) {
    return { type: 'amazon', name: 'Congo Rainforest', weatherEffect: 'rain', intensity: 0.8 };
  }
  
  // Southeast Asia Rainforest - Rain
  if (lat >= -10 && lat <= 10 && lon >= 95 && lon <= 140) {
    return { type: 'amazon', name: 'SE Asia Rainforest', weatherEffect: 'rain', intensity: 0.9 };
  }
  
  // Sahara Desert - Dust
  if (lat >= 15 && lat <= 35 && lon >= -15 && lon <= 40) {
    return { type: 'sahara', name: 'Sahara Desert', weatherEffect: 'dust', intensity: 1.0 };
  }
  
  // Arabian Desert - Dust
  if (lat >= 15 && lat <= 30 && lon >= 35 && lon <= 60) {
    return { type: 'sahara', name: 'Arabian Desert', weatherEffect: 'dust', intensity: 0.8 };
  }
  
  // Australian Outback - Dust (lighter)
  if (lat >= -30 && lat <= -20 && lon >= 120 && lon <= 145) {
    return { type: 'sahara', name: 'Australian Outback', weatherEffect: 'dust', intensity: 0.6 };
  }
  
  // Temperate zones - No weather
  return { type: 'temperate', name: 'Temperate Zone', weatherEffect: 'none', intensity: 0 };
};

// ============================================
// COORDINATE CONVERSION UTILITIES
// ============================================

// Convert 3D position to lat/lng
export const vector3ToLatLng = (position: THREE.Vector3): { lat: number; lng: number } => {
  const normalized = position.clone().normalize();
  
  // Calculate latitude (from Y component)
  const lat = Math.asin(normalized.y) * (180 / Math.PI);
  
  // Calculate longitude (from X and Z components)
  const lng = Math.atan2(normalized.x, normalized.z) * (180 / Math.PI);
  
  return { lat, lng };
};

// Convert lat/lng to 3D position on sphere
export const latLngToVector3 = (lat: number, lng: number, radius: number = 1): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

// ============================================
// MAIN HOOK
// ============================================
export const useGlobeCoordinates = () => {
  const { camera, controls } = useThree();
  const [coordinates, setCoordinates] = useState<GlobeCoordinates>({
    latitude: 0,
    longitude: 0,
    biome: null,
    isRotating: false,
    rotationSpeed: 0,
  });
  
  const lastCameraPosition = useRef(new THREE.Vector3());
  const rotationTimeout = useRef<NodeJS.Timeout | null>(null);
  const smoothedRotationSpeed = useRef(0);
  
  // Calculate center point camera is looking at
  const calculateFocusPoint = useCallback(() => {
    // Create a ray from camera looking at origin (globe center)
    const direction = new THREE.Vector3(0, 0, 0).sub(camera.position).normalize();
    
    // Find intersection with unit sphere
    const cameraToCenter = camera.position.clone();
    const a = direction.dot(direction);
    const b = 2 * cameraToCenter.dot(direction);
    const c = cameraToCenter.dot(cameraToCenter) - 1;
    
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) {
      // No intersection, use camera forward direction projected onto sphere
      const projected = direction.multiplyScalar(-1);
      return vector3ToLatLng(projected);
    }
    
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    const intersection = camera.position.clone().add(direction.multiplyScalar(t));
    
    return vector3ToLatLng(intersection);
  }, [camera]);
  
  // Track rotation state
  useFrame(() => {
    const currentPosition = camera.position.clone();
    const distance = currentPosition.distanceTo(lastCameraPosition.current);
    
    // Smooth the rotation speed
    smoothedRotationSpeed.current = THREE.MathUtils.lerp(
      smoothedRotationSpeed.current,
      distance,
      0.1
    );
    
    const isCurrentlyRotating = smoothedRotationSpeed.current > 0.001;
    
    // Update coordinates
    const { lat, lng } = calculateFocusPoint();
    const biomeConfig = detectBiome(lat, lng);
    
    setCoordinates(prev => {
      // Only update if significant change to prevent unnecessary re-renders
      const latChanged = Math.abs(prev.latitude - lat) > 0.5;
      const lngChanged = Math.abs(prev.longitude - lng) > 0.5;
      const rotatingChanged = prev.isRotating !== isCurrentlyRotating;
      
      if (latChanged || lngChanged || rotatingChanged) {
        return {
          latitude: lat,
          longitude: lng,
          biome: biomeConfig.type,
          isRotating: isCurrentlyRotating,
          rotationSpeed: smoothedRotationSpeed.current,
        };
      }
      return prev;
    });
    
    lastCameraPosition.current.copy(currentPosition);
  });
  
  // Get current biome config
  const getCurrentBiome = useCallback((): BiomeConfig => {
    return detectBiome(coordinates.latitude, coordinates.longitude);
  }, [coordinates.latitude, coordinates.longitude]);
  
  return {
    ...coordinates,
    getCurrentBiome,
    calculateFocusPoint,
  };
};

export default useGlobeCoordinates;
