// ═══════════════════════════════════════════════════════════════════════════════
// HUMANOID AVATAR - Realistic Leon-inspired 3D character
// Muscular build, detailed face with jawline/brow/cheekbones, proper hair,
// articulated fingers, leather jacket with holster, combat boots
// Separate wiring - independent hooks, no legacy dependencies
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// ─── Proportions (athletic adult male, ~1.82m) ──────────────────────────────
const B = {
  headR: 0.115,
  neckH: 0.07, neckR: 0.05,
  torsoW: 0.42, torsoH: 0.52, torsoD: 0.24,
  shoulderW: 0.52,
  upperArmL: 0.30, upperArmR: 0.048,
  forearmL: 0.27, forearmR: 0.042,
  handL: 0.10, handW: 0.065, handD: 0.032,
  hipW: 0.36, hipH: 0.16, hipD: 0.22,
  thighL: 0.44, thighR: 0.065,
  shinL: 0.42, shinR: 0.050,
  footL: 0.26, footH: 0.08, footW: 0.10,
};

const SKIN = '#e0a882';
const SKIN_DARK = '#c8926e';
const HAIR = '#6b5c3e'; // dirty blonde like Leon
const JACKET = '#2a2828';
const JACKET_LIGHT = '#3a3636';
const PANTS = '#1c1c2a';
const BOOT = '#1a1410';
const BELT = '#4a3728';
const HOLSTER = '#3a2a1e';
const GLOVE = '#2a2218';

export type AvatarAnimState = 'idle' | 'walking' | 'running' | 'sitting' | 'jumping';

interface HumanoidAvatarProps {
  position: THREE.Vector3;
  rotation: number;
  animState: AvatarAnimState;
  displayName?: string;
  isLocalPlayer?: boolean;
}

