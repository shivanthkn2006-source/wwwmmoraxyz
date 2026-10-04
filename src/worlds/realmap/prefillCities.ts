/**
 * Prepares the city centres of South India in the shared map store, so the
 * first member in each city gets their street instantly. Map servers block
 * cloud servers, so this runs from the admin's own device, one block at a
 * time with a pause in between (polite to the free map service).
 */
import { useSyncExternalStore } from 'react';
import { chunkBBox, chunkOf, neighborhood } from './geo';
import { loadChunk, setChunkKeyFn } from './osm';

export const SOUTH_INDIA_CITIES = [
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kochi', lat: 9.9312, lng: 76.2673 },
  { name: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9366 },
  { name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
  { name: 'Madurai', lat: 9.9252, lng: 78.1198 },
  { name: 'Mysuru', lat: 12.2958, lng: 76.6394 },
  { name: 'Mangaluru', lat: 12.9141, lng: 74.856 },
] as const;
/** 5×5 blocks ≈ 1 km × 1 km around each centre. */
export const PREFILL_RADIUS = 2;
const PAUSE_MS = 4000;

type P = { running: boolean; done: number; total: number; ok: number; city: string | null };
let st: P = { running: false, done: 0, total: 0, ok: 0, city: null };
const ls = new Set<() => void>();
const set = (p: Partial<P>) => { st = { ...st, ...p }; ls.forEach((l) => l()); };
export const usePrefill = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => st, () => st);

export function prefillPlan() {
  return SOUTH_INDIA_CITIES.flatMap((c) => {
    const h = chunkOf(c, c.lat);
    return neighborhood(h.i, h.j, PREFILL_RADIUS).map((id) => ({ city: c.name, lat: c.lat, id }));
  });
}

let stop = false;
export async function runPrefill() {
  if (st.running) return;
  const plan = prefillPlan();
  stop = false;
  set({ running: true, done: 0, total: plan.length, ok: 0 });
  for (const step of plan) {
    if (stop) break;
    set({ city: step.city });
    setChunkKeyFn((lat, lng) => chunkOf({ lat, lng }, step.lat).key);
    const d = await loadChunk(step.id.key, chunkBBox(step.id.i, step.id.j, step.lat)).catch(() => null);
    set({ done: st.done + 1, ok: st.ok + (d ? 1 : 0) });
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  set({ running: false, city: null });
}
export function stopPrefill() { stop = true; }
