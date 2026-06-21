// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: Liquid Displacement Mesh
// Audio-reactive mesh that ripples with voice frequency
// Visualizes sound as physical waves on the camera feed
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { liquidDisplacementVertex, quantumColorGradeFragment } from './QuantumShaders';
import { QuantumCameraConfig, AudioAnalysis } from '@/hooks/useQuantumCamera';

interface LiquidDisplacementMeshProps {
  videoTexture: THREE.VideoTexture | null;
  config: QuantumCameraConfig;
  audioAnalysis: AudioAnalysis;
}

const LiquidDisplacementMesh: React.FC<LiquidDisplacementMeshProps> = ({
  videoTexture,
  config,
  audioAnalysis,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  // Create shader material with uniforms
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: liquidDisplacementVertex,
      fragmentShader: quantumColorGradeFragment,
      uniforms: {
        uVideoTexture: { value: null },
        uTime: { value: 0 },
        
        // Audio
        uAudioBass: { value: 0 },
        uAudioMid: { value: 0 },
        uAudioTreble: { value: 0 },
        uAudioVolume: { value: 0 },
        
        // Config
        uDisplacementIntensity: { value: config.displacementIntensity },
        uColorGradeIntensity: { value: config.colorGradeIntensity },
        uVoidBlueDepth: { value: config.voidBlueDepth },
        uStellarGoldIntensity: { value: config.stellarGoldIntensity },
        uFilmicExposure: { value: config.filmicExposure },
        uChromaticAberration: { value: config.chromaticAberration },
        uVignetteStrength: { value: config.vignetteStrength },
        uScanlineOpacity: { value: config.scanlineOpacity },
        uNoiseIntensity: { value: config.noiseIntensity },
      },
      side: THREE.DoubleSide,
    });
  }, []);

  // Update config uniforms
  useEffect(() => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uDisplacementIntensity.value = config.displacementIntensity;
      shaderMaterial.uniforms.uColorGradeIntensity.value = config.colorGradeIntensity;
      shaderMaterial.uniforms.uVoidBlueDepth.value = config.voidBlueDepth;
      shaderMaterial.uniforms.uStellarGoldIntensity.value = config.stellarGoldIntensity;
      shaderMaterial.uniforms.uFilmicExposure.value = config.filmicExposure;
      shaderMaterial.uniforms.uChromaticAberration.value = config.chromaticAberration;
      shaderMaterial.uniforms.uVignetteStrength.value = config.vignetteStrength;
      shaderMaterial.uniforms.uScanlineOpacity.value = config.scanlineOpacity;
      shaderMaterial.uniforms.uNoiseIntensity.value = config.noiseIntensity;
    }
  }, [config, shaderMaterial]);

  // Update video texture
  useEffect(() => {
    if (shaderMaterial && videoTexture) {
      shaderMaterial.uniforms.uVideoTexture.value = videoTexture;
    }
  }, [videoTexture, shaderMaterial]);

  // Animation frame - update time and audio
  useFrame((state) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
      
      // Smooth audio values
      shaderMaterial.uniforms.uAudioBass.value = THREE.MathUtils.lerp(
        shaderMaterial.uniforms.uAudioBass.value,
        audioAnalysis.bassLevel || 0,
        0.15
      );
      shaderMaterial.uniforms.uAudioMid.value = THREE.MathUtils.lerp(
        shaderMaterial.uniforms.uAudioMid.value,
        audioAnalysis.midLevel || 0,
        0.15
      );
      shaderMaterial.uniforms.uAudioTreble.value = THREE.MathUtils.lerp(
        shaderMaterial.uniforms.uAudioTreble.value,
        audioAnalysis.trebleLevel || 0,
        0.15
      );
      shaderMaterial.uniforms.uAudioVolume.value = THREE.MathUtils.lerp(
        shaderMaterial.uniforms.uAudioVolume.value,
        audioAnalysis.volume || 0,
        0.15
      );
    }
  });

  // Create high-detail plane geometry for displacement
  const geometry = useMemo(() => {
    // Use 64x64 segments for smooth waves
    return new THREE.PlaneGeometry(
      viewport.width,
      viewport.height,
      64,
      64
    );
  }, [viewport.width, viewport.height]);

  if (!videoTexture) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={shaderMaterial}
      position={[0, 0, 0]}
    />
  );
};

export default LiquidDisplacementMesh;
