/**
 * Stages 3–4 (from the uploaded blueprint, adapted to M'Mora Village):
 * Empty Fuse Shell + Auxiliary Fluid Line → diesel generator powered;
 * Empty Fuse Shell + Chemical Fluid → mixer → Charged Fuse → powers the core gate,
 * the Verdant Antigen sits behind it, and inserting it into the core terminal
 * starts a 45-second defence. Unlocks after the Lord's Crest chapter.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { useGear, gearStats, getEquipped } from '@/lib/vrGear';
import { logStory } from '@/lib/vrStoryline';
import { playerSpot } from './VillageVillagers';

type Step = 'shell' | 'fluid' | 'mixed' | 'hose' | 'generator' | 'gate' | 'keycard' | 'lab' | 'antigen' | 'bypass' | 'defend' | 'cleared';
const KEY = 'mmora-fuse-puzzle';
const ORDER: Step[] = ['shell', 'fluid', 'mixed', 'hose', 'generator', 'gate', 'keycard', 'lab', 'antigen', 'bypass', 'defend', 'cleared'];
export const SPOTS: Record<string, [number, number]> = { shell: [20, -18], fluid: [-22, 16], mixer: [6, 24], gate: [-8, -30], terminal: [-8, -36], keycard: [14, -30], lab: [-14, -30], bypass: [-8, -33], hose: [24, 6], generator: [-3, -29] };
const say = (t: string) => { window.dispatchEvent(new CustomEvent('vr-toast', { detail: t })); void import('@/utils/deepgramTTS').then((m) => m.speakWithDeepgramVoice(t, 'female')).catch(() => {}); };
const sfx = (s: string) => void import('@/lib/vrSfx').then((m) => m.playSfx(s as never)).catch(() => {});

const GLOW = new THREE.MeshBasicMaterial({ color: '#9cff6a', transparent: true, opacity: 0.4, depthWrite: false });
const METAL = new THREE.MeshStandardMaterial({ color: '#6b6f73', metalness: 0.7, roughness: 0.4 });
const CORE = new THREE.MeshStandardMaterial({ color: '#16120f', emissive: '#2f6a1a', emissiveIntensity: 0.8 });

export const VillageFusePuzzle: React.FC = () => {
  const owned = useGear();
  return owned.includes('crest') ? <Puzzle /> : null;
};

const Puzzle: React.FC = () => {
  const { camera } = useThree();
  const [done, setDone] = useState<Step[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } });
  const defendT = useRef(0); const pulse = useRef(0); const bossHp = useRef(0); const [boss, setBoss] = useState(0);
  const wave = useRef<{ x: number; z: number; hp: number }[]>([]); const [, tick] = useState(0); const waveT = useRef(0);
  const mark = (s: Step) => setDone((d) => { const n = d.includes(s) ? d : [...d, s]; localStorage.setItem(KEY, JSON.stringify(n)); logStory('puzzle', s); void import('@/lib/vrGear').then((m) => m.saveProgressNow()); return n; });
  const next = ORDER.find((s) => !done.includes(s));

  useEffect(() => { if (!done.length) say('Varga: Operative, the core gate under the keep needs a charged fuse. Find an empty fuse shell and chemical fluid.'); }, []); // eslint-disable-line

  useEffect(() => registerUse(() => {
    const ps = playerSpot(camera);
    const near = (k: string) => Math.hypot(ps.x - SPOTS[k][0], ps.z - SPOTS[k][1]);
    const opt = (k: string, label: string, run: () => void) => ({ dist: near(k), reach: 2.6, label, run });
    if (next === 'shell') return opt('shell', 'Take Empty Fuse Shell', () => { sfx('metal'); mark('shell'); say('Picked up an Empty Fuse Shell.'); });
    if (next === 'fluid') return opt('fluid', 'Take Chemical Fluid', () => { sfx('paper'); mark('fluid'); say('Picked up Chemical Fluid from the researcher.'); });
    if (next === 'mixed') return opt('mixer', 'Use Chemical Mixer', () => { sfx('typewriter'); mark('mixed'); say('Created a Charged Fuse. Varga: The gate runs off the old diesel generator, and its auxiliary fluid line is missing. Find a replacement line.'); });
    if (next === 'hose') return opt('hose', 'Take Auxiliary Fluid Line', () => { sfx('metal'); mark('hose'); say('Picked up an Auxiliary Fluid Line.'); });
    if (next === 'generator') return opt('generator', 'Fit Fluid Line to Generator', () => { sfx('metal'); mark('generator'); say('The diesel generator coughs to life. Varga: Power is back. Insert the Charged Fuse into the gate.'); });
    if (next === 'gate') return opt('gate', 'Insert Charged Fuse', () => { sfx('metal'); mark('gate'); say('Varga: Gate is live. The lab inside is mag-locked. Find the researcher keycard.'); });
    if (next === 'keycard') return opt('keycard', 'Take Lab Keycard', () => { sfx('paper'); mark('keycard'); say('Picked up the Lab Keycard.'); });
    if (next === 'lab') return opt('lab', 'Open Secure Lab', () => { sfx('metal'); mark('lab'); say('Varga: Lab open. The Verdant Antigen is on the bench. Take it.'); });
    if (next === 'antigen') return opt('lab', 'Take Verdant Antigen', () => { sfx('medallion'); mark('antigen'); say('Picked up the Verdant Antigen. The core ward is sealed. Pull the manual bypass.'); });
    if (next === 'bypass') return opt('bypass', 'Pull Manual Bypass', () => { sfx('metal'); mark('bypass'); say('Varga: Bypass thrown, no powers used. Good. Insert the Antigen into the core terminal.'); });
    if (next === 'defend' && wave.current.length) { let bi = 0, bd = 1e9; wave.current.forEach((w, i) => { const d = Math.hypot(ps.x - w.x, ps.z - w.z); if (d < bd) { bd = d; bi = i; } });
      if (bd < 3) return { dist: bd * 0.4, reach: 3, label: 'Strike Spore Husk', run: () => { const w = wave.current[bi]; w.hp -= gearStats(getEquipped()).attack; sfx('metal'); if (w.hp <= 0) { wave.current.splice(bi, 1); logStory('wave', 'husk:down'); } tick((n) => n + 1); } }; }
    if (next === 'defend' && bossHp.current > 0) return { dist: near('terminal'), reach: 5, label: 'Strike the Verdant Colossus', run: () => {
      bossHp.current = Math.max(0, bossHp.current - gearStats(getEquipped()).attack); setBoss(bossHp.current); sfx('metal');
      if (bossHp.current <= 0) { logStory('boss', 'colossus:defeated'); say('The Verdant Colossus falls!'); } } };
    if (next === 'defend' && defendT.current <= 0) return opt('terminal', 'Insert Antigen into Core', () => { defendT.current = 45; bossHp.current = 300; setBoss(300); logStory('boss', 'colossus:start'); window.dispatchEvent(new CustomEvent('vr-danger')); say('Varga: Hold the core for forty-five seconds!'); });
    return null;
  }), [camera, next]);

  useFrame((_, dt) => {
    if (defendT.current <= 0) return;
    defendT.current -= dt; pulse.current -= dt;
    const ps = playerSpot(camera);
    const atCore = Math.hypot(ps.x - SPOTS.terminal[0], ps.z - SPOTS.terminal[1]) < 12;
    if (pulse.current <= 0) { pulse.current = 5; if (atCore) window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: bossHp.current > 0 ? Math.max(4, Math.round(14 * (1 - gearStats(getEquipped()).defence / 60))) : 6 } })); }
    waveT.current -= dt;
    if (atCore && waveT.current <= 0 && wave.current.length < 4) { waveT.current = 9; const a = Math.random() * 6.28; wave.current.push({ x: SPOTS.terminal[0] + Math.cos(a) * 11, z: SPOTS.terminal[1] + Math.sin(a) * 11, hp: 40 }); tick((n) => n + 1); }
    for (const w of wave.current) { const dx = ps.x - w.x, dz = ps.z - w.z, d = Math.hypot(dx, dz); if (d > 1.2) { w.x += dx / d * 1.6 * dt; w.z += dz / d * 1.6 * dt; } else if (Math.random() < dt * 0.5) window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: Math.max(2, Math.round(6 * (1 - gearStats(getEquipped()).defence / 60))) } })); }
    if (!atCore) { wave.current = []; defendT.current = 0; bossHp.current = 0; setBoss(0); say('You left the core. Return and insert the Antigen again.'); return; }
    if (defendT.current <= 0 && bossHp.current > 0) { defendT.current = 1; return; }
    if (defendT.current <= 0) { wave.current = []; mark('defend'); mark('cleared'); void import('@/lib/vrPickups').then((m) => m.addCoins(50)); say('Varga: The core is sealed. Fifty coins credited. Chapter five begins soon, operative.'); }
  });

  const show = (k: string, s: Step) => next === s;
  return (
    <group>
      {show('shell', 'shell') && <Marker at={SPOTS.shell}><mesh material={METAL} position={[0, 0.3, 0]}><cylinderGeometry args={[0.08, 0.08, 0.3, 8]} /></mesh></Marker>}
      {show('fluid', 'fluid') && <Marker at={SPOTS.fluid}><mesh material={GLOW} position={[0, 0.3, 0]}><boxGeometry args={[0.15, 0.3, 0.15]} /></mesh></Marker>}
      <group position={[SPOTS.mixer[0], 0, SPOTS.mixer[1]]}><mesh material={METAL} position={[0, 0.5, 0]}><boxGeometry args={[0.9, 1, 0.6]} /></mesh>{next === 'mixed' && <Beam />}</group>
      {next === 'hose' && <Marker at={SPOTS.hose}><mesh material={METAL} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.18, 0.04, 6, 12]} /></mesh></Marker>}
      <group position={[SPOTS.generator[0], 0, SPOTS.generator[1]]}><mesh material={METAL} position={[0, 0.45, 0]}><boxGeometry args={[1.2, 0.9, 0.7]} /></mesh><mesh material={done.includes('generator') ? GLOW : METAL} position={[0.4, 1, 0]}><cylinderGeometry args={[0.06, 0.06, 0.3, 6]} /></mesh>{next === 'generator' && <Beam />}</group>
      <group position={[SPOTS.gate[0], 0, SPOTS.gate[1]]}>
        {!done.includes('gate') && <mesh material={METAL} position={[0, 1.5, 0]}><boxGeometry args={[4, 3, 0.2]} /></mesh>}
        {next === 'gate' && <Beam />}
      </group>
      {next === 'keycard' && <Marker at={SPOTS.keycard}><mesh material={GLOW} position={[0, 0.2, 0]}><boxGeometry args={[0.2, 0.02, 0.13]} /></mesh></Marker>}
      <group position={[SPOTS.lab[0], 0, SPOTS.lab[1]]}>{!done.includes('lab') && <mesh material={METAL} position={[0, 1.2, 0]}><boxGeometry args={[1.4, 2.4, 0.15]} /></mesh>}{(next === 'lab' || next === 'antigen') && <Beam />}</group>
      <group position={[SPOTS.bypass[0], 0, SPOTS.bypass[1]]}><mesh material={METAL} position={[1.6, 1, 0]}><boxGeometry args={[0.3, 0.8, 0.2]} /></mesh>{next === 'bypass' && <Beam />}</group>
      {wave.current.map((w, i) => <WaveHusk key={i} w={w} />)}
      <group position={[SPOTS.terminal[0], 0, SPOTS.terminal[1]]}>
        <mesh material={CORE} position={[0, 1, 0]}><dodecahedronGeometry args={[1.2]} /></mesh>
        {next === 'defend' && <Beam />}
        {boss > 0 && <group position={[0, 0, 4]}>
          <mesh material={CORE} position={[0, 2.2, 0]}><capsuleGeometry args={[1, 2.4, 4, 8]} /></mesh>
          <mesh material={GLOW} position={[0, 4.4, 0]}><sphereGeometry args={[0.6, 8, 6]} /></mesh>
          <mesh position={[0, 5.6, 0]}><boxGeometry args={[3 * boss / 300, 0.15, 0.05]} /><meshBasicMaterial color="#c0392b" /></mesh>
        </group>}
      </group>
    </group>
  );
};

const Marker: React.FC<{ at: [number, number]; children: React.ReactNode }> = ({ at, children }) => (
  <group position={[at[0], 0, at[1]]}>{children}<Beam /></group>
);
const Beam = () => <mesh material={GLOW} position={[0, 2.5, 0]}><cylinderGeometry args={[0.2, 0.2, 4, 6, 1, true]} /></mesh>;

const WaveHusk: React.FC<{ w: { x: number; z: number } }> = ({ w }) => {
  const r = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (r.current) { r.current.position.set(w.x, 0, w.z); r.current.rotation.z = Math.sin(clock.elapsedTime * 4) * 0.08; } });
  return <group ref={r}><mesh material={CORE} position={[0, 0.9, 0]}><capsuleGeometry args={[0.32, 1, 3, 6]} /></mesh><mesh material={GLOW} position={[0, 1.75, 0]}><sphereGeometry args={[0.22, 6, 5]} /></mesh></group>;
};
