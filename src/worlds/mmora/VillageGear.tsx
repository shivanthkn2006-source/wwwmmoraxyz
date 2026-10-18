/** Glowing pickups for village weapons, armour and quest items (Use to take). */
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registerUse } from '@/lib/vrUse';
import { BRIEFINGS, logStory } from '@/lib/vrStoryline';
import { getStory, readNote } from '@/lib/vrStory';
import { GEAR, takeGear, useGear, type Gear } from '@/lib/vrGear';
import { playerSpot } from './VillageVillagers';

const COL = { weapon: '#c9d3df', armour: '#b07a3c', quest: '#ffd25a' };

export const VillageGearItem: React.FC<{ g: Gear }> = ({ g }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) { ref.current.rotation.y = clock.elapsedTime; ref.current.position.y = g.pos[1] + Math.sin(clock.elapsedTime * 2) * 0.08; } });
  return (
    <group ref={ref} position={g.pos}>
      <mesh><boxGeometry args={g.kind === 'weapon' ? [0.6, 0.12, 0.12] : g.kind === 'armour' ? [0.4, 0.45, 0.15] : [0.3, 0.3, 0.06]} />
        <meshStandardMaterial color={COL[g.kind]} emissive={COL[g.kind]} emissiveIntensity={0.7} metalness={0.6} roughness={0.35} /></mesh>
      <mesh><sphereGeometry args={[0.55, 12, 8]} /><meshBasicMaterial color="#ffe08a" transparent opacity={0.15} depthWrite={false} /></mesh>
    </group>
  );
};

export const VillageGear: React.FC = () => {
  const { camera } = useThree();
  const owned = useGear();
  // First visit: the opening briefing appears by itself once.
  useEffect(() => { const t = window.setTimeout(() => { if (!getStory().notes.includes(BRIEFINGS.intro.id)) readNote(BRIEFINGS.intro.id); }, 4000); return () => window.clearTimeout(t); }, []);
  // Commander Varga's radio plays by itself once per chapter (after the intro briefing).
  const chapter = !owned.includes('map') ? 'map' : !owned.includes('medallion') ? 'medallion' : !owned.includes('crest') ? 'crest' : 'done';
  useEffect(() => {
    const key = `mmora-radio-${chapter}`;
    if (localStorage.getItem(key)) return;
    const t = window.setTimeout(() => {
      if (!getStory().notes.includes(BRIEFINGS.intro.id)) return;
      localStorage.setItem(key, '1'); logStory('radio', chapter);
      void import('@/lib/vrStoryline').then((sl) => import('@/utils/deepgramTTS').then((m) => m.speakWithDeepgramVoice(sl.RADIO[chapter], 'female'))).catch(() => {});
    }, 9000);
    return () => window.clearTimeout(t);
  }, [chapter]);
  useEffect(() => registerUse(() => {
    const ps = playerSpot(camera);
    let best: { d: number; g: Gear } | null = null;
    for (const g of GEAR) { if (g.shop) continue;
      if (owned.includes(g.id)) continue;
      const d = Math.hypot(ps.x - g.pos[0], ps.z - g.pos[2]);
      if (!best || d < best.d) best = { d, g };
    }
    if (!best) return null;
    const g = best.g;
    // Quest items unlock in order: map → medallion → crest.
    const needs: Record<string, [string, string]> = { medallion: ['map', 'Old Village Map'], crest: ['medallion', 'Church Medallion'] };
    const req = needs[g.id];
    const brief = BRIEFINGS[g.id as 'map'];
    if (g.kind === 'quest' && brief) {
      const read = getStory().notes;
      const need = !read.includes(BRIEFINGS.intro.id) ? BRIEFINGS.intro : !read.includes(brief.id) ? brief : null;
      if (need) return { dist: best.d * 0.5, reach: 1.4, label: `Read ${need.title.split(' · ')[0]} first`, run: () => readNote(need.id) };
    }
    if (req && !owned.includes(req[0])) return { dist: best.d * 0.5, reach: 1.4, label: `Find the ${req[1]} first`, run: () => {} };
    return { dist: best.d * 0.5, reach: 1.4, label: `Pick up ${g.name}`, run: () => { takeGear(g); logStory('item', g.id); } };
  }), [camera, owned]);
  return <>{GEAR.filter((g) => !g.shop && !owned.includes(g.id)).map((g) => <VillageGearItem key={g.id} g={g} />)}</>;
};
