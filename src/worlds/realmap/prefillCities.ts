/**
 * Prepares the city centres of South India in the shared map store, so the
 * first member in each city gets their street instantly. Map servers block
 * cloud servers, so this runs from the admin's own device, one block at a
 * time with a pause in between (polite to the free map service).
 */
import { useSyncExternalStore } from 'react';
import { chunkBBox, chunkOf, neighborhood } from './geo';
import { loadChunk } from './osm';

export const SOUTH_INDIA_CITIES = [
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kochi', lat: 9.9312, lng: 76.2673 },
  { name: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9366 },
  { name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
  { name: 'Madurai', lat: 9.9252, lng: 78.1198 },
  { name: 'Mysuru', lat: 12.2958, lng: 76.6394 },
  { name: 'Mangaluru', lat: 12.9141, lng: 74.856 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
  { name: 'Vijayawada', lat: 16.5062, lng: 80.648 },
  { name: 'Kozhikode', lat: 11.2588, lng: 75.7804 },
  { name: 'Thrissur', lat: 10.5276, lng: 76.2144 },
  { name: 'Kollam', lat: 8.8932, lng: 76.6141 },
  { name: 'Tiruchirappalli', lat: 10.7905, lng: 78.7047 },
  { name: 'Salem', lat: 11.6643, lng: 78.146 },
  { name: 'Puducherry', lat: 11.9416, lng: 79.8083 },
  { name: 'Hubballi', lat: 15.3647, lng: 75.124 },
] as const;
/** 5×5 blocks ≈ 1 km × 1 km around each centre. */
export const PREFILL_RADIUS = 2;
const PAUSE_MS = 4000;

type P = { running: boolean; done: number; total: number; ok: number; city: string | null; perCity: Record<string, { ok: number; shops: number; roads: number }> };
let st: P = { running: false, done: 0, total: 0, ok: 0, city: null, perCity: {} };
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
  set({ running: true, done: 0, total: plan.length, ok: 0, perCity: {} });
  for (const step of plan) {
    if (stop) break;
    set({ city: step.city });
    const band = step.lat;
    const d = await loadChunk(step.id.key, chunkBBox(step.id.i, step.id.j, band), (lat, lng) => chunkOf({ lat, lng }, band).key).catch(() => null);
    const pc = st.perCity[step.city] ?? { ok: 0, shops: 0, roads: 0 };
    set({ done: st.done + 1, ok: st.ok + (d ? 1 : 0), perCity: { ...st.perCity, [step.city]: d ? { ok: pc.ok + 1, shops: pc.shops + d.pois.length, roads: pc.roads + d.roads.length } : pc } });
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  set({ running: false, city: null });
  if (!stop && st.ok >= Math.floor(st.total * 0.9)) { try { localStorage.setItem(DONE_KEY, new Date().toISOString()); } catch { /* private */ } }
}
const DONE_KEY = 'vr-prefill-south-india-done';
export const prefillDone = () => { try { return !!localStorage.getItem(DONE_KEY); } catch { return false; } };
export function stopPrefill() { stop = true; }
