/**
 * Stage 7 — "Watch Drill" timed bonus mode: tap Use at the red drill stone,
 * defeat as many villagers as possible in 120 s, each kill +100 and +5 s.
 * Best score kept on the device; reward 1 coin per 100 points.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { registerUse } from '@/lib/vrUse';
import { logStory } from '@/lib/vrStoryline';
import { playerSpot } from './VillageVillagers';

const SPOT: [number, number] = [14, 30];
const STONE = new THREE.MeshStandardMaterial({ color: '#5a2420', roughness: 0.8, emissive: '#3a0a08', emissiveIntensity: 0.6 });
const BEST = 'mmora-drill-best';
const toast = (t: string) => window.dispatchEvent(new CustomEvent('vr-toast', { detail: t }));

export const VillageBonusMode: React.FC = () => {
  const { camera } = useThree();
  const left = useRef(0); const [hud, setHud] = useState<{ t: number; s: number } | null>(null); const score = useRef(0);

  useEffect(() => {
    const onKill = () => { if (left.current > 0) { score.current += 100; left.current += 5; } };
    window.addEventListener('vr-kill', onKill); return () => window.removeEventListener('vr-kill', onKill);
  }, []);

  useEffect(() => registerUse(() => {
    if (left.current > 0) return null;
    const ps = playerSpot(camera);
    return { dist: Math.hypot(ps.x - SPOT[0], ps.z - SPOT[1]), reach: 2.6, label: 'Start Watch Drill (120 s)', run: () => {
      left.current = 120; score.current = 0; logStory('bonus', 'drill:start'); window.dispatchEvent(new CustomEvent('vr-danger'));
      toast('Watch Drill: defeat villagers — each one +100 points and +5 seconds!');
    } };
  }), [camera]);

  useFrame((_, dt) => {
    if (left.current <= 0) return;
    left.current -= Math.min(dt, 0.1);
    const t = Math.max(0, Math.ceil(left.current));
    if (!hud || hud.t !== t || hud.s !== score.current) setHud({ t, s: score.current });
    if (left.current <= 0) {
      const s = score.current, best = Number(localStorage.getItem(BEST) || 0);
      if (s > best) localStorage.setItem(BEST, String(s));
      const coins = Math.floor(s / 100); if (coins) void import('@/lib/vrPickups').then((m) => m.addCoins(coins));
      logStory('bonus', `drill:end:${s}`); toast(`Drill over · ${s} points${s > best ? ' · new best!' : ''} · +${coins} coins`); setHud(null);
    }
  });

  return (
    <group position={[SPOT[0], 0, SPOT[1]]}>
      <mesh material={STONE} position={[0, 0.6, 0]}><boxGeometry args={[0.9, 1.2, 0.5]} /></mesh>
      {hud && <Html position={[0, 0, 0]} calculatePosition={() => [window.innerWidth / 2, 104]} zIndexRange={[40, 0]}>
        <div style={{ transform: 'translateX(-50%)', fontStyle: 'italic', color: 'hsl(0 0% 100%)', textShadow: '0 1px 3px hsl(0 0% 0%)', fontSize: 18, whiteSpace: 'nowrap' }}>
          Watch Drill · {hud.t}s · {hud.s} pts
        </div>
      </Html>}
    </group>
  );
};
