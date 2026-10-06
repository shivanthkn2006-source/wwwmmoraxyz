/**
 * Street relics: a few glowing relics placed on real roads of each loaded
 * block. Positions come from the block's real road points and a seed of
 * (block key + today's date), so every member sees the same relics on the
 * same street, and they refresh each day. Picked-up relics are remembered
 * on the device for the day.
 */
import { useSyncExternalStore } from 'react';
import type { OsmChunk } from './osm';
import type { Rarity } from '@/lib/vrQuests';

export type StreetRelic = { id: string; lat: number; lng: number; rarity: Rarity; type: string };

export const RELICS_PER_BLOCK = 2;
const TYPES = ['street_relic', 'memory_shard', 'treasure_chest'] as const;

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const rarityOf = (r: number): Rarity => (r < 0.55 ? 'common' : r < 0.8 ? 'uncommon' : r < 0.93 ? 'rare' : r < 0.985 ? 'epic' : 'legendary');

/** Pure: pick relic spots on real road points of one block. */
export function relicsForBlock(key: string, data: Pick<OsmChunk, 'roads'>, day: string): StreetRelic[] {
  const pts: [number, number][] = [];
  for (const r of data.roads) for (const p of r.pts) pts.push(p);
  if (!pts.length) return [];
  const out: StreetRelic[] = [];
  let seed = hashStr(`${key}|${day}`);
  const rnd = () => { seed = Math.imul(seed ^ (seed >>> 15), 2246822519) >>> 0; seed ^= seed >>> 13; return (seed >>> 0) / 4294967296; };
  for (let n = 0; n < RELICS_PER_BLOCK; n++) {
    const p = pts[Math.floor(rnd() * pts.length)];
    const typeRoll = rnd();
    out.push({
      id: `${key}:${day}:${n}`, lat: p[0], lng: p[1], rarity: rarityOf(rnd()),
      type: typeRoll < 0.7 ? TYPES[0] : typeRoll < 0.9 ? TYPES[1] : TYPES[2],
    });
  }
  return out;
}

export const today = () => new Date().toISOString().slice(0, 10);
const KEY = () => `vr-street-relics-${today()}`;
const readTaken = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(KEY()) ?? '[]')); } catch { return new Set(); } };

let blocks = new Map<string, StreetRelic[]>();
let taken = typeof localStorage === 'undefined' ? new Set<string>() : readTaken();
let snap: StreetRelic[] = [];
const ls = new Set<() => void>();
const emit = () => { snap = [...blocks.values()].flat().filter((r) => !taken.has(r.id)); ls.forEach((l) => l()); };

export function addBlockRelics(key: string, data: Pick<OsmChunk, 'roads'>) { blocks.set(key, relicsForBlock(key, data, today())); emit(); }
export function dropBlockRelics(key: string) { if (blocks.delete(key)) emit(); }
export function takeRelic(id: string) {
  taken.add(id);
  try { localStorage.setItem(KEY(), JSON.stringify([...taken])); } catch { /* private mode */ }
  emit();
}
/** Drop relics at named shops (admin drops are shared via realmapAdminSettings; same ids for every member). */
export function dropRelicsAtPlaces(pois: { lat: number; lng: number; name: string }[], rarity: Rarity = 'rare'): number {
  const have = blocks.get('admin-drops') ?? [];
  const list = pois.slice(0, 10).map((p) => ({ id: `admin-${today()}-${hashStr(`${p.name}|${p.lat.toFixed(5)}|${p.lng.toFixed(5)}`)}`, lat: p.lat, lng: p.lng, rarity, type: 'shop_relic' }) as StreetRelic)
    .filter((r) => !have.some((h) => h.id === r.id));
  if (!list.length) return 0;
  blocks.set('admin-drops', [...have, ...list]); emit();
  return list.length;
}
export const getStreetRelics = () => snap;
export const useStreetRelics = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => snap, () => snap);
export function __resetStreetRelics() { blocks = new Map(); taken = new Set(); snap = []; }
