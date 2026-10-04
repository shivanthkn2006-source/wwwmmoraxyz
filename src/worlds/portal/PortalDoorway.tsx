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
void main(){
  vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
  float swirl = sin(a * 4.0 + r * 10.0 - uTime * 2.5) * 0.5 + 0.5;
  vec3 blue = vec3(0.22, 0.48, 0.96); vec3 white = vec3(0.88, 0.92, 1.0);
  vec3 col = mix(blue, white, swirl * (1.0 - r));
  float alpha = smoothstep(1.0, 0.75, r) * 0.9;
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
      <mesh position={[0, 1.6, 0]}>
        <torusGeometry args={[1.45, 0.08, 8, 48]} />
        <meshStandardMaterial color="#387BF6" emissive="#387BF6" emissiveIntensity={1.2} />
      </mesh>
      <Html position={[0, 3.6, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
        <div className="surface-warm-tan rounded-full px-3 py-1 text-[11px] whitespace-nowrap text-white">🚪 {label}</div>
      </Html>
    </group>
  );
};
