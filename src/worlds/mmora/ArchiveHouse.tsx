/**
 * A small locked archive in M'Mora World beside the arrival doorway: a note
 * at the path, a brass key under a lamp, a locked door, and a shard plus a
 * second note inside. All interaction goes through the shared Use button.
 */
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { useStory, getStory, takeKey, readNote, useDoor as openDoor, KEYS, NOTES } from '@/lib/vrStory';
import { recordVRCollect } from '@/lib/vrQuests';

import { ARCHIVE_POS } from './villageMap';
import { PooledLight } from '../LightPool';
import { registerLit } from '@/lib/vrLights';
export { ARCHIVE_POS };
const WIN = registerLit(new THREE.MeshStandardMaterial({ color: '#4a5866', emissive: '#ffc56a', roughness: 0.4 }), 2.2);
const W = 6, H = 3.2, T = 0.25;
const KEY_POS: [number, number, number] = [-3, 0.15, -6];
const NOTE_GATE_POS: [number, number, number] = [0, 0.9, 6];
// door sits in the east wall (+x), facing the spawn
const DOOR_LOCAL: [number, number, number] = [W / 2, 0, 0];
const SHARD_LOCAL: [number, number, number] = [-1.8, 1.2, -1.8];
const NOTE_IN_LOCAL: [number, number, number] = [-1.8, 0.9, 1.6];
const SHARD_KEY = 'vr-archive-shard-taken';

const wall = new THREE.MeshStandardMaterial({ color: '#8a7f72', roughness: 0.9 });
const roof = new THREE.MeshStandardMaterial({ color: '#4b3f36', roughness: 0.9 });
const wood = new THREE.MeshStandardMaterial({ color: '#5a3c26', roughness: 0.8 });
const brass = new THREE.MeshStandardMaterial({ color: '#d4a64a', metalness: 0.8, roughness: 0.3, emissive: '#6b4b12', emissiveIntensity: 0.4 });
const paper = new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 1, emissive: '#efe6cf', emissiveIntensity: 0.15 });

const world = (l: [number, number, number]) => [ARCHIVE_POS[0] + l[0], ARCHIVE_POS[1] + l[1], ARCHIVE_POS[2] + l[2]] as const;
const dist2 = (c: THREE.Vector3, p: readonly number[]) => Math.hypot(c.x - p[0], c.z - p[2]);

