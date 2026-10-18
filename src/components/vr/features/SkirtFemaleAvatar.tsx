/**
 * Temporary village avatar: the rigged "skirt female" (ani10.fbx, Character
 * Creator rig, 101 bones). The FBX ships only a T-Pose clip, so all movement
 * is procedural: bones are driven by name every frame — walk/run leg and arm
 * swing from real movement speed, head turn, aim pose when holding a weapon,
 * jump tuck and climbing steps. Untextured source, so a simple two-tone
 * material palette is applied until a textured model replaces it.
 */
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import ani10Url from '@/assets/models/ani10.fbx';

export type SkirtAnimState = 'idle' | 'walking' | 'running' | 'jumping' | 'climbing' | 'sitting';

interface SkirtFemaleAvatarProps {
  animState?: SkirtAnimState;
  /** Raise both arms into a two-hand weapon hold. */
  aiming?: boolean;
  /** Extra head turn (radians, + = look left). */
  headYaw?: number;
  targetHeight?: number;
  /** Corrective base rotation for the thigh bones (bind pose ships legs-up). */
  legFix?: [number, number, number];
}

type Bones = Record<string, THREE.Bone>;

const WANT = [
  'CC_Base_Hip', 'CC_Base_Waist', 'CC_Base_Spine02', 'CC_Base_NeckTwist01', 'CC_Base_Head',
  'CC_Base_L_Thigh', 'CC_Base_L_Calf', 'CC_Base_L_Foot',
  'CC_Base_R_Thigh', 'CC_Base_R_Calf', 'CC_Base_R_Foot',
  'CC_Base_L_Clavicle', 'CC_Base_L_Upperarm', 'CC_Base_L_Forearm', 'CC_Base_L_Hand',
  'CC_Base_R_Clavicle', 'CC_Base_R_Upperarm', 'CC_Base_R_Forearm', 'CC_Base_R_Hand',
];

