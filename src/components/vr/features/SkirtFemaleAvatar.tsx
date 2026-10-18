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
import { avatarMotion } from '@/lib/vrAvatarMotion';
import { createWeaponArmSolver, gripFrame, isLongGun, W870_GRIP_OFFSET, type GripFrame, type HeldWeapon } from '@/lib/vrWeaponGrip';

/** Upright correction (rad, split over waist/spine); +X bends this rig forward, so camera-down pitch is negated for the head. */
const STANCE_LEAN = 0.32;
/** Bladed stance: torso turns so the support shoulder comes forward. */
const STANCE_TWIST = -0.5;
import { W870Model } from './W870Model';

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
  armProbe?: [number, number, number];
  liveMotion?: boolean;
  holdingW870?: boolean;
  /** Gun drawn in the hands (overrides holdingW870). */
  heldWeapon?: HeldWeapon | null;
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
  armProbe,
  liveMotion = false,
  holdingW870 = false,
  heldWeapon,
}) => {
  const held: HeldWeapon | null = heldWeapon !== undefined ? heldWeapon : holdingW870 ? 'w870' : null;
  const fbx = useLoader(FBXLoader, ani10Url) as THREE.Group;
  const root = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const last = useRef<THREE.Vector3 | null>(null);
  const speed = useRef(0);
  const tmp = useRef(new THREE.Vector3());
  const weapon = useRef<THREE.Group>(null);
  const shoulder = useMemo(() => new THREE.Vector3(), []);
  const heldBefore = useRef(false);
  const frame = useMemo<GripFrame>(() => ({ weapon: new THREE.Vector3(), right: new THREE.Vector3(), left: new THREE.Vector3() }), []);

  const { model, bones } = useMemo(() => {
    const c = skeletonClone(fbx) as THREE.Group;
    const found: Bones = {};
    c.traverse((o) => {
      if ((o as THREE.Bone).isBone) found[o.name] = o as THREE.Bone;
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
  const armSolver = useMemo(() => createWeaponArmSolver(model), [model]);

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

    const pose = liveMotion ? avatarMotion.pose : animState;
    const run = pose === 'running' || (!liveMotion && speed.current > 6.5);
    const moving = pose === 'walking' || pose === 'running' || (!liveMotion && speed.current > 0.3);
    const climbing = pose === 'climbing';
    const jumping = pose === 'jumping';
    phase.current += d * (run ? 11 : 7) * Math.min(1, Math.max(speed.current, moving ? 1.5 : 0) / 1.5);
    const swing = Math.sin(phase.current);
    const amp = !moving && !climbing ? 0 : run ? 0.65 : 0.45;
    const t = state.clock.elapsedTime;
    let lArmY = 0, rArmY = 0;

    const set = (name: string, x: number, y = 0, z = 0) => {
      const b = bones[name];
      if (b) b.rotation.set(x, y, z);
    };

    // ── Base standing pose: arms relaxed at the sides (source is a T-pose).
    let lArmX = 0, rArmX = 0, lArmZ = -1.15, rArmZ = 1.15, lElbow = 0, rElbow = 0;
    let lArmTwist = 0, rArmTwist = 0;

    if (aiming && !held) {
      // Two-hand weapon hold: both arms forward, right hand at the grip.
      lArmX = 1.3; rArmX = 1.3; lArmZ = -0.3; rArmZ = 0.3; lElbow = 0.45; rElbow = 0.45;
    } else if (moving || climbing) {
      lArmX = swing * amp * 0.7; rArmX = -swing * amp * 0.7;
      lElbow = -0.25; rElbow = -0.25;
    } else {
      // Idle breathing.
      lArmZ += Math.sin(t * 1.4) * 0.02; rArmZ -= Math.sin(t * 1.4) * 0.02;
    }

    if (liveMotion) {
      const attack = Math.max(0, 1 - (performance.now() - avatarMotion.attackAt) / 350);
      if (attack > 0) { rArmX -= attack * 0.35; lArmX -= aiming ? attack * 0.2 : 0; }
    }

    if (armProbe) set('CC_Base_L_Upperarm', armProbe[0], armProbe[1], armProbe[2]);
    else set('CC_Base_L_Upperarm', lArmX, lArmTwist, lArmZ);
    set('CC_Base_R_Upperarm', rArmX, rArmTwist, rArmZ);
    set('CC_Base_L_Forearm', lElbow, 0, 0);
    set('CC_Base_R_Forearm', rElbow, 0, 0);

    // ── Legs. Bind pose on this FBX has the legs flipped; legFix corrects it.
    set('CC_Base_L_Thigh', legFix[0], legFix[1], legFix[2]);
    set('CC_Base_R_Thigh', legFix[0], legFix[1], legFix[2]);
    if (jumping) {
      set('CC_Base_L_Thigh', legFix[0] - 0.9, legFix[1], legFix[2]); set('CC_Base_R_Thigh', legFix[0] - 0.9, legFix[1], legFix[2]);
      set('CC_Base_L_Calf', 1.3); set('CC_Base_R_Calf', 1.3);
    } else if (climbing) {
      // Exaggerated alternating high steps.
      set('CC_Base_L_Thigh', legFix[0] - Math.abs(swing) * 1.0, legFix[1], legFix[2]);
      set('CC_Base_R_Thigh', legFix[0] - Math.abs(Math.sin(phase.current + Math.PI)) * 1.0, legFix[1], legFix[2]);
      set('CC_Base_L_Calf', Math.abs(swing) * 1.1);
      set('CC_Base_R_Calf', Math.abs(Math.sin(phase.current + Math.PI)) * 1.1);
    } else if (pose === 'sitting') {
      set('CC_Base_L_Thigh', legFix[0] - 1.5, legFix[1], legFix[2]); set('CC_Base_R_Thigh', legFix[0] - 1.5, legFix[1], legFix[2]);
      set('CC_Base_L_Calf', 1.4); set('CC_Base_R_Calf', 1.4);
    } else if (moving) {
      set('CC_Base_L_Thigh', legFix[0] + swing * amp, legFix[1], legFix[2]);
      set('CC_Base_R_Thigh', legFix[0] - swing * amp, legFix[1], legFix[2]);
      set('CC_Base_L_Calf', Math.max(0, -swing) * amp * 0.9);
      set('CC_Base_R_Calf', Math.max(0, swing) * amp * 0.9);
    } else {
      set('CC_Base_L_Thigh', legFix[0], legFix[1], legFix[2]); set('CC_Base_R_Thigh', legFix[0], legFix[1], legFix[2]);
      set('CC_Base_L_Calf', 0); set('CC_Base_R_Calf', 0);
    }

    // ── Torso lean + head turn.
    // The source bind pose arches backward (head ~17 cm behind hips); stand her upright.
    set('CC_Base_Waist', (run ? 0.14 : moving ? 0.06 : Math.sin(t * 1.4) * 0.015) + STANCE_LEAN * 0.5, 0, 0);
    set('CC_Base_Spine02', STANCE_LEAN * 0.5, 0, 0);
    set('CC_Base_NeckTwist01', 0, THREE.MathUtils.clamp(headYaw, -1.1, 1.1) * 0.5, 0);
    set('CC_Base_Head', (liveMotion ? -avatarMotion.headPitch : 0) + STANCE_LEAN * 0.4, THREE.MathUtils.clamp(headYaw, -1.1, 1.1) * 0.5, 0);
    if (held && weapon.current && armSolver && bones.CC_Base_R_Upperarm) {
      // Lean into the gun (source bind pose arches backward), then build the
      // hold frame from the live shoulder so the stock rests on it.
      const lean = isLongGun(held) ? STANCE_LEAN : STANCE_LEAN * 0.6;
      const twist = isLongGun(held) ? STANCE_TWIST : STANCE_TWIST * 0.3;
      const look = THREE.MathUtils.clamp(headYaw, -1.1, 1.1) * 0.5;
      set('CC_Base_Waist', (run ? 0.14 : moving ? 0.06 : 0) + lean * 0.5, twist * 0.5, 0);
      set('CC_Base_Spine02', lean * 0.5, twist * 0.5, 0);
      // Neck/head turn back so she still looks down the barrel.
      set('CC_Base_NeckTwist01', 0, look - twist * 0.6, 0);
      set('CC_Base_Head', (liveMotion ? -avatarMotion.headPitch : 0) + lean * 0.4, look - twist * 0.4, 0);
      g.updateWorldMatrix(true, true);
      g.worldToLocal(bones.CC_Base_R_Upperarm.getWorldPosition(shoulder));
      const kick = Math.max(0, 1 - (performance.now() - avatarMotion.attackAt) / 180);
      gripFrame(held, shoulder, kick, frame);
      weapon.current.position.copy(frame.weapon);
      weapon.current.rotation.set(0, -Math.PI / 2, (isLongGun(held) ? 0.03 : 0.02) + kick * 0.045);
      armSolver.solve(g, frame.right, frame.left);
    } else if (heldBefore.current) armSolver?.relax();
    heldBefore.current = !!held;
  });

  return (
    <group ref={root}>
      <primitive object={model} />
      {held && <group ref={weapon} name="w870-held-grip">
        {held === 'w870' ? <group position={W870_GRIP_OFFSET}><W870Model /></group>
          : held === 'shotgun' ? <mesh position={[0.058, 0.075, 0]}><boxGeometry args={[0.75, 0.07, 0.05]} /><meshStandardMaterial color="#3b2a1c" /></mesh>
          : held === 'pistol' ? <mesh position={[0.07, 0.02, 0]}><boxGeometry args={[0.2, 0.09, 0.04]} /><meshStandardMaterial color="#222" metalness={0.7} /></mesh>
          : null}
      </group>}
    </group>
  );
};

export default SkirtFemaleAvatar;
