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
import { useVRSelf } from '@/lib/vrSelf';
import { useWorldState, getWorldState, mmoraCityKey } from '@/worlds/worldMode';
import { toLatLng, toLocal, type LatLng } from '@/worlds/realmap/geo';
import { canShareRealLocation } from '@/lib/vrPrivacy';
import { registerUse } from '@/lib/vrUse';
import { notifySelf } from '@/lib/notifySelf';
import { joinMeet, updateMyPose, useMeet, getMeet, setNearest, sendWave, setChatOpen, TAG_LABEL, type Remote } from './vrMeet';

export const MEET_RADIUS_M = 1.2;
const AREA_DEG = 0.02;
export const realRoom = (o: LatLng) => `real:${Math.floor(o.lat / AREA_DEG)}_${Math.floor(o.lng / AREA_DEG)}`;

/** Personal space: members standing on the same spot are nudged apart so bodies never overlap. */
export const PERSONAL_SPACE_M = 1.1;
export function spaced(t: { x: number; z: number }, others: { x: number; z: number }[], gap = PERSONAL_SPACE_M) {
  let { x, z } = t;
  for (let pass = 0; pass < 3; pass++) for (const o of others) {
    const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz);
    if (d >= gap) continue;
    const a = d > 1e-3 ? Math.atan2(dz, dx) : (others.indexOf(o) + 1) * 2.4;
    x = o.x + Math.cos(a) * gap; z = o.z + Math.sin(a) * gap;
  }
  return { x, z };
}

const TAG_COLOR = { friend: '#387BF6', follower: '#F5C518', unknown: '#34C759' } as const;

function localOf(p: Remote, origin: LatLng | null): { x: number; z: number } | null {
  if (p.mode === 'mmora') return p.x !== undefined && p.z !== undefined ? { x: p.x, z: p.z } : null;
  if (p.lat === undefined || p.lng === undefined || !origin) return null;
  return toLocal({ lat: p.lat, lng: p.lng }, origin);
}

const Avatar: React.FC<{ p: Remote; target: { x: number; z: number }; reachAt?: number; say?: string }> = ({ p, target, reachAt, say }) => {
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
      <JointedHuman reachAt={reachAt} female={!!p.f} />
      <Html position={[0, 2.05, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        {say && <div style={{ marginBottom: 4, maxWidth: 'min(220px, 60vw)', width: 'max-content', background: '#fff', color: '#000', fontFamily: 'Georgia, serif', fontSize: 'clamp(11px, 2.6vw, 14px)', lineHeight: 1.3, padding: '4px 9px', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,.35)', wordBreak: 'break-word' }}>{say}</div>}
        <div className={`vr-meet-label${p.mode === 'mmora' ? ' vr-meet-label-village' : ''}`}>
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
  const self = useVRSelf();
  const femaleRef = useRef(false); femaleRef.current = self.female;
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
    .slice(0, 20)
    // Index 0 holds my own avatar's spot, so nobody stands inside me either.
    .map((x, i, arr) => ({ ...x, t: spaced(x.t, [{ x: camera.position.x, z: camera.position.z }, ...arr.slice(0, i).map((y) => y.t)]) })), [meet.players, w.mode, origin, camera]);
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
        ? { mode: 'mmora', x: +camera.position.x.toFixed(2), z: +camera.position.z.toFixed(2), yaw, f: femaleRef.current || undefined }
        : { mode: 'real', ...toLatLng(camera.position.x, camera.position.z, origin as LatLng), yaw, f: femaleRef.current || undefined });
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
      void notifySelf('vr_player_met', 'Met in VR World', `You met @${best.p.username} (${TAG_LABEL[best.p.tag]}) in ${st.mode === 'mmora' ? "M'Mora Village" : 'your street'}.`, { link: '/vr-world', member: best.p.id }).catch(() => {});
    }
    if (best && best.d > 4) met.current.delete(best.p.id);
  });

  // Live chat bubble: each member's latest message shows over their head for 8 s.
  const [now, setNow] = React.useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const said = useMemo(() => {
    const m: Record<string, string> = {};
    for (const msg of meet.messages) if (!msg.system && now - msg.at < 8000) m[msg.from] = msg.text.slice(0, 140);
    return m;
  }, [meet.messages, now]);

  // Village talking mode: a nearby member's new message is read aloud once —
  // female members in Zoe's voice, male members in the male voice.
  const spoken = useRef(new Set<string>());
  const lastSpoke = useRef(0);
  useEffect(() => {
    if (w.mode !== 'mmora') return;
    for (const msg of meet.messages) {
      if (msg.system || msg.tag === 'me' || spoken.current.has(msg.id)) continue;
      spoken.current.add(msg.id);
      if (Date.now() - msg.at > 4000 || Date.now() - lastSpoke.current < 2500) continue;
      const hit = targets.find(({ p }) => p.id === msg.from);
      if (!hit || Math.hypot(hit.t.x - camera.position.x, hit.t.z - camera.position.z) > 12) continue;
      lastSpoke.current = Date.now();
      void import('@/utils/deepgramTTS').then((m) => m.speakWithDeepgramVoice(msg.text.slice(0, 140), hit.p.f ? 'female' : 'male')).catch(() => {});
    }
    if (spoken.current.size > 200) spoken.current = new Set([...spoken.current].slice(-100));
  }, [meet.messages, targets, w.mode, camera]);

  return <>{targets.map(({ p, t }) => <Avatar key={p.id} p={p} target={t} reachAt={shake[p.id]} say={said[p.id]} />)}</>;
};
export default MeetPresence;
