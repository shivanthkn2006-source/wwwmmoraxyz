/**
 * Light third-person avatar: a jointed figure drawn just ahead of the camera,
 * so you see yourself from behind. Legs and arms swing with real movement
 * speed (walk / run), crouch bends the knees and lowers the body, and a
 * short reach plays when you pick something up. ~12 simple meshes, no model
 * download, so it costs almost nothing on basic phones.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWorldState } from '@/worlds/worldMode';
import { useVRView, wireVRViewKeys } from '@/lib/vrView';
import { useVRSelf } from '@/lib/vrSelf';
import { HUMAN_COLORS as HC, HUMAN_MATERIAL, headGeometry } from '@/lib/vrHumanLook';

const HEAD = headGeometry();
const HEAD_F = headGeometry(true);

const AHEAD = 2.8;
// Your own avatar matches the item-case portrait (other people keep the shared look):
// navy shirt with sleeves rolled, yellow-edged collar, brown leather shoulder
// holster and thigh holster, tan belt with steel buckle, off-white trousers, brown boots.
const SKIN = HC.skin, SHIRT = '#22305a', PANTS = '#e4dfd3', SHOE = '#3a2618';

export const ThirdPersonAvatar: React.FC = () => {
  const { thirdPerson, crouch } = useVRView();
  const { female } = useVRSelf();
  const { camera } = useThree();
  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null), legR = useRef<THREE.Group>(null);
  const shinL = useRef<THREE.Group>(null), shinR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null), armR = useRef<THREE.Group>(null);
  const last = useRef(new THREE.Vector3());
  const phase = useRef(0);
  const speed = useRef(0);
  const reach = useRef(0);
  const crouchAmt = useRef(0);
  const mats = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.7 }),
    shirt: new THREE.MeshStandardMaterial({ color: SHIRT, roughness: 0.6 }),
    pants: new THREE.MeshStandardMaterial({ color: PANTS, roughness: 0.8 }),
    shoe: new THREE.MeshStandardMaterial({ color: SHOE, roughness: 0.9 }),
    trim: new THREE.MeshStandardMaterial({ color: '#c9a227', roughness: 0.6 }),
    leather: new THREE.MeshStandardMaterial({ color: '#5a3520', roughness: 0.55 }),
    belt: new THREE.MeshStandardMaterial({ color: '#a8823c', roughness: 0.5 }),
    steel: new THREE.MeshStandardMaterial({ color: '#b8bcc0', metalness: 0.8, roughness: 0.3 }),
    hair: new THREE.MeshStandardMaterial({ color: HC.hair, roughness: 0.9 }),
  }), []);

  useEffect(() => { wireVRViewKeys(); }, []);
  useEffect(() => {
    const onPick = () => { reach.current = 1; };
    window.addEventListener('vr-item-pickup', onPick);
    window.addEventListener('vr-hand-reach', onPick);
    return () => { window.removeEventListener('vr-item-pickup', onPick); window.removeEventListener('vr-hand-reach', onPick); };
  }, []);

  useFrame((_, dt) => {
    const g = root.current;
    if (!g || !thirdPerson) return;
    const d = Math.min(dt, 0.1);
    const yaw = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const ground = Math.max(0, camera.position.y - 1.6);
    // Only stand on a real street: hidden during the aerial view, before the
    // first street block has loaded, or while the camera is high above ground.
    const w = getWorldState();
    g.visible = !(w.mode === 'real' && (w.aerial || w.chunksLoaded === 0 || ground > 8));
    if (!g.visible) return;
    g.position.set(camera.position.x + fx * AHEAD, ground, camera.position.z + fz * AHEAD);
    g.rotation.y = yaw + Math.PI;
    // Real speed from how far the camera moved.
    const moved = Math.hypot(camera.position.x - last.current.x, camera.position.z - last.current.z) / Math.max(d, 1e-3);
    last.current.copy(camera.position);
    speed.current += (Math.min(moved, 12) - speed.current) * Math.min(1, d * 8);
    const run = speed.current > 6.5;
    phase.current += d * (run ? 11 : 7) * Math.min(1, speed.current / 2);
    const amp = speed.current < 0.3 ? 0 : run ? 0.9 : 0.55;
    crouchAmt.current += ((crouch ? 1 : 0) - crouchAmt.current) * Math.min(1, d * 8);
    const c = crouchAmt.current;
    const s = Math.sin(phase.current) * amp;
    if (hips.current) { hips.current.position.y = 0.95 - c * 0.38 + Math.abs(Math.cos(phase.current)) * amp * 0.05; hips.current.rotation.x = run ? 0.18 : c * 0.35; }
    if (legL.current) legL.current.rotation.x = s - c * 1.1;
    if (legR.current) legR.current.rotation.x = -s - c * 1.1;
    if (shinL.current) shinL.current.rotation.x = Math.max(0, -s) * 0.9 + c * 1.9;
    if (shinR.current) shinR.current.rotation.x = Math.max(0, s) * 0.9 + c * 1.9;
    reach.current = Math.max(0, reach.current - d * 1.6);
    const r = Math.sin(reach.current * Math.PI);
    if (armL.current) armL.current.rotation.x = -s * 0.8;
    if (armR.current) armR.current.rotation.x = s * 0.8 - r * 1.4;
  });

  if (!thirdPerson) return null;
  return (
    <group ref={root}>
      <group ref={hips} position={[0, 0.95, 0]}>
        <mesh position={[0, 0.32, 0]} material={mats.shirt}><boxGeometry args={[0.44, 0.6, 0.25]} /></mesh>
        <mesh position={[0, 0.78, 0]} geometry={female ? HEAD_F : HEAD} material={HUMAN_MATERIAL} />
        {/* stand-up collar with yellow edge */}
        <mesh position={[0, 0.63, 0]} material={mats.shirt}><cylinderGeometry args={[0.085, 0.1, 0.07, 10]} /></mesh>
        <mesh position={[0, 0.665, 0]} material={mats.trim}><torusGeometry args={[0.087, 0.008, 4, 14]} /></mesh>
        {/* shoulder holster: straps over both shoulders, cross on the back, pouches under the arms */}
        {[-1, 1].map((sx) => <mesh key={`st${sx}`} position={[sx * 0.11, 0.38, 0.13]} rotation={[0, 0, sx * 0.12]} material={mats.leather}><boxGeometry args={[0.05, 0.5, 0.012]} /></mesh>)}
        {[-1, 1].map((sx) => <mesh key={`sb${sx}`} position={[0, 0.36, -0.13]} rotation={[0, 0, sx * 0.75]} material={mats.leather}><boxGeometry args={[0.05, 0.55, 0.012]} /></mesh>)}
        <mesh position={[0, 0.36, -0.137]} material={mats.steel}><cylinderGeometry args={[0.03, 0.03, 0.01, 10]} /></mesh>
        {[-1, 1].map((sx) => <mesh key={`pp${sx}`} position={[sx * 0.23, 0.26, 0]} material={mats.leather}><boxGeometry args={[0.06, 0.18, 0.12]} /></mesh>)}
        {/* tan belt with steel buckle */}
        <mesh position={[0, 0.03, 0]} material={mats.belt}><boxGeometry args={[0.45, 0.07, 0.26]} /></mesh>
        <mesh position={[0, 0.03, 0.132]} material={mats.steel}><boxGeometry args={[0.07, 0.05, 0.01]} /></mesh>
        {([[armL, -0.28], [armR, 0.28]] as const).map(([ref, x], i) => (
          <group key={i} ref={ref} position={[x, 0.58, 0]}>
            <mesh position={[0, -0.17, 0]} material={mats.shirt}><capsuleGeometry args={[0.068, 0.26, 4, 8]} /></mesh>
            <mesh position={[0, -0.33, 0]} material={mats.shirt}><cylinderGeometry args={[0.074, 0.074, 0.06, 8]} /></mesh>
            <mesh position={[0, -0.44, 0]} material={mats.skin}><capsuleGeometry args={[0.052, 0.16, 4, 8]} /></mesh>
            <mesh position={[0, -0.58, 0]} material={mats.skin}><sphereGeometry args={[0.058, 8, 8]} /></mesh>
          </group>
        ))}
        {([[legL, shinL, -0.11], [legR, shinR, 0.11]] as const).map(([leg, shin, x], i) => (
          <group key={i} ref={leg} position={[x, 0, 0]}>
            <mesh position={[0, -0.22, 0]} material={mats.pants}><capsuleGeometry args={[0.08, 0.34, 4, 8]} /></mesh>
            {i === 1 && <>
              {/* thigh holster on the right leg with two straps */}
              <mesh position={[0.07, -0.2, 0.02]} material={mats.leather}><boxGeometry args={[0.07, 0.24, 0.14]} /></mesh>
              {[-0.12, -0.28].map((y) => <mesh key={y} position={[0, y, 0]} material={mats.leather}><cylinderGeometry args={[0.088, 0.088, 0.035, 10]} /></mesh>)}
            </>}
            <group ref={shin} position={[0, -0.45, 0]}>
              <mesh position={[0, -0.2, 0]} material={mats.pants}><capsuleGeometry args={[0.07, 0.32, 4, 8]} /></mesh>
              <mesh position={[0, -0.36, 0]} material={mats.shoe}><cylinderGeometry args={[0.075, 0.08, 0.12, 8]} /></mesh>
              <mesh position={[0, -0.44, 0.05]} material={mats.shoe}><boxGeometry args={[0.13, 0.08, 0.27]} /></mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
};
export default ThirdPersonAvatar;
