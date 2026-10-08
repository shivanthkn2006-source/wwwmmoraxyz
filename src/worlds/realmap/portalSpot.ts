/**
 * Portals stand on open common ground, never behind or inside buildings.
 * The spot is chosen once the street around it has loaded, then locked for
 * that portal so it always stays in the same place.
 */
import { useEffect, useState } from 'react';
import { findOpenSpot } from '@/lib/vrSolids';
import { getWorldState } from '../worldMode';

const locked = new Map<string, [number, number, number]>();

export function useOpenPortalSpot(base: [number, number, number]): [number, number, number] {
  const key = `${getWorldState().mode === 'real' && getWorldState().origin.status === 'ready' ? JSON.stringify((getWorldState().origin as { origin?: unknown }).origin) : ''}|${base[0]},${base[2]}`;
  const [pos, setPos] = useState<[number, number, number]>(() => locked.get(key) ?? base);
  useEffect(() => {
    const hit = locked.get(key); if (hit) { setPos(hit); return; }
    let tries = 0;
    const t = window.setInterval(() => {
      tries++;
      if (getWorldState().chunksLoaded === 0 && tries < 20) return;
      const [x, z] = findOpenSpot(base[0], base[2]);
      const p: [number, number, number] = [x, base[1], z];
      locked.set(key, p); setPos(p); window.clearInterval(t);
    }, 1500);
    return () => window.clearInterval(t);
  }, [key, base[0], base[1], base[2]]);
  return pos;
}
