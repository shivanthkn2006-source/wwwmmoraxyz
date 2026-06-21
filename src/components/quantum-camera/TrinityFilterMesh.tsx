// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: Trinity Filter Mesh Component
// React Three Fiber mesh that applies Trinity filters to video texture
// Connects to ECN and God Mode security for real-time bio-feedback visualization
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  chronosEchoFragment,
  dhfSoulRayFragment,
  quantumFluxFragment,
  trinityFilterVertex,
  TrinityFilterType,
  TrinityFilterConfig,
} from './TrinityFilterShaders';

interface TrinityFilterMeshProps {
  videoTexture: THREE.VideoTexture | null;
  filterType: TrinityFilterType;
  config: TrinityFilterConfig;
  prevFrames?: THREE.Texture[]; // For Chronos Echo time trails
}

const TrinityFilterMesh: React.FC<TrinityFilterMeshProps> = ({
  videoTexture,
  filterType,
  config,
  prevFrames = [],
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  // Create shader material based on active filter
  const shaderMaterial = useMemo(() => {
    let fragmentShader = '';
    const uniforms: Record<string, THREE.IUniform> = {
      uVideoTexture: { value: null },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1920, 1080) },
    };

    switch (filterType) {
      case 'chronos-echo':
        fragmentShader = chronosEchoFragment;
        uniforms.uPrevFrame1 = { value: null };
        uniforms.uPrevFrame2 = { value: null };
        uniforms.uPrevFrame3 = { value: null };
        uniforms.uLatency = { value: config.latency || 20 };
        uniforms.uRollingHash = { value: config.rollingHash || 0 };
        break;

      case 'dhf-soul-ray':
        fragmentShader = dhfSoulRayFragment;
        uniforms.uStressLevel = { value: config.stressLevel || 0 };
        uniforms.uFlowLevel = { value: config.flowLevel || 0.5 };
        uniforms.uEmotionValence = { value: config.emotionValence || 0 };
        uniforms.uEmotionArousal = { value: config.emotionArousal || 0.3 };
        break;

      case 'quantum-flux':
        fragmentShader = quantumFluxFragment;
        uniforms.uEncryptionKey = { value: config.encryptionKey || 0 };
        uniforms.uDecryptionMatch = { value: config.decryptionMatch || 1 };
        uniforms.uSecurityLevel = { value: config.securityLevel || 1 };
        uniforms.uGlitchMode = { value: 0 };
        break;

      default:
        return null;
    }

    return new THREE.ShaderMaterial({
      vertexShader: trinityFilterVertex,
      fragmentShader,
      uniforms,
      side: THREE.DoubleSide,
    });
  }, [filterType]);

  // Update video texture
  useEffect(() => {
    if (shaderMaterial && videoTexture) {
      shaderMaterial.uniforms.uVideoTexture.value = videoTexture;
    }
  }, [videoTexture, shaderMaterial]);

  // Update prev frames for Chronos Echo
  useEffect(() => {
    if (shaderMaterial && filterType === 'chronos-echo' && prevFrames.length >= 3) {
      shaderMaterial.uniforms.uPrevFrame1.value = prevFrames[0];
      shaderMaterial.uniforms.uPrevFrame2.value = prevFrames[1];
      shaderMaterial.uniforms.uPrevFrame3.value = prevFrames[2];
    }
  }, [prevFrames, shaderMaterial, filterType]);

  // Update config uniforms every frame
  useFrame((state) => {
    if (!shaderMaterial) return;

    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    shaderMaterial.uniforms.uResolution.value.set(viewport.width * 100, viewport.height * 100);

    switch (filterType) {
      case 'chronos-echo':
        shaderMaterial.uniforms.uLatency.value = THREE.MathUtils.lerp(
          shaderMaterial.uniforms.uLatency.value,
          config.latency || 20,
          0.1
        );
        shaderMaterial.uniforms.uRollingHash.value = config.rollingHash || 0;
        break;

      case 'dhf-soul-ray':
        // Smooth ECN transitions
        shaderMaterial.uniforms.uStressLevel.value = THREE.MathUtils.lerp(
          shaderMaterial.uniforms.uStressLevel.value,
          config.stressLevel || 0,
          0.05
        );
        shaderMaterial.uniforms.uFlowLevel.value = THREE.MathUtils.lerp(
          shaderMaterial.uniforms.uFlowLevel.value,
          config.flowLevel || 0.5,
          0.05
        );
        shaderMaterial.uniforms.uEmotionValence.value = THREE.MathUtils.lerp(
          shaderMaterial.uniforms.uEmotionValence.value,
          config.emotionValence || 0,
          0.08
        );
        shaderMaterial.uniforms.uEmotionArousal.value = THREE.MathUtils.lerp(
          shaderMaterial.uniforms.uEmotionArousal.value,
          config.emotionArousal || 0.3,
          0.08
        );
        break;

      case 'quantum-flux':
        shaderMaterial.uniforms.uEncryptionKey.value = config.encryptionKey || 0;
        shaderMaterial.uniforms.uDecryptionMatch.value = THREE.MathUtils.lerp(
          shaderMaterial.uniforms.uDecryptionMatch.value,
          config.decryptionMatch || 1,
          0.05
        );
        shaderMaterial.uniforms.uSecurityLevel.value = THREE.MathUtils.lerp(
          shaderMaterial.uniforms.uSecurityLevel.value,
          config.securityLevel || 1,
          0.1
        );
        break;
    }
  });

  // Create geometry
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(viewport.width, viewport.height, 1, 1);
  }, [viewport.width, viewport.height]);

  if (!videoTexture || !shaderMaterial || filterType === 'none') return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={shaderMaterial}
      position={[0, 0, 0]}
    />
  );
};

export default TrinityFilterMesh;
