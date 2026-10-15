/** Stage 6 team play: twin floodgate levers beside the quest board. Needs two village group members pulling together. */
import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { registerUse } from '@/lib/vrUse';
import { onTeam, sendTeam, getMeet } from '@/worlds/meet/vrMeet';
import { addCoins } from '@/lib/vrPickups';
import { addAmmo } from '@/lib/vrAmmo';
import { playSfx } from '@/lib/vrSfx';
import { logStory } from '@/lib/vrStoryline';
import { playerSpot } from './VillageVillagers';
import { LEVERS, teamSynced, TEAM_COOLDOWN_MS } from './villageTeam';

const toast = (t: string) => window.dispatchEvent(new CustomEvent('vr-toast', { detail: t }));
const CD = 'vr-team-levers-at';

export const VillageTeamLevers: React.FC = () => {
  const { camera } = useThree();
  const mine = useRef<{ lever: string; at: number } | null>(null);
  const theirs = useRef<{ lever: string; at: number } | null>(null);
  const check = () => {
    if (!teamSynced(mine.current, theirs.current)) return;
    mine.current = theirs.current = null;
    try { localStorage.setItem(CD, String(Date.now())); } catch { /* */ }
    playSfx('metal'); addCoins(25); addAmmo('pistol', 10); logStory('team', 'floodgate');
    toast('Varga: Floodgate open — you two did that together. Supply cache released: +25 coins, +10 rounds.');
  };
  useEffect(() => onTeam((t) => { if (t.kind === 'lever' && t.data) { theirs.current = { lever: t.data, at: t.at }; check(); } }), []); // eslint-disable-line
  useEffect(() => registerUse(() => {
    const ps = playerSpot(camera);
    let best: { d: number; id: string } | null = null;
    for (const l of LEVERS) { const d = Math.hypot(ps.x - l.pos[0], ps.z - l.pos[2]); if (d < 2 && (!best || d < best.d)) best = { d, id: l.id }; }
    if (!best) return null;
    const id = best.id;
    return { dist: best.d, reach: 2, label: `Pull the ${id} floodgate lever`, run: () => {
      const last = Number(localStorage.getItem(CD)) || 0;
      if (Date.now() - last < TEAM_COOLDOWN_MS) { playSfx('deny'); toast('The floodgate is still draining. Try again later.'); return; }
      if (!getMeet().players.length) { playSfx('deny'); toast('Varga: This needs two of you — a teammate must pull the other lever at the same time.'); return; }
      playSfx('metal'); mine.current = { lever: id, at: Date.now() }; sendTeam('lever', id);
      toast('Lever pulled — your teammate has 4 seconds to pull the other one.'); check();
    } };
  }), [camera]); // eslint-disable-line
  return (
    <>
      {LEVERS.map((l) => (
        <group key={l.id} position={l.pos}>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.35, 1, 0.35]} /><meshStandardMaterial color="#4a4f55" metalness={0.6} roughness={0.5} /></mesh>
          <mesh position={[0, 1.15, 0]} rotation={[0.5, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.7, 8]} /><meshStandardMaterial color="#7a2a1a" /></mesh>
        </group>
      ))}
    </>
  );
};
