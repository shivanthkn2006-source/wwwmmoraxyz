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
  { id: 'vest', kind: 'armour', name: 'Leather Vest', icon: '🦺', detail: 'Takes the edge off a hit.', pos: [-3, 0.9, -78] },
  { id: 'helmet', kind: 'armour', name: 'Iron Helmet', icon: '⛑️', detail: 'Old castle guard helmet.', pos: [-62, 0.9, 14] },
  { id: 'crest', kind: 'quest', name: "Lord's Crest", icon: '🛡️', detail: 'Found in the castle keep. Bears the M\'Mora mark.', pos: [-70, 0.9, 1] },
  { id: 'medallion', kind: 'quest', name: 'Church Medallion', icon: '🏅', detail: 'Left on the church altar.', pos: [0, 1.7, -93] },
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
