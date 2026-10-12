/**
 * Village quest board near the square: a parchment map of the village with a
 * pin per quest item and a "you are here" dot, missions in order (Old Village
 * Map → Church Medallion → Lord's Crest) and a gold beam with distance over
 * each item still to be found.
 */
import React, { useRef, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { GEAR, useGear, hasGear } from '@/lib/vrGear';
import { QUESTS, getVRQuestSnapshot, subscribeVRQuests, rewardText } from '@/lib/vrQuests';

const CHAIN = [
  { quest: 'village_map', gear: 'map' },
  { quest: 'church_medallion', gear: 'medallion' },
  { quest: 'lords_crest', gear: 'crest' },
];
const LANDMARKS: { name: string; x: number; z: number }[] = [
  { name: 'Square', x: 0, z: 0 }, { name: 'Church', x: -14, z: -58 }, { name: 'Castle', x: -70, z: 4 }, { name: 'Shore', x: 40, z: 30 },
];
// Map area −90..60 (x) by −70..50 (z) drawn into 220×170 px.
const mx = (x: number) => ((x + 90) / 150) * 220, mz = (z: number) => ((z + 70) / 120) * 170;

const DistLabel: React.FC<{ x: number; z: number; name: string; active: boolean; far: boolean }> = ({ x, z, name, active, far }) => {
  const { camera } = useThree();
  const el = useRef<HTMLSpanElement>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt; if (t.current < 0.5 || !el.current) return; t.current = 0;
    el.current.textContent = `${name} · ${Math.round(Math.hypot(camera.position.x - x, camera.position.z - z))} m`;
  });
  return (
    <Html position={[0, far ? 22 : 4, 0]} center occlude={false} style={{ pointerEvents: 'none' }}>
      <span ref={el} style={{ whiteSpace: 'nowrap', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 12, color: active ? '#ffd25a' : '#f3e6c8', textShadow: '0 1px 3px #000' }}>{name}</span>
    </Html>
  );
};

/** Follows the camera: edge arrow toward the active quest item + shield flash when armour blocks. */
const CameraHud: React.FC<{ target: [number, number, number] | null }> = ({ target }) => {
  const { camera } = useThree();
  const g = useRef<THREE.Group>(null);
  const arrow = useRef<HTMLDivElement>(null), shield = useRef<HTMLDivElement>(null);
  const fwd = useRef(new THREE.Vector3());
  React.useEffect(() => {
    let t: number | undefined;
    const on = () => { if (!shield.current) return; shield.current.style.opacity = '1'; window.clearTimeout(t); t = window.setTimeout(() => { if (shield.current) shield.current.style.opacity = '0'; }, 280); };
    window.addEventListener('vr-shield', on); return () => window.removeEventListener('vr-shield', on);
  }, []);
  useFrame(() => {
    if (!g.current) return;
    camera.getWorldDirection(fwd.current);
    g.current.position.copy(camera.position).addScaledVector(fwd.current, 1);
    const a = arrow.current; if (!a) return;
    if (!target) { a.style.display = 'none'; return; }
    const dx = target[0] - camera.position.x, dz = target[2] - camera.position.z;
    const ang = Math.atan2(dx, dz) - Math.atan2(fwd.current.x, fwd.current.z); // + = to the left
    const rel = Math.atan2(Math.sin(ang), Math.cos(ang));
    const show = Math.abs(rel) > 0.5 && Math.hypot(dx, dz) > 4;
    a.style.display = show ? 'block' : 'none';
    a.style.transform = `translate(${-Math.sin(rel) * 40}vw, ${-Math.cos(rel) * 38}vh) rotate(${-rel}rad)`;
  });
  return (
    <group ref={g}>
      <Html center occlude={false} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ position: 'relative', width: 0, height: 0 }}>
          <div ref={arrow} style={{ position: 'absolute', left: -12, top: -14, display: 'none', color: '#ffd25a', fontSize: 26, lineHeight: 1, textShadow: '0 1px 4px #000' }}>▲</div>
          <div ref={shield} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', transform: 'translate(-50vw,-50vh)', opacity: 0, transition: 'opacity 0.2s', boxShadow: 'inset 0 0 80px 20px rgba(56,123,246,0.55)' }} />
        </div>
      </Html>
    </group>
  );
};

