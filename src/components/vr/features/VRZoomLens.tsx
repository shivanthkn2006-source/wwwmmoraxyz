/**
 * VR 5X Zoom Lens - R3F component that adjusts camera FOV
 * Listens for vr-zoom-lens events to toggle between 1x and 5x zoom
 */

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';

const VRZoomLens: React.FC = () => {
  const { camera } = useThree();
  const targetFOV = useRef(75); // Default FOV
  const currentFOV = useRef(75);

  useEffect(() => {
    const handleZoom = (e: CustomEvent) => {
      const { zoom } = e.detail;
      // 5x zoom = FOV / 5 = 15, normal = 75
      targetFOV.current = zoom >= 5 ? 15 : 75;
    };

    window.addEventListener('vr-zoom-lens', handleZoom as EventListener);
    return () => window.removeEventListener('vr-zoom-lens', handleZoom as EventListener);
  }, []);

  useFrame(() => {
    const cam = camera as any;
    if (!cam.fov) return;

    const diff = targetFOV.current - currentFOV.current;
    if (Math.abs(diff) > 0.1) {
      currentFOV.current += diff * 0.08; // Smooth transition
      cam.fov = currentFOV.current;
      cam.updateProjectionMatrix();
    }
  });

  return null;
};

export default VRZoomLens;
