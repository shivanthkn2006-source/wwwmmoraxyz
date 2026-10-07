/**
 * Inside the 3D scene: shares where I stand (about once a second), draws the
 * other members walking around with a name tag (blue friend, yellow follower,
 * green new), and when someone is within ~1 m the first time, stops me, waves
 * to them and opens a "say hi" chat prompt. The Use button chats with the
 * nearest member.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { JointedHuman } from './JointedHuman';
import { useWorldState, getWorldState, mmoraCityKey } from '@/worlds/worldMode';
import { toLatLng, toLocal, type LatLng } from '@/worlds/realmap/geo';
import { canShareRealLocation } from '@/lib/vrPrivacy';
import { registerUse } from '@/lib/vrUse';
import { notifySelf } from '@/lib/notifySelf';
import { joinMeet, updateMyPose, useMeet, getMeet, setNearest, sendWave, setChatOpen, TAG_LABEL, type Remote } from './vrMeet';

export const MEET_RADIUS_M = 1.2;
const AREA_DEG = 0.02;
export const realRoom = (o: LatLng) => `real:${Math.floor(o.lat / AREA_DEG)}_${Math.floor(o.lng / AREA_DEG)}`;

const TAG_COLOR = { friend: '#387BF6', follower: '#F5C518', unknown: '#34C759' } as const;

function localOf(p: Remote, origin: LatLng | null): { x: number; z: number } | null {
  if (p.mode === 'mmora') return p.x !== undefined && p.z !== undefined ? { x: p.x, z: p.z } : null;
  if (p.lat === undefined || p.lng === undefined || !origin) return null;
  return toLocal({ lat: p.lat, lng: p.lng }, origin);
}

const Avatar: React.FC<{ p: Remote; target: { x: number; z: number }; reachAt?: number }> = ({ p, target, reachAt }) => {
  const g = useRef<THREE.Group>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: TAG_COLOR[p.tag], roughness: 0.55 }), [p.tag]);
  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8c6a4', roughness: 0.7 }), []);
  useEffect(() => () => { mat.dispose(); skin.dispose(); }, [mat, skin]);
  useFrame(({ clock }, dt) => {
    const o = g.current; if (!o) return;
    const k = 1 - Math.exp(-6 * Math.min(dt, 0.05));
    const dx = target.x - o.position.x, dz = target.z - o.position.z;
    const moving = Math.hypot(dx, dz) > 0.05;
    o.position.x += dx * k; o.position.z += dz * k;
    o.rotation.y += (p.yaw - o.rotation.y) * k;
    o.position.y = moving ? Math.abs(Math.sin(clock.elapsedTime * 9)) * 0.06 : 0;
  });
  return (
    <group ref={g} position={[target.x, 0, target.z]}>
      <JointedHuman reachAt={reachAt} />
      <Html position={[0, 2.05, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="vr-meet-label">
          <span>@{p.username}</span>
          <span className={`vr-meet-tag vr-meet-tag-${p.tag}`}>{TAG_LABEL[p.tag]}</span>
        </div>
      </Html>
    </group>
  );
};

export const MeetPresence: React.FC = () => {
  const { camera } = useThree();
  const w = useWorldState();
  const meet = useMeet();
  const origin = w.origin.status === 'ready' ? w.origin.origin : null;
  const room = w.mode === 'mmora' ? `mmora:${mmoraCityKey()}` : origin ? realRoom(origin) : null;
  const met = useRef(new Set<string>());
  const timer = useRef(0);
  const shareOk = useRef(true);
  const holdUntil = useRef(0);
  const [shake, setShake] = React.useState<Record<string, number>>({});

  useEffect(() => { void joinMeet(room); }, [room]);
  useEffect(() => () => { void joinMeet(null); }, []);
  useEffect(() => { void canShareRealLocation().then((v) => { shareOk.current = v || getMeet().visible; }); }, [meet.visible]);

  const targets = useMemo(() => meet.players
    .filter((p) => p.mode === w.mode)
    .map((p) => ({ p, t: localOf(p, origin) }))
    .filter((x): x is { p: Remote; t: { x: number; z: number } } => !!x.t)
    .sort((a, b) => Math.hypot(a.t.x - camera.position.x, a.t.z - camera.position.z) - Math.hypot(b.t.x - camera.position.x, b.t.z - camera.position.z))
    .slice(0, 20), [meet.players, w.mode, origin, camera]);
  const targetsRef = useRef(targets); targetsRef.current = targets;

  useEffect(() => registerUse(() => {
    const n = getMeet().nearest;
    if (!n) return null;
    return { dist: n.dist, reach: 2.5, label: `Chat with @${n.username}`, run: () => setChatOpen(true, true) };
  }), []);

  useFrame((_, dt) => {
    timer.current += dt;
    if (timer.current < 0.25) return;
    timer.current = 0;
    // Greeting: stay put for 5 s after meeting someone.
    if (performance.now() < holdUntil.current) window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'stop' } }));
    const st = getWorldState();
    const onGround = !st.aerial && camera.position.y < 12;
    // Share my spot (Real Map: as lat/lng, so members with other start points line up).
    if (onGround && (st.mode === 'mmora' || (origin && shareOk.current))) {
      const yaw = camera.rotation.y;
      updateMyPose(st.mode === 'mmora'
        ? { mode: 'mmora', x: +camera.position.x.toFixed(2), z: +camera.position.z.toFixed(2), yaw }
        : { mode: 'real', ...toLatLng(camera.position.x, camera.position.z, origin as LatLng), yaw });
    }
    // Nearest member + first meeting.
    let best: { p: Remote; d: number } | null = null;
    for (const { p, t } of targetsRef.current) {
      const d = Math.hypot(t.x - camera.position.x, t.z - camera.position.z);
      if (!best || d < best.d) best = { p, d };
    }
    setNearest(best && best.d < 8 ? { id: best.p.id, username: best.p.username, dist: best.d } : null);
    if (best && onGround && best.d < MEET_RADIUS_M && !met.current.has(best.p.id)) {
      met.current.add(best.p.id);
      window.dispatchEvent(new CustomEvent('vr-move', { detail: { direction: 'stop' } }));
      sendWave(best.p.id);
      holdUntil.current = performance.now() + 5000;
      const at = performance.now();
      setShake((m) => ({ ...m, [best!.p.id]: at }));
      window.dispatchEvent(new CustomEvent('vr-hand-reach')); // my hand reaches out for the handshake
      setChatOpen(true);
      void notifySelf('vr_player_met', 'Met in VR World', `You met @${best.p.username} (${TAG_LABEL[best.p.tag]}) in ${st.mode === 'mmora' ? "M'Mora World" : 'your street'}.`, { link: '/vr-world', member: best.p.id }).catch(() => {});
    }
    if (best && best.d > 4) met.current.delete(best.p.id);
  });

  return <>{targets.map(({ p, t }) => <Avatar key={p.id} p={p} target={t} reachAt={shake[p.id]} />)}</>;
};
export default MeetPresence;