export const VillageQuestBoard: React.FC = () => {
  React.useEffect(() => { void import('@/lib/vrGear').then((m) => m.loadGearProgress()); void import('@/lib/vrQuests').then((m) => m.loadVRQuests()); }, []);
  // Carried Church Medallion slowly restores health.
  React.useEffect(() => { const id = window.setInterval(() => { if (hasGear('medallion')) window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: -1 } })); }, 4000); return () => window.clearInterval(id); }, []);
  const owned = useGear();
  const { camera } = useThree();
  const you = useRef<HTMLDivElement>(null);
  const tick = useRef(0);
  useFrame((_, dt) => {
    tick.current += dt; if (tick.current < 0.5 || !you.current) return; tick.current = 0;
    you.current.style.left = `${Math.max(0, Math.min(220, mx(camera.position.x)))}px`;
    you.current.style.top = `${Math.max(0, Math.min(170, mz(camera.position.z)))}px`;
  });
  const { state } = useSyncExternalStore(subscribeVRQuests, getVRQuestSnapshot, getVRQuestSnapshot);
  const rows = CHAIN.map((c) => ({ q: QUESTS.find((x) => x.id === c.quest)!, g: GEAR.find((x) => x.id === c.gear)!, done: owned.includes(c.gear) || !!state.done[c.quest] }));
  const activeId = rows.find((r) => !r.done)?.g.id;
  const longSight = owned.includes('map');
  const activeItem = rows.find((r) => !r.done)?.g.pos ?? null;
  return (
    <>
      <CameraHud target={activeItem} />
      <group position={[4, 0, -4]} rotation={[0, -Math.PI / 4, 0]}>
        {[-1.2, 1.2].map((x) => <mesh key={x} position={[x, 1, 0]}><boxGeometry args={[0.1, 2, 0.1]} /><meshStandardMaterial color="#3b2a1c" /></mesh>)}
        <mesh position={[0, 1.6, 0]}><boxGeometry args={[2.6, 1.4, 0.06]} /><meshStandardMaterial color="#5a4128" roughness={0.9} /></mesh>
        <Html position={[0, 1.6, 0.05]} transform distanceFactor={2.2} occlude={false} style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', gap: 10, fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#f3e6c8', fontSize: 12, lineHeight: 1.3 }}>
            <div style={{ position: 'relative', width: 220, height: 170, background: '#d9c49a', borderRadius: 4, boxShadow: 'inset 0 0 18px #7a5a2e', color: '#3b2a1c' }}>
              {LANDMARKS.map((l) => <span key={l.name} style={{ position: 'absolute', left: mx(l.x), top: mz(l.z), transform: 'translate(-50%,-50%)', fontSize: 10 }}>{l.name}</span>)}
              {rows.map((r) => <span key={r.g.id} style={{ position: 'absolute', left: mx(r.g.pos[0]), top: mz(r.g.pos[2]), transform: 'translate(-50%,-100%)', fontSize: 14, opacity: r.done ? 0.35 : 1, color: r.g.id === activeId ? '#a3120f' : '#3b2a1c' }}>📍</span>)}
              <div ref={you} style={{ position: 'absolute', width: 8, height: 8, borderRadius: 9999, background: '#387BF6', transform: 'translate(-50%,-50%)', left: mx(0), top: mz(0) }} />
            </div>
            <div style={{ width: 190 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Quest board</div>
              {rows.map((r) => (
                <div key={r.q.id} style={{ marginBottom: 4, opacity: r.done ? 0.55 : 1, color: r.g.id === activeId ? '#ffd25a' : undefined }}>
                  {r.done ? '✓' : r.g.id === activeId ? '▶' : '•'} {r.q.title}{r.done && <span style={{ marginLeft: 6, fontSize: 10, border: '1px solid currentColor', padding: '0 3px' }}>DONE</span>}
                  <span style={{ display: 'block', fontSize: 11 }}>{r.q.description}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#ffd25a' }}>Reward: {rewardText(r.q.id)}</span>
                </div>
              ))}
            </div>
          </div>
        </Html>
      </group>
      {rows.filter((r) => !r.done).map((r) => (
        <group key={r.g.id} position={[r.g.pos[0], 0, r.g.pos[2]]}>
          <mesh position={[0, 10, 0]}><cylinderGeometry args={[0.12, 0.12, 20, 8, 1, true]} /><meshBasicMaterial color="#ffd25a" transparent opacity={r.g.id === activeId ? 0.5 : 0.2} depthWrite={false} /></mesh>
          <mesh position={[0, 20.6, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.5, 1, 4]} /><meshBasicMaterial color="#ffd25a" /></mesh>
          <DistLabel x={r.g.pos[0]} z={r.g.pos[2]} name={r.g.name} active={r.g.id === activeId} far={longSight || r.g.id === activeId} />
        </group>
      ))}
    </>
  );
};
export default VillageQuestBoard;
