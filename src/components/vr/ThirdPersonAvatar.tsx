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
const SKIN = HC.skin, SHIRT = HC.top, PANTS = HC.trousers, SHOE = HC.shoe;

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
    trim: new THREE.MeshStandardMaterial({ color: HC.trim, roughness: 0.6 }),
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
        <mesh position={[0, 0.32, 0]} material={mats.shirt}><boxGeometry args={[0.42, 0.6, 0.24]} /></mesh>
        <mesh position={[0, 0.78, 0]} geometry={female ? HEAD_F : HEAD} material={HUMAN_MATERIAL} />
        <mesh position={[0, 0.6, 0]} material={mats.trim}><boxGeometry args={[0.2, 0.05, 0.25]} /></mesh>
        <mesh position={[0, 0.03, 0]} material={mats.trim}><boxGeometry args={[0.43, 0.07, 0.25]} /></mesh>
        {([[armL, -0.27], [armR, 0.27]] as const).map(([ref, x], i) => (
          <group key={i} ref={ref} position={[x, 0.58, 0]}>
            <mesh position={[0, -0.27, 0]} material={mats.shirt}><capsuleGeometry args={[0.065, 0.42, 4, 8]} /></mesh>
            <mesh position={[0, -0.56, 0]} material={mats.skin}><sphereGeometry args={[0.06, 8, 8]} /></mesh>
          </group>
        ))}
        {([[legL, shinL, -0.11], [legR, shinR, 0.11]] as const).map(([leg, shin, x], i) => (
          <group key={i} ref={leg} position={[x, 0, 0]}>
            <mesh position={[0, -0.22, 0]} material={mats.pants}><capsuleGeometry args={[0.08, 0.34, 4, 8]} /></mesh>
            <group ref={shin} position={[0, -0.45, 0]}>
              <mesh position={[0, -0.2, 0]} material={mats.pants}><capsuleGeometry args={[0.07, 0.32, 4, 8]} /></mesh>
              <mesh position={[0, -0.44, 0.05]} material={mats.shoe}><boxGeometry args={[0.12, 0.08, 0.26]} /></mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
};
export default ThirdPersonAvatar;