export const HumanoidAvatar: React.FC<HumanoidAvatarProps> = ({
  position, rotation, animState, displayName = 'Player', isLocalPlayer = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const lArmRef = useRef<THREE.Group>(null);
  const rArmRef = useRef<THREE.Group>(null);
  const lLegRef = useRef<THREE.Group>(null);
  const rLegRef = useRef<THREE.Group>(null);
  const lShinRef = useRef<THREE.Group>(null);
  const rShinRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.position.copy(position);
    groupRef.current.rotation.y = rotation;

    const t = state.clock.elapsedTime;
    let sp = 0, amp = 0, knee = 0;

    if (animState === 'walking') { sp = 4.5; amp = 0.5; knee = 0.55; }
    else if (animState === 'running') { sp = 8; amp = 0.85; knee = 0.95; }
    else if (animState === 'sitting') {
      if (lLegRef.current) lLegRef.current.rotation.x = -Math.PI / 2;
      if (rLegRef.current) rLegRef.current.rotation.x = -Math.PI / 2;
      if (lShinRef.current) lShinRef.current.rotation.x = Math.PI / 2;
      if (rShinRef.current) rShinRef.current.rotation.x = Math.PI / 2;
      if (lArmRef.current) lArmRef.current.rotation.x = -0.35;
      if (rArmRef.current) rArmRef.current.rotation.x = -0.35;
      return;
    }

    const swing = Math.sin(t * sp) * amp;
    const kSwing = Math.max(0, Math.sin(t * sp)) * knee;

    if (lLegRef.current) lLegRef.current.rotation.x = swing;
    if (rLegRef.current) rLegRef.current.rotation.x = -swing;
    if (lShinRef.current) lShinRef.current.rotation.x = swing > 0 ? -kSwing : 0;
    if (rShinRef.current) rShinRef.current.rotation.x = -swing > 0 ? -kSwing : 0;
    if (lArmRef.current) lArmRef.current.rotation.x = -swing * 0.65;
    if (rArmRef.current) rArmRef.current.rotation.x = swing * 0.65;

    if (animState === 'idle') {
      groupRef.current.position.y = position.y + Math.sin(t * 1.5) * 0.012;
    }
  });

  const baseY = B.footH + B.shinL + B.thighL + B.hipH;
  const nameColor = isLocalPlayer ? 'rgba(0,255,136,0.85)' : 'rgba(0,180,255,0.75)';

  return (
    <group ref={groupRef}>
      <group position={[0, baseY, 0]}>

        {/* ═══ HEAD ═══ */}
        <group position={[0, B.torsoH / 2 + B.neckH + B.headR, 0]}>
          {/* Skull - slightly oval */}
          <mesh scale={[1, 1.08, 1]}>
            <sphereGeometry args={[B.headR, 20, 16]} />
            <meshStandardMaterial color={SKIN} roughness={0.55} />
          </mesh>

          {/* Jawline - gives masculine square jaw */}
          <mesh position={[0, -0.06, 0.03]} scale={[1.1, 0.6, 0.9]}>
            <boxGeometry args={[0.16, 0.06, 0.14]} />
            <meshStandardMaterial color={SKIN} roughness={0.55} />
          </mesh>
          {/* Chin */}
          <mesh position={[0, -0.085, 0.06]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.55} />
          </mesh>

          {/* Brow ridge */}
          <mesh position={[0, 0.04, 0.095]} scale={[1, 0.4, 0.5]}>
            <boxGeometry args={[0.12, 0.025, 0.04]} />
            <meshStandardMaterial color={SKIN_DARK} roughness={0.6} />
          </mesh>
          {/* Eyebrows */}
          <mesh position={[-0.035, 0.045, 0.1]}>
            <boxGeometry args={[0.04, 0.006, 0.01]} />
            <meshStandardMaterial color={HAIR} roughness={0.9} />
          </mesh>
          <mesh position={[0.035, 0.045, 0.1]}>
            <boxGeometry args={[0.04, 0.006, 0.01]} />
            <meshStandardMaterial color={HAIR} roughness={0.9} />
          </mesh>

          {/* Cheekbones */}
          <mesh position={[-0.075, -0.01, 0.06]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.5} />
          </mesh>
          <mesh position={[0.075, -0.01, 0.06]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.5} />
          </mesh>

          {/* Eyes - more detailed with iris */}
          {[-1, 1].map(side => (
            <group key={`eye-${side}`} position={[side * 0.038, 0.025, 0.095]}>
              {/* Eye white */}
              <mesh>
                <sphereGeometry args={[0.014, 10, 10]} />
                <meshBasicMaterial color="#f0f0f0" />
              </mesh>
              {/* Iris */}
              <mesh position={[0, 0, 0.008]}>
                <sphereGeometry args={[0.009, 8, 8]} />
                <meshBasicMaterial color="#4a6e8a" />
              </mesh>
              {/* Pupil */}
              <mesh position={[0, 0, 0.013]}>
                <sphereGeometry args={[0.005, 6, 6]} />
                <meshBasicMaterial color="#1a1a1a" />
              </mesh>
              {/* Upper eyelid */}
              <mesh position={[0, 0.008, 0.006]} scale={[1.3, 0.4, 0.8]}>
                <sphereGeometry args={[0.012, 6, 4]} />
                <meshStandardMaterial color={SKIN_DARK} roughness={0.5} />
              </mesh>
            </group>
          ))}

          {/* Nose - more defined with bridge */}
          <mesh position={[0, 0, 0.11]} rotation={[0.25, 0, 0]}>
            <coneGeometry args={[0.015, 0.04, 6]} />
            <meshStandardMaterial color={SKIN} roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.015, 0.105]}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshStandardMaterial color={SKIN_DARK} roughness={0.5} />
          </mesh>
          {/* Nostrils */}
          {[-0.008, 0.008].map((x, i) => (
            <mesh key={i} position={[x, -0.02, 0.102]}>
              <sphereGeometry args={[0.005, 4, 4]} />
              <meshStandardMaterial color={SKIN_DARK} roughness={0.6} />
            </mesh>
          ))}

          {/* Mouth */}
          <mesh position={[0, -0.045, 0.095]}>
            <boxGeometry args={[0.04, 0.007, 0.008]} />
            <meshStandardMaterial color="#b5645a" roughness={0.4} />
          </mesh>
          {/* Lower lip */}
          <mesh position={[0, -0.052, 0.09]} scale={[1, 0.6, 1]}>
            <sphereGeometry args={[0.016, 6, 4]} />
            <meshStandardMaterial color="#c47068" roughness={0.4} />
          </mesh>

          {/* Ears */}
          {[-1, 1].map(side => (
            <group key={`ear-${side}`} position={[side * 0.115, -0.01, 0]}>
              <mesh>
                <sphereGeometry args={[0.022, 6, 6]} />
                <meshStandardMaterial color={SKIN} roughness={0.6} />
              </mesh>
              <mesh position={[0, 0, side * 0.005]}>
                <sphereGeometry args={[0.012, 4, 4]} />
                <meshStandardMaterial color={SKIN_DARK} roughness={0.6} />
              </mesh>
            </group>
          ))}

          {/* Hair - Leon's swept bangs style */}
          {/* Top hair mass */}
          <mesh position={[0, 0.05, -0.01]} scale={[1.15, 0.7, 1.1]}>
            <sphereGeometry args={[B.headR, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshStandardMaterial color={HAIR} roughness={0.92} />
          </mesh>
          {/* Side hair */}
          <mesh position={[-0.06, 0.02, 0.03]} scale={[0.5, 0.8, 0.9]}>
            <sphereGeometry args={[0.08, 8, 6]} />
            <meshStandardMaterial color={HAIR} roughness={0.92} />
          </mesh>
          <mesh position={[0.06, 0.02, 0.03]} scale={[0.5, 0.8, 0.9]}>
            <sphereGeometry args={[0.08, 8, 6]} />
            <meshStandardMaterial color={HAIR} roughness={0.92} />
          </mesh>
          {/* Swept fringe across forehead (Leon's iconic bangs) */}
          <mesh position={[0.03, 0.06, 0.09]} rotation={[0.3, -0.3, 0.15]} scale={[1.2, 0.35, 0.6]}>
            <boxGeometry args={[0.1, 0.04, 0.06]} />
            <meshStandardMaterial color={HAIR} roughness={0.9} />
          </mesh>
          <mesh position={[-0.02, 0.065, 0.085]} rotation={[0.2, 0.1, -0.1]} scale={[1, 0.3, 0.5]}>
            <boxGeometry args={[0.08, 0.035, 0.05]} />
            <meshStandardMaterial color={HAIR} roughness={0.9} />
          </mesh>
          {/* Back hair */}
          <mesh position={[0, -0.01, -0.08]} scale={[1.05, 0.9, 0.6]}>
            <sphereGeometry args={[B.headR * 0.95, 8, 8, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.5]} />
            <meshStandardMaterial color={HAIR} roughness={0.92} />
          </mesh>
        </group>

        {/* ═══ NECK (muscular) ═══ */}
        <mesh position={[0, B.torsoH / 2 + B.neckH / 2, 0]}>
          <cylinderGeometry args={[B.neckR, B.neckR + 0.01, B.neckH, 10]} />
          <meshStandardMaterial color={SKIN} roughness={0.55} />
        </mesh>
        {/* Neck tendons */}
        {[-0.025, 0.025].map((x, i) => (
          <mesh key={i} position={[x, B.torsoH / 2 + B.neckH / 2, 0.02]}>
            <cylinderGeometry args={[0.008, 0.01, B.neckH + 0.02, 4]} />
            <meshStandardMaterial color={SKIN_DARK} roughness={0.6} />
          </mesh>
        ))}

        {/* ═══ TORSO (tactical leather jacket) ═══ */}
        {/* Main torso - broader shoulders tapering to waist */}
        <mesh position={[0, 0.04, 0]} scale={[1, 1, 1]}>
          <boxGeometry args={[B.torsoW, B.torsoH, B.torsoD]} />
          <meshStandardMaterial color={JACKET} roughness={0.75} metalness={0.12} />
        </mesh>
        {/* Shoulder pads - broader muscular look */}
        {[-1, 1].map(side => (
          <mesh key={`sp-${side}`} position={[side * (B.torsoW / 2 + 0.01), B.torsoH / 2 - 0.06, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={JACKET_LIGHT} roughness={0.7} metalness={0.1} />
          </mesh>
        ))}
        {/* Jacket collar - high collar */}
        <mesh position={[0, B.torsoH / 2 - 0.01, 0.06]}>
          <boxGeometry args={[0.2, 0.07, 0.09]} />
          <meshStandardMaterial color={JACKET_LIGHT} roughness={0.75} />
        </mesh>
        {/* Zipper line */}
        <mesh position={[0, 0.04, B.torsoD / 2 + 0.001]}>
          <boxGeometry args={[0.006, B.torsoH - 0.03, 0.002]} />
          <meshStandardMaterial color="#666" metalness={0.85} roughness={0.15} />
        </mesh>
        {/* Chest pockets (tactical) */}
        {[-1, 1].map(side => (
          <group key={`pocket-${side}`}>
            <mesh position={[side * 0.1, 0.12, B.torsoD / 2 + 0.005]}>
              <boxGeometry args={[0.08, 0.06, 0.015]} />
              <meshStandardMaterial color={JACKET_LIGHT} roughness={0.8} />
            </mesh>
            <mesh position={[side * 0.1, 0.145, B.torsoD / 2 + 0.012]}>
              <boxGeometry args={[0.075, 0.008, 0.008]} />
              <meshStandardMaterial color="#555" metalness={0.5} />
            </mesh>
          </group>
        ))}
        {/* Shoulder holster straps */}
        <mesh position={[-0.12, 0.1, B.torsoD / 2 + 0.008]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.025, 0.35, 0.01]} />
          <meshStandardMaterial color={HOLSTER} roughness={0.7} />
        </mesh>
        <mesh position={[0.12, 0.1, B.torsoD / 2 + 0.008]} rotation={[0, 0, 0.35]}>
          <boxGeometry args={[0.025, 0.35, 0.01]} />
          <meshStandardMaterial color={HOLSTER} roughness={0.7} />
        </mesh>

        {/* ═══ BELT (tactical with pouches) ═══ */}
        <mesh position={[0, -B.torsoH / 2 - 0.01, 0]}>
          <boxGeometry args={[B.torsoW + 0.03, 0.04, B.torsoD + 0.03]} />
          <meshStandardMaterial color={BELT} roughness={0.5} metalness={0.25} />
        </mesh>
        {/* Belt buckle */}
        <mesh position={[0, -B.torsoH / 2 - 0.01, B.torsoD / 2 + 0.02]}>
          <boxGeometry args={[0.035, 0.03, 0.01]} />
          <meshStandardMaterial color="#c0a060" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Belt pouches */}
        {[-0.14, 0.14].map((x, i) => (
          <mesh key={i} position={[x, -B.torsoH / 2 - 0.03, B.torsoD / 2 + 0.01]}>
            <boxGeometry args={[0.05, 0.05, 0.03]} />
            <meshStandardMaterial color={HOLSTER} roughness={0.7} />
          </mesh>
        ))}

        {/* ═══ HIPS ═══ */}
        <mesh position={[0, -B.torsoH / 2 - B.hipH / 2 - 0.04, 0]}>
          <boxGeometry args={[B.hipW, B.hipH, B.hipD]} />
          <meshStandardMaterial color={PANTS} roughness={0.8} />
        </mesh>

        {/* ═══ LEFT ARM ═══ */}
        <group ref={lArmRef} position={[-B.shoulderW / 2, B.torsoH / 2 - 0.08, 0]}>
          {/* Upper arm */}
          <mesh position={[0, -B.upperArmL / 2, 0]}>
            <capsuleGeometry args={[B.upperArmR, B.upperArmL, 6, 10]} />
            <meshStandardMaterial color={JACKET} roughness={0.75} metalness={0.1} />
          </mesh>
          {/* Forearm (exposed skin - rolled sleeves) */}
          <mesh position={[0, -(B.upperArmL + B.forearmL / 2), 0]}>
            <capsuleGeometry args={[B.forearmR, B.forearmL, 6, 10]} />
            <meshStandardMaterial color={SKIN} roughness={0.5} />
          </mesh>
          {/* Fingerless glove + hand with fingers */}
          <group position={[0, -(B.upperArmL + B.forearmL + B.handL / 2), 0]}>
            {/* Palm */}
            <mesh>
              <boxGeometry args={[B.handW, B.handL * 0.6, B.handD]} />
              <meshStandardMaterial color={GLOVE} roughness={0.8} />
            </mesh>
            {/* Exposed fingertips (4 fingers) */}
            {[-0.02, -0.007, 0.007, 0.02].map((x, i) => (
              <mesh key={i} position={[x, -B.handL * 0.45, 0]}>
                <capsuleGeometry args={[0.006, 0.025, 3, 4]} />
                <meshStandardMaterial color={SKIN} roughness={0.5} />
              </mesh>
            ))}
            {/* Thumb */}
            <mesh position={[0.03, -0.01, 0.015]} rotation={[0, 0, 0.5]}>
              <capsuleGeometry args={[0.007, 0.025, 3, 4]} />
              <meshStandardMaterial color={SKIN} roughness={0.5} />
            </mesh>
          </group>
        </group>

        {/* ═══ RIGHT ARM ═══ */}
        <group ref={rArmRef} position={[B.shoulderW / 2, B.torsoH / 2 - 0.08, 0]}>
          <mesh position={[0, -B.upperArmL / 2, 0]}>
            <capsuleGeometry args={[B.upperArmR, B.upperArmL, 6, 10]} />
            <meshStandardMaterial color={JACKET} roughness={0.75} metalness={0.1} />
          </mesh>
          <mesh position={[0, -(B.upperArmL + B.forearmL / 2), 0]}>
            <capsuleGeometry args={[B.forearmR, B.forearmL, 6, 10]} />
            <meshStandardMaterial color={SKIN} roughness={0.5} />
          </mesh>
          <group position={[0, -(B.upperArmL + B.forearmL + B.handL / 2), 0]}>
            <mesh>
              <boxGeometry args={[B.handW, B.handL * 0.6, B.handD]} />
              <meshStandardMaterial color={GLOVE} roughness={0.8} />
            </mesh>
            {[-0.02, -0.007, 0.007, 0.02].map((x, i) => (
              <mesh key={i} position={[x, -B.handL * 0.45, 0]}>
                <capsuleGeometry args={[0.006, 0.025, 3, 4]} />
                <meshStandardMaterial color={SKIN} roughness={0.5} />
              </mesh>
            ))}
            <mesh position={[-0.03, -0.01, 0.015]} rotation={[0, 0, -0.5]}>
              <capsuleGeometry args={[0.007, 0.025, 3, 4]} />
              <meshStandardMaterial color={SKIN} roughness={0.5} />
            </mesh>
          </group>
        </group>

        {/* ═══ LEFT LEG ═══ */}
        <group ref={lLegRef} position={[-0.1, -B.torsoH / 2 - B.hipH - 0.04, 0]}>
          {/* Thigh */}
          <mesh position={[0, -B.thighL / 2, 0]}>
            <capsuleGeometry args={[B.thighR, B.thighL, 6, 10]} />
            <meshStandardMaterial color={PANTS} roughness={0.8} />
          </mesh>
          {/* Knee pad */}
          <mesh position={[0, -B.thighL, 0.03]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshStandardMaterial color={PANTS} roughness={0.7} />
          </mesh>
          {/* Shin */}
          <group ref={lShinRef} position={[0, -B.thighL, 0]}>
            <mesh position={[0, -B.shinL / 2, 0]}>
              <capsuleGeometry args={[B.shinR, B.shinL, 6, 10]} />
              <meshStandardMaterial color={PANTS} roughness={0.8} />
            </mesh>
            {/* Combat boot */}
            <group position={[0, -B.shinL, 0.03]}>
              <mesh>
                <boxGeometry args={[B.footW, B.footH, B.footL]} />
                <meshStandardMaterial color={BOOT} roughness={0.85} />
              </mesh>
              {/* Boot sole */}
              <mesh position={[0, -B.footH / 2, 0]}>
                <boxGeometry args={[B.footW + 0.01, 0.02, B.footL + 0.01]} />
                <meshStandardMaterial color="#111" roughness={0.95} />
              </mesh>
              {/* Boot laces */}
              <mesh position={[0, 0.02, B.footL / 2 - 0.02]}>
                <boxGeometry args={[0.03, 0.04, 0.01]} />
                <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
              </mesh>
            </group>
          </group>
        </group>

        {/* ═══ RIGHT LEG ═══ */}
        <group ref={rLegRef} position={[0.1, -B.torsoH / 2 - B.hipH - 0.04, 0]}>
          <mesh position={[0, -B.thighL / 2, 0]}>
            <capsuleGeometry args={[B.thighR, B.thighL, 6, 10]} />
            <meshStandardMaterial color={PANTS} roughness={0.8} />
          </mesh>
          <mesh position={[0, -B.thighL, 0.03]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshStandardMaterial color={PANTS} roughness={0.7} />
          </mesh>
          <group ref={rShinRef} position={[0, -B.thighL, 0]}>
            <mesh position={[0, -B.shinL / 2, 0]}>
              <capsuleGeometry args={[B.shinR, B.shinL, 6, 10]} />
              <meshStandardMaterial color={PANTS} roughness={0.8} />
            </mesh>
            <group position={[0, -B.shinL, 0.03]}>
              <mesh>
                <boxGeometry args={[B.footW, B.footH, B.footL]} />
                <meshStandardMaterial color={BOOT} roughness={0.85} />
              </mesh>
              <mesh position={[0, -B.footH / 2, 0]}>
                <boxGeometry args={[B.footW + 0.01, 0.02, B.footL + 0.01]} />
                <meshStandardMaterial color="#111" roughness={0.95} />
              </mesh>
              <mesh position={[0, 0.02, B.footL / 2 - 0.02]}>
                <boxGeometry args={[0.03, 0.04, 0.01]} />
                <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
              </mesh>
            </group>
          </group>
        </group>

        {/* ═══ NAME TAG ═══ */}
        <Html
          position={[0, B.torsoH / 2 + B.neckH + B.headR * 2 + 0.2, 0]}
          center
          sprite
           distanceFactor={80}
           occlude={false}
           style={{ pointerEvents: 'none' }}
         >
           <span className="whitespace-nowrap rounded-full bg-background/40 px-0.5 text-[3px] font-mono font-medium leading-none text-foreground">
            {displayName}
          </span>
        </Html>
      </group>
    </group>
  );
};

export default HumanoidAvatar;
