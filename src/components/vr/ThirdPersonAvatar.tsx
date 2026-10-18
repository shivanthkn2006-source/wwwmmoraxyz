/**
 * Third-person avatar: the selected village character model drawn just
 * ahead of the camera, so you see yourself from behind. A gentle bob plays
 * with real movement speed (walk / run), crouch lowers the body, and your
 * latest chat message floats over your head. The W-870 rides in the right
 * hand when equipped. Equipment (headlamp, helmet, vest) still shows.
 */
import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWorldState } from '@/worlds/worldMode';
import { useVRView, wireVRViewKeys, AVATAR_AHEAD, villageEyeHeight } from '@/lib/vrView';
import { useVRSelf } from '@/lib/vrSelf';
import { useEquipped } from '@/lib/vrGear';
import { loadLook } from '@/lib/vrLook';
import { Html } from '@react-three/drei';
import { useMeet, myMeetId } from '@/worlds/meet/vrMeet';
import { W870Model } from './features/W870Model';
import { VillageAvatar } from './features/VillageAvatar';
import { avatarMotion } from '@/lib/vrAvatarMotion';

/** My own latest chat message over my head for 8 s (others see theirs over mine via MeetPresence). */
const MyBubble: React.FC = () => {
  const { messages } = useMeet();
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const me = myMeetId();
  const m = [...messages].reverse().find((x) => !x.system && (x.tag === 'me' || x.from === me));
  if (!m || now - m.at > 8000) return null;
  return <Html position={[0, 2.3, 0]} center occlude={false} style={{ pointerEvents: 'none' }}><div style={{ maxWidth: 'min(220px, 60vw)', width: 'max-content', background: '#fff', color: '#000', fontFamily: 'Georgia, serif', fontSize: 'clamp(11px, 2.6vw, 14px)', lineHeight: 1.3, padding: '4px 9px', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,.35)', wordBreak: 'break-word' }}>{m.text.slice(0, 140)}</div></Html>;
};

const AHEAD = AVATAR_AHEAD;

const ModelFallback: React.FC = () => (
  <group>
    <mesh position={[0, 0.95, 0]}>
      <capsuleGeometry args={[0.24, 1.15, 6, 10]} />
      <meshStandardMaterial color="#59606e" roughness={0.75} metalness={0.15} />
    </mesh>
    <mesh position={[0, 1.78, 0]}>
      <sphereGeometry args={[0.18, 14, 14]} />
      <meshStandardMaterial color="#c7a080" roughness={0.7} />
    </mesh>
  </group>
);

export const ThirdPersonAvatar: React.FC = () => {
  const { thirdPerson, crouch, face } = useVRView();
  const { camera } = useThree();
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const last = useRef(new THREE.Vector3());
  const phase = useRef(0);
  const speed = useRef(0);
  const crouchAmt = useRef(0);
  const eq = useEquipped();
  const holdingW870 = eq.includes('w870');
  const aimingRef = useRef(false);
  aimingRef.current = eq.some((id) => ['w870', 'shotgun', 'boltrifle', 'pistol', 'sentinel9'].includes(id));
  const mats = useMemo(() => ({
    steel: new THREE.MeshStandardMaterial({ color: '#b8bcc0', metalness: 0.8, roughness: 0.3 }),
  }), []);
  useEffect(() => { void loadLook(); }, []);

  useEffect(() => { wireVRViewKeys(); }, []);
  useEffect(() => {
    const attack = () => { avatarMotion.attackAt = performance.now(); };
    window.addEventListener('vr-hand-reach', attack);
    return () => window.removeEventListener('vr-hand-reach', attack);
  }, []);

  useFrame((_, dt) => {
    const g = root.current;
    if (!g || !thirdPerson) return;
    const d = Math.min(dt, 0.1);
    const yaw = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
    avatarMotion.headPitch = THREE.MathUtils.clamp(new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').x, -0.4, 0.4);
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const ground = Math.max(0, camera.position.y - (getWorldState().mode === 'mmora' ? villageEyeHeight() : 1.6));
    // Only stand on a real street: hidden during the aerial view, before the
    // first street block has loaded, or while the camera is high above ground.
    const w = getWorldState();
    g.visible = !(w.mode === 'real' && (w.aerial || w.chunksLoaded === 0 || ground > 8));
    if (!g.visible) return;
    g.position.set(camera.position.x + fx * AHEAD, ground, camera.position.z + fz * AHEAD);
    const seated = avatarMotion.seated;
    if (seated && w.mode === 'mmora') g.position.set(seated.x, 0.44, seated.z);
    // Face view: turn round to face the camera; normal view: back to the camera.
    // Village chase view: body faces where it walks; with a weapon out it faces where you aim.
    const chaseView = w.mode === 'mmora' && !face;
    g.rotation.y = face ? yaw : (chaseView && !aimingRef.current ? avatarMotion.bodyYaw : yaw) + Math.PI;
    if (seated) g.rotation.y = seated.yaw;
    // Real speed from how far the camera moved.
    const moved = Math.hypot(camera.position.x - last.current.x, camera.position.z - last.current.z) / Math.max(d, 1e-3);
    last.current.copy(camera.position);
    speed.current += (Math.min(moved, 12) - speed.current) * Math.min(1, d * 8);
    const run = avatarMotion.pose === 'running';
    phase.current += d * (run ? 11 : 7) * Math.min(1, speed.current / 2);
    const amp = speed.current < 0.3 ? 0 : run ? 0.035 : 0.02;
    crouchAmt.current += ((crouch ? 1 : 0) - crouchAmt.current) * Math.min(1, d * 8);
    const c = crouchAmt.current;
    if (body.current) {
      body.current.position.y = -c * 0.38 + Math.abs(Math.cos(phase.current)) * amp;
      body.current.rotation.x = run ? 0.12 : c * 0.3;
    }
  });

  if (!thirdPerson) return null;
  return (
    <group ref={root}>
      <MyBubble />
      <group ref={body}>
        <Suspense fallback={<ModelFallback />}>
          {/* Temporary (per Marc): the rigged skirt-female model stands in as
              the village avatar for ALL profiles while a real male model is
              sourced. It drives its own walk/run/jump/aim poses from real
              movement speed. */}
          <VillageAvatar aiming={eq.some((id) => ['w870', 'shotgun', 'boltrifle', 'pistol', 'sentinel9'].includes(id))} />
        </Suspense>
        {/* equipment overlays (roughly placed on the realistic body) */}
        {eq.includes('headlamp') && <group position={[0, 1.72, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.135, 0.012, 6, 20]} /><meshStandardMaterial color="#1e1e1e" roughness={0.9} /></mesh>
          <mesh position={[0, 0, 0.14]}><boxGeometry args={[0.07, 0.05, 0.04]} /><meshStandardMaterial color="#383b3e" metalness={0.5} roughness={0.4} /></mesh>
          <mesh position={[0, 0, 0.162]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.018, 0.018, 0.006, 12]} /><meshBasicMaterial color="#fff2c8" /></mesh>
        </group>}
        {eq.includes('helmet') && <mesh position={[0, 1.74, 0]}><sphereGeometry args={[0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} /><meshStandardMaterial color="#6b6f74" metalness={0.8} roughness={0.35} /></mesh>}
        {eq.includes('vest') && <mesh position={[0, 1.25, 0]}><boxGeometry args={[0.47, 0.5, 0.28]} /><meshStandardMaterial color="#5a3a22" roughness={0.8} /></mesh>}
        {/* W-870 carried low in the right hand, muzzle forward */}
        {holdingW870 && (
          <group position={[0.3, 0.85, 0.1]} rotation={[0, -Math.PI / 2, 0]}>
            <group rotation={[0, 0, -Math.PI * 35 / 180]}>
              <group position={[0.22, 0.08, 0]}><W870Model /></group>
            </group>
          </group>
        )}
        {/* legacy simple held items for the older gear */}
        {!holdingW870 && eq.includes('shotgun') && <mesh position={[0.3, 0.8, 0.3]}><boxGeometry args={[0.05, 0.07, 0.75]} /><meshStandardMaterial color="#3b2a1c" /></mesh>}
        {!holdingW870 && eq.includes('pistol') && <mesh position={[0.3, 0.78, 0.1]}><boxGeometry args={[0.04, 0.09, 0.2]} /><meshStandardMaterial color="#222" metalness={0.7} /></mesh>}
        {!holdingW870 && eq.includes('knife') && <mesh position={[0.3, 0.78, 0.1]}><boxGeometry args={[0.015, 0.03, 0.22]} /><meshStandardMaterial color="#c9d3df" metalness={0.9} /></mesh>}
      </group>
    </group>
  );
};
export default ThirdPersonAvatar;
