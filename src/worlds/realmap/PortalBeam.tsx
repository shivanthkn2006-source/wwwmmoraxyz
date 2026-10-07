/**
 * Avengers-style light column above a Real Map portal: a 50 m tall glowing beam
 * that fades in as the player comes within range, so the portal is easy to find.
 * Two additive open cylinders (core + halo), no lights, so it stays phone-cheap.
 */
import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const BEAM_HEIGHT_M = 50;
const SHOW_WITHIN_M = 600;

const vertex = `varying float vH; void main(){ vH = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const fragment = `uniform vec3 uColor; uniform float uAlpha; uniform float uTime; varying float vH;
void main(){ float fade = (1.0 - vH) * (0.75 + 0.25 * sin(uTime * 3.0 - vH * 20.0)); gl_FragColor = vec4(uColor, fade * uAlpha); }`;

function beamMat(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uAlpha: { value: 0 }, uTime: { value: 0 } },
    vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

export const PortalBeam: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const { camera } = useThree();
  const core = useMemo(() => beamMat('#bfe3ff'), []);
  const halo = useMemo(() => beamMat('#3b8cff'), []);
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const d = Math.hypot(camera.position.x - position[0], camera.position.z - position[2]);
    const target = d < SHOW_WITHIN_M ? 1 : 0;
    for (const [m, max] of [[core, 0.9], [halo, 0.45]] as const) {
      const u = m.uniforms;
      u.uTime.value += dt;
      u.uAlpha.value += (target * max - u.uAlpha.value) * Math.min(1, dt * 3);
    }
    if (group.current) group.current.visible = core.uniforms.uAlpha.value > 0.01;
  });
  return (
    <group ref={group} position={[position[0], BEAM_HEIGHT_M / 2, position[2]]} visible={false}>
      <mesh material={core}><cylinderGeometry args={[0.6, 0.6, BEAM_HEIGHT_M, 16, 1, true]} /></mesh>
      <mesh material={halo}><cylinderGeometry args={[2.2, 1.6, BEAM_HEIGHT_M, 16, 1, true]} /></mesh>
    </group>
  );
};