export const SkirtFemaleAvatar: React.FC<SkirtFemaleAvatarProps> = ({
  animState = 'idle',
  aiming = false,
  headYaw = 0,
  targetHeight = 1.72,
  legFix = [0, 0, Math.PI],
}) => {
  const fbx = useLoader(FBXLoader, ani10Url) as THREE.Group;
  const root = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const last = useRef<THREE.Vector3 | null>(null);
  const speed = useRef(0);
  const tmp = useRef(new THREE.Vector3());

  const { model, bones } = useMemo(() => {
    const c = skeletonClone(fbx) as THREE.Group;
    const found: Bones = {};
    c.traverse((o) => {
      if ((o as THREE.Bone).isBone && WANT.includes(o.name)) found[o.name] = o as THREE.Bone;
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.frustumCulled = false; // skinned bounds are unreliable on this FBX
        const m = new THREE.MeshStandardMaterial({ color: '#c9a58a', roughness: 0.75, metalness: 0.05 });
        (o as THREE.Mesh).material = m;
      }
    });
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3(); box.getSize(size);
    const s = targetHeight / Math.max(size.y, 0.0001);
    const ctr = new THREE.Vector3(); box.getCenter(ctr);
    c.scale.setScalar(s);
    c.position.set(-ctr.x * s, -box.min.y * s, -ctr.z * s);
    return { model: c, bones: found };
  }, [fbx, targetHeight]);

  useFrame((state, dt) => {
    const g = root.current;
    if (!g || !bones.CC_Base_Hip) return;
    const d = Math.min(dt, 0.05);

    // Real speed from world movement (same trick as the jointed villagers).
    g.getWorldPosition(tmp.current);
    if (!last.current) last.current = tmp.current.clone();
    const v = Math.hypot(tmp.current.x - last.current.x, tmp.current.z - last.current.z) / Math.max(d, 1e-3);
    last.current.copy(tmp.current);
    speed.current += (Math.min(v, 12) - speed.current) * Math.min(1, d * 6);

    const run = animState === 'running' || speed.current > 6.5;
    const moving = animState === 'walking' || animState === 'running' || speed.current > 0.3;
    const climbing = animState === 'climbing';
    const jumping = animState === 'jumping';
    phase.current += d * (run ? 11 : 7) * Math.min(1, Math.max(speed.current, moving ? 1.5 : 0) / 1.5);
    const swing = Math.sin(phase.current);
    const amp = !moving && !climbing ? 0 : run ? 0.65 : 0.45;
    const t = state.clock.elapsedTime;

    const set = (name: string, x: number, y = 0, z = 0) => {
      const b = bones[name];
      if (b) b.rotation.set(x, y, z);
    };

    // ── Base standing pose: arms relaxed at the sides (source is a T-pose).
    let lArmX = 0, rArmX = 0, lArmZ = -1.15, rArmZ = 1.15, lElbow = 0, rElbow = 0;

    if (aiming) {
      // Two-hand weapon hold: both arms forward, right hand at the grip.
      lArmX = -1.15; rArmX = -1.25; lArmZ = -0.5; rArmZ = 0.35; lElbow = -0.5; rElbow = -0.35;
    } else if (moving || climbing) {
      lArmX = swing * amp * 0.7; rArmX = -swing * amp * 0.7;
      lElbow = -0.25; rElbow = -0.25;
    } else {
      // Idle breathing.
      lArmZ += Math.sin(t * 1.4) * 0.02; rArmZ -= Math.sin(t * 1.4) * 0.02;
    }

    set('CC_Base_L_Upperarm', lArmX, 0, lArmZ);
    set('CC_Base_R_Upperarm', rArmX, 0, rArmZ);
    set('CC_Base_L_Forearm', lElbow, 0, 0);
    set('CC_Base_R_Forearm', rElbow, 0, 0);

    // ── Legs. Bind pose on this FBX has the legs flipped; legFix corrects it.
    set('CC_Base_L_Thigh', legFix[0], legFix[1], legFix[2]);
    set('CC_Base_R_Thigh', legFix[0], legFix[1], legFix[2]);
    if (jumping) {
      set('CC_Base_L_Thigh', legFix[0] - 0.9); set('CC_Base_R_Thigh', legFix[0] - 0.9);
      set('CC_Base_L_Calf', 1.3); set('CC_Base_R_Calf', 1.3);
    } else if (climbing) {
      // Exaggerated alternating high steps.
      set('CC_Base_L_Thigh', legFix[0] - Math.abs(swing) * 1.0);
      set('CC_Base_R_Thigh', legFix[0] - Math.abs(Math.sin(phase.current + Math.PI)) * 1.0);
      set('CC_Base_L_Calf', Math.abs(swing) * 1.1);
      set('CC_Base_R_Calf', Math.abs(Math.sin(phase.current + Math.PI)) * 1.1);
    } else if (animState === 'sitting') {
      set('CC_Base_L_Thigh', legFix[0] - 1.5); set('CC_Base_R_Thigh', legFix[0] - 1.5);
      set('CC_Base_L_Calf', 1.4); set('CC_Base_R_Calf', 1.4);
    } else if (moving) {
      set('CC_Base_L_Thigh', legFix[0] + swing * amp);
      set('CC_Base_R_Thigh', legFix[0] - swing * amp);
      set('CC_Base_L_Calf', Math.max(0, -swing) * amp * 0.9);
      set('CC_Base_R_Calf', Math.max(0, swing) * amp * 0.9);
    } else {
      set('CC_Base_L_Thigh', legFix[0], legFix[1], legFix[2]); set('CC_Base_R_Thigh', legFix[0], legFix[1], legFix[2]);
      set('CC_Base_L_Calf', 0); set('CC_Base_R_Calf', 0);
    }

    // ── Torso lean + head turn.
    set('CC_Base_Waist', run ? 0.14 : moving ? 0.06 : Math.sin(t * 1.4) * 0.015, 0, 0);
    set('CC_Base_NeckTwist01', 0, THREE.MathUtils.clamp(headYaw, -1.1, 1.1) * 0.5, 0);
    set('CC_Base_Head', 0, THREE.MathUtils.clamp(headYaw, -1.1, 1.1) * 0.5, 0);
  });

  return (
    <group ref={root}>
      <primitive object={model} />
    </group>
  );
};

export default SkirtFemaleAvatar;
