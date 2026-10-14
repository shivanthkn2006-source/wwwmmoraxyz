/**
 * Stages 3–4 (from the uploaded blueprint, adapted to M'Mora Village):
 * Empty Fuse Shell + Chemical Fluid → mixer → Charged Fuse → powers the core gate,
 * the Verdant Antigen sits behind it, and inserting it into the core terminal
 * starts a 45-second defence. Unlocks after the Lord's Crest chapter.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { useGear } from '@/lib/vrGear';
import { logStory } from '@/lib/vrStoryline';
import { playerSpot } from './VillageVillagers';

type Step = 'shell' | 'fluid' | 'mixed' | 'gate' | 'antigen' | 'defend' | 'cleared';
const KEY = 'mmora-fuse-puzzle';
const ORDER: Step[] = ['shell', 'fluid', 'mixed', 'gate', 'antigen', 'defend', 'cleared'];
const SPOTS: Record<string, [number, number]> = { shell: [20, -18], fluid: [-22, 16], mixer: [6, 24], gate: [-8, -30], terminal: [-8, -36] };
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
  const defendT = useRef(0); const pulse = useRef(0);
  const mark = (s: Step) => setDone((d) => { const n = d.includes(s) ? d : [...d, s]; localStorage.setItem(KEY, JSON.stringify(n)); logStory('puzzle', s); void import('@/lib/vrGear').then((m) => m.saveProgressNow()); return n; });
  const next = ORDER.find((s) => !done.includes(s));

  useEffect(() => { if (!done.length) say('Varga: Operative, the core gate under the keep needs a charged fuse. Find an empty fuse shell and chemical fluid.'); }, []); // eslint-disable-line

  useEffect(() => registerUse(() => {
    const ps = playerSpot(camera);
    const near = (k: string) => Math.hypot(ps.x - SPOTS[k][0], ps.z - SPOTS[k][1]);
    const opt = (k: string, label: string, run: () => void) => ({ dist: near(k), reach: 2.6, label, run });
    if (next === 'shell') return opt('shell', 'Take Empty Fuse Shell', () => { sfx('metal'); mark('shell'); say('Picked up an Empty Fuse Shell.'); });
    if (next === 'fluid') return opt('fluid', 'Take Chemical Fluid', () => { sfx('paper'); mark('fluid'); say('Picked up Chemical Fluid from the researcher.'); });
    if (next === 'mixed') return opt('mixer', 'Use Chemical Mixer', () => { sfx('typewriter'); mark('mixed'); say('Created a Charged Fuse.'); });
    if (next === 'gate') return opt('gate', 'Insert Charged Fuse', () => { sfx('metal'); mark('gate'); say('Varga: Gate is live. The Verdant Antigen is inside. Take it.'); });
    if (next === 'antigen') return opt('gate', 'Take Verdant Antigen', () => { sfx('medallion'); mark('antigen'); say('Picked up the Verdant Antigen. Insert it into the core terminal.'); });
    if (next === 'defend' && defendT.current <= 0) return opt('terminal', 'Insert Antigen into Core', () => { defendT.current = 45; window.dispatchEvent(new CustomEvent('vr-danger')); say('Varga: Hold the core for forty-five seconds!'); });
    return null;
  }), [camera, next]);

  useFrame((_, dt) => {
    if (defendT.current <= 0) return;
    defendT.current -= dt; pulse.current -= dt;
    const ps = playerSpot(camera);
    const atCore = Math.hypot(ps.x - SPOTS.terminal[0], ps.z - SPOTS.terminal[1]) < 12;
    if (pulse.current <= 0) { pulse.current = 5; if (atCore) window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: 6 } })); }
    if (!atCore) { defendT.current = 0; say('You left the core. Return and insert the Antigen again.'); return; }
    if (defendT.current <= 0) { mark('defend'); mark('cleared'); void import('@/lib/vrPickups').then((m) => m.addCoins(50)); say('Varga: The core is sealed. Fifty coins credited. Chapter five begins soon, operative.'); }
  });

  const show = (k: string, s: Step) => next === s;
  return (
    <group>
      {show('shell', 'shell') && <Marker at={SPOTS.shell}><mesh material={METAL} position={[0, 0.3, 0]}><cylinderGeometry args={[0.08, 0.08, 0.3, 8]} /></mesh></Marker>}
      {show('fluid', 'fluid') && <Marker at={SPOTS.fluid}><mesh material={GLOW} position={[0, 0.3, 0]}><boxGeometry args={[0.15, 0.3, 0.15]} /></mesh></Marker>}
      <group position={[SPOTS.mixer[0], 0, SPOTS.mixer[1]]}><mesh material={METAL} position={[0, 0.5, 0]}><boxGeometry args={[0.9, 1, 0.6]} /></mesh>{next === 'mixed' && <Beam />}</group>
      <group position={[SPOTS.gate[0], 0, SPOTS.gate[1]]}>
        {!done.includes('gate') && <mesh material={METAL} position={[0, 1.5, 0]}><boxGeometry args={[4, 3, 0.2]} /></mesh>}
        {(next === 'gate' || next === 'antigen') && <Beam />}
      </group>
      <group position={[SPOTS.terminal[0], 0, SPOTS.terminal[1]]}>
        <mesh material={CORE} position={[0, 1, 0]}><dodecahedronGeometry args={[1.2]} /></mesh>
        {next === 'defend' && <Beam />}
      </group>
    </group>
  );
};

const Marker: React.FC<{ at: [number, number]; children: React.ReactNode }> = ({ at, children }) => (
  <group position={[at[0], 0, at[1]]}>{children}<Beam /></group>
);
const Beam = () => <mesh material={GLOW} position={[0, 2.5, 0]}><cylinderGeometry args={[0.2, 0.2, 4, 6, 1, true]} /></mesh>;
