/**
 * Zoe street awareness: every few seconds tells Zoe (via her ambient context)
 * which real street you're on, the nearest places, and friends nearby with the
 * streets they walked recently (trails). Zoe uses it when you ask her.
 */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { setAmbientExtra, setAmbientContext } from '@/services/zoe-agent/ambientContext';
import { mapBlocks } from './mapIndex';
import { toLocal, type LatLng } from './geo';
import { getMeet } from '@/worlds/meet/vrMeet';

const trails = new Map<string, string[]>(); // friend → recent street names
const d2 = (ax: number, az: number, bx: number, bz: number) => (ax - bx) ** 2 + (az - bz) ** 2;

export function nearestStreet(x: number, z: number, origin: LatLng): string | null {
  let best: string | null = null, bd = 60 * 60;
  mapBlocks().forEach((b) => b.roads.forEach((r) => {
    if (!r.name) return;
    for (const [la, ln] of r.pts) { const p = toLocal({ lat: la, lng: ln }, origin); const d = d2(x, z, p.x, p.z); if (d < bd) { bd = d; best = r.name; } }
  }));
  return best;
}

export const ZoeStreetAwareness: React.FC<{ origin: LatLng }> = ({ origin }) => {
  const { camera } = useThree();
  useEffect(() => {
    const tick = () => {
      const { x, z } = camera.position;
      const street = nearestStreet(x, z, origin);
      const places: { n: string; d: number }[] = [];
      mapBlocks().forEach((b) => b.pois.forEach((p) => { const q = toLocal(p, origin); places.push({ n: `${p.name} (${p.kind})`, d: d2(x, z, q.x, q.z) }); }));
      places.sort((a, b) => a.d - b.d);
      const friends = getMeet().players.filter((r) => r.tag === 'friend' && r.mode === 'real' && r.lat != null && r.lng != null);
      for (const f of friends) {
        const q = toLocal({ lat: f.lat!, lng: f.lng! }, origin);
        const s = nearestStreet(q.x, q.z, origin);
        if (s) { const t = trails.get(f.username) ?? []; if (t[t.length - 1] !== s) trails.set(f.username, [...t, s].slice(-4)); }
      }
      setAmbientContext({ activeVRLocation: street ? `Real Map, on ${street}` : 'Real Map', friendsList: friends.map((f) => ({ name: f.name, online: true })) });
      setAmbientExtra('VR nearby places', places.slice(0, 5).map((p) => p.n).join(', ') || null);
      setAmbientExtra('VR friends nearby', friends.map((f) => {
        const q = toLocal({ lat: f.lat!, lng: f.lng! }, origin);
        return `${f.name} ~${Math.round(Math.sqrt(d2(x, z, q.x, q.z)))} m away, trail: ${(trails.get(f.username) ?? []).join(' → ') || 'unknown'}`;
      }).join('; ') || null);
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => { clearInterval(t); setAmbientContext({ activeVRLocation: null }); setAmbientExtra('VR nearby places', null); setAmbientExtra('VR friends nearby', null); };
  }, [camera, origin]);
  return null;
};
export default ZoeStreetAwareness;
