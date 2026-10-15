/**
 * Film-like colour grading for the village with no extra render passes (phones stay fast):
 * ACES filmic tone mapping lifts the dark lanes and rolls off bright lamps softly.
 * The previous renderer settings come back when you leave the village.
 */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const VILLAGE_EXPOSURE = 1.25;

export function VillageGrade() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const prev = { tm: gl.toneMapping, ex: gl.toneMappingExposure };
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = VILLAGE_EXPOSURE;
    return () => { gl.toneMapping = prev.tm; gl.toneMappingExposure = prev.ex; };
  }, [gl]);
  return null;
}