export const ArchiveHouse: React.FC = () => {
  const story = useStory();
  const { camera } = useThree();
  const door = useRef<THREE.Group>(null);
  const shard = useRef<THREE.Mesh>(null);
  const open = story.open.includes('archive_door');
  const hasKey = story.keys.includes('archive_key');
  const shardTaken = useRef((() => { try { return !!localStorage.getItem(SHARD_KEY); } catch { return false; } })());

  useEffect(() => registerUse(() => {
    const s = getStory();
    const opts: { dist: number; label: string; run: () => void; reach?: number }[] = [];
    if (!s.keys.includes('archive_key')) opts.push({ dist: dist2(camera.position, KEY_POS), label: `Picked up the ${KEYS.archive_key.name}`, run: () => takeKey('archive_key') });
    opts.push({ dist: dist2(camera.position, NOTE_GATE_POS), label: `Reading: ${NOTES.note_gate.title}`, run: () => readNote('note_gate') });
    const dp = world([DOOR_LOCAL[0] + 0.6, 0, 0]);
    opts.push({ dist: dist2(camera.position, dp), reach: 3.2, label: '', run: () => {
      const r = openDoor('archive_door');
      window.dispatchEvent(new CustomEvent('vr-use-result', { detail: { ok: r.result !== 'locked', text: r.text } }));
    } });
    if (s.open.includes('archive_door')) {
      opts.push({ dist: dist2(camera.position, world(NOTE_IN_LOCAL)), label: `Reading: ${NOTES.note_archive.title}`, run: () => readNote('note_archive') });
      if (!shardTaken.current) opts.push({ dist: dist2(camera.position, world(SHARD_LOCAL)), label: 'Picked up a legendary memory shard', run: () => { shardTaken.current = true; try { localStorage.setItem(SHARD_KEY, '1'); } catch { /* */ } void recordVRCollect({ type: 'memory_shard', rarity: 'legendary' }); } });
    }
    let best = opts[0];
    for (const o of opts) if (o.dist < best.dist) best = o;
    if (best.dist > (best.reach ?? 3)) return null;
    // door text comes from its own result event
    return { dist: best.dist, reach: best.reach, label: best.label || 'Archive door', run: best.run };
  }), [camera]);

  useFrame((_, dt) => {
    if (door.current) {
      const target = open ? -Math.PI * 0.55 : 0;
      door.current.rotation.y += (target - door.current.rotation.y) * Math.min(1, dt * 3);
    }
    if (shard.current) { shard.current.rotation.y += dt; shard.current.visible = open && !shardTaken.current; }
  });

  return (
    <group>
      <group position={ARCHIVE_POS}>
        {/* walls: back, left, right, front two halves around the door gap */}
        <mesh position={[-W / 2, H / 2, 0]} material={wall}><boxGeometry args={[T, H, W]} /></mesh>
        <mesh position={[0, H / 2, -W / 2]} material={wall}><boxGeometry args={[W, H, T]} /></mesh>
        <mesh position={[0, H / 2, W / 2]} material={wall}><boxGeometry args={[W, H, T]} /></mesh>
        <mesh position={[W / 2, H / 2, -1.95]} material={wall}><boxGeometry args={[T, H, 2.1]} /></mesh>
        <mesh position={[W / 2, H / 2, 1.95]} material={wall}><boxGeometry args={[T, H, 2.1]} /></mesh>
        <mesh position={[W / 2, H - 0.35, 0]} material={wall}><boxGeometry args={[T, 0.7, 1.8]} /></mesh>
        <mesh position={[0, H + 0.12, 0]} material={roof}><boxGeometry args={[W + 0.6, 0.25, W + 0.6]} /></mesh>
        {/* hinged door */}
        <group ref={door} position={[DOOR_LOCAL[0], 0, -0.9]}>
          <mesh position={[0, 1.25, 0.9]} material={wood}><boxGeometry args={[0.12, 2.5, 1.8]} /></mesh>
          <mesh position={[0.1, 1.2, 1.5]} material={brass}><sphereGeometry args={[0.07, 10, 8]} /></mesh>
        </group>
        <Html position={[W / 2 + 0.3, 2.9, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className="vr-map-label">{open ? 'Archive · open' : hasKey ? 'Archive · tap Use to unlock' : 'Archive · locked'}</div>
        </Html>
        {/* inside */}
        <mesh position={[SHARD_LOCAL[0], 0.5, SHARD_LOCAL[2]]} material={wood}><boxGeometry args={[1.2, 1, 0.6]} /></mesh>
        <mesh ref={shard} position={SHARD_LOCAL}><octahedronGeometry args={[0.25]} /><meshStandardMaterial color="#f2c14e" emissive="#f2c14e" emissiveIntensity={0.8} /></mesh>
        <mesh position={NOTE_IN_LOCAL} rotation={[-Math.PI / 2, 0, 0.3]} material={paper}><planeGeometry args={[0.4, 0.3]} /></mesh>
        <PooledLight position={[0, 2.6, 0]} intensity={0.6} distance={7} color="#ffd9a0" />
        {/* windows (same evening light rule as every house): two in each side wall, one in the back */}
        {[-1.5, 1.5].map((x) => [-1, 1].map((s) => <mesh key={`${x}${s}`} material={WIN} position={[x, 1.7, s * (W / 2 + T / 2 + 0.02)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}><planeGeometry args={[1, 0.8]} /></mesh>))}
        <mesh material={WIN} position={[-W / 2 - T / 2 - 0.02, 1.7, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1.2, 0.8]} /></mesh>
      </group>
      {/* note at the path and lamp with the key */}
      <mesh position={NOTE_GATE_POS} rotation={[-0.6, 0, 0]} material={paper}><planeGeometry args={[0.45, 0.32]} /></mesh>
      <mesh position={[NOTE_GATE_POS[0], 0.45, NOTE_GATE_POS[2] - 0.05]} material={wood}><boxGeometry args={[0.08, 0.9, 0.08]} /></mesh>
      <mesh position={[KEY_POS[0] + 0.5, 1.2, KEY_POS[2]]} material={wood}><cylinderGeometry args={[0.06, 0.08, 2.4, 8]} /></mesh>
      <PooledLight position={[KEY_POS[0] + 0.5, 2.5, KEY_POS[2]]} intensity={0.8} distance={5} color="#ffcc88" />
      {!hasKey && <mesh position={KEY_POS} rotation={[0, 0.4, Math.PI / 2]} material={brass}><torusGeometry args={[0.09, 0.03, 8, 16]} /></mesh>}
    </group>
  );
};
export default ArchiveHouse;
