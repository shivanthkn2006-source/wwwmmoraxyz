/**
 * Glowing doorway between worlds. Walking through it (camera within 1.4 m)
 * fires once, then re-arms only after the player walks 4 m away.
 * Pure procedural GLSL — no textures, cheap on phones.
 */
import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { portalStep } from '../worldMode';

const vertex = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const fragment = `
uniform float uTime; varying vec2 vUv;
// Swirling white-blue vortex (no frame): bright rippled rim spinning into a deep blue eye.
void main(){
  vec2 p = (vUv - 0.5) * vec2(2.0, 2.0 * 1.33); float r = length(p); float a = atan(p.y, p.x);
  float spin = a + uTime * 1.6 - r * 5.0;
  float ripples = sin(spin * 6.0 + sin(r * 14.0 - uTime * 3.0) * 1.5) * 0.5 + 0.5;
  float sparks = pow(sin(spin * 13.0 - r * 22.0) * 0.5 + 0.5, 8.0);
  vec3 deep = vec3(0.10, 0.30, 0.78); vec3 blue = vec3(0.35, 0.62, 0.98); vec3 white = vec3(0.95, 0.98, 1.0);
  float rim = smoothstep(0.35, 0.95, r);
  vec3 col = mix(deep, blue, smoothstep(0.0, 0.5, r));
  col = mix(col, white, rim * (0.55 + 0.45 * ripples) + sparks * 0.6);
  float alpha = (1.0 - smoothstep(0.88, 1.0, r)) * 0.95;
  gl_FragColor = vec4(col, alpha);
}`;

export const PortalDoorway: React.FC<{
  position: [number, number, number];
  label: string;
  onEnter: (fromPos: [number, number, number]) => void;
}> = ({ position, label, onEnter }) => {
  const { camera } = useThree();
  const armed = useRef(false);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, vertexShader: vertex, fragmentShader: fragment,
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  }), []);
  React.useEffect(() => () => mat.dispose(), [mat]);

  useFrame((_, dt) => {
    mat.uniforms.uTime.value += Math.min(dt, 0.05);
    const dist = Math.hypot(camera.position.x - position[0], camera.position.z - position[2]);
    const step = portalStep(armed.current, dist);
    armed.current = step.armed;
    if (step.fire) onEnter([camera.position.x, camera.position.y, camera.position.z]);
  });

  return (
    <group position={position}>
      <mesh position={[0, 1.6, 0]} material={mat}>
        <planeGeometry args={[2.4, 3.2]} />
      </mesh>
      <Html position={[0, 3.6, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
        <div className="surface-warm-tan rounded-full px-3 py-1 text-[11px] whitespace-nowrap text-white">🚪 {label}</div>
      </Html>
    </group>
  );
};
