/**
 * Weapons, armour and quest items found in M'Mora Village. Each has one
 * pickup spot in the village; once taken it lists under Files in the case.
 * Saved on the device and recorded to the member's bag (vrQuests).
 */
import { useSyncExternalStore } from 'react';
import { recordVRCollect } from '@/lib/vrQuests';
import { playPickup } from '@/lib/vrSfx';

export type GearKind = 'weapon' | 'armour' | 'quest';
export type Gear = { id: string; kind: GearKind; name: string; icon: string; detail: string; pos: [number, number, number] };

export const GEAR: Gear[] = [
  { id: 'pistol', kind: 'weapon', name: 'Handgun', icon: '🔫', detail: 'A worn 9mm handgun.', pos: [6, 0.9, 6] },
  { id: 'knife', kind: 'weapon', name: 'Combat Knife', icon: '🔪', detail: 'Short, sharp and reliable.', pos: [-14, 0.9, -8] },
  { id: 'shotgun', kind: 'weapon', name: 'Shotgun', icon: '🪓', detail: 'Hunting shotgun from the castle armoury.', pos: [-70, 0.9, 4] },
  { id: 'vest', kind: 'armour', name: 'Leather Vest', icon: '🦺', detail: 'Takes the edge off a hit.', pos: [-9, 0.9, -34] },
  { id: 'helmet', kind: 'armour', name: 'Iron Helmet', icon: '⛑️', detail: 'Old castle guard helmet.', pos: [-62, 0.9, 14] },
  { id: 'crest', kind: 'quest', name: "Lord's Crest", icon: '🛡️', detail: 'Found in the castle keep. Bears the M\'Mora mark.', pos: [-70, 0.9, 1] },
  { id: 'medallion', kind: 'quest', name: 'Church Medallion', icon: '🏅', detail: 'Left on the church altar.', pos: [-14, 1.7, -59.2] },
  { id: 'map', kind: 'quest', name: 'Old Village Map', icon: '🗺️', detail: 'Marks the church, the castle and the shore.', pos: [16, 0.9, -20] },
];

const KEY = 'vr-gear';
let owned: string[] = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } })();
const ls = new Set<() => void>();
export const useGear = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => owned, () => owned);
export const hasGear = (id: string) => owned.includes(id);
export function takeGear(g: Gear) {
  if (hasGear(g.id)) return;
  owned = [...owned, g.id];
  try { localStorage.setItem(KEY, JSON.stringify(owned)); } catch { /* */ }
  ls.forEach((l) => l());
  playPickup('coin');
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('vr-hand-reach'));
  void recordVRCollect({ type: `${g.kind}_${g.id}`, rarity: g.kind === 'quest' ? 'epic' : 'rare' });
}

// ── Equipping: one weapon, any armour. Changes stats and the avatar's look. ──
const EKEY = 'vr-gear-equipped';
let equipped: string[] = (() => { try { return JSON.parse(localStorage.getItem(EKEY) || '[]'); } catch { return []; } })();
const els = new Set<() => void>();
export const useEquipped = () => useSyncExternalStore((l) => { els.add(l); return () => els.delete(l); }, () => equipped, () => equipped);
export const isEquipped = (id: string) => equipped.includes(id);
export function toggleEquip(id: string) {
  const g = GEAR.find((x) => x.id === id);
  if (!g || g.kind === 'quest' || !hasGear(id)) return;
  equipped = isEquipped(id) ? equipped.filter((x) => x !== id)
    : [...equipped.filter((x) => !(g.kind === 'weapon' && GEAR.find((y) => y.id === x)?.kind === 'weapon')), id];
  try { localStorage.setItem(EKEY, JSON.stringify(equipped)); } catch { /* */ }
  els.forEach((l) => l());
}
const STAT: Record<string, { attack?: number; defence?: number }> = {
  pistol: { attack: 12 }, knife: { attack: 6 }, shotgun: { attack: 25 }, vest: { defence: 15 }, helmet: { defence: 10 },
};
/** Base 5 attack / 0 defence plus whatever is equipped. */
export function gearStats(ids: string[]) {
  let attack = 5, defence = 0;
  for (const id of ids) { attack += STAT[id]?.attack ?? 0; defence += STAT[id]?.defence ?? 0; }
  return { attack, defence };
}
