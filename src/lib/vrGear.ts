import { readVillage, applyVillage, villageChanged, type VillageProgress } from '@/lib/vrVillageProgress';
/**
 * Weapons, armour and quest items found in M'Mora Village. Each has one
 * pickup spot in the village; once taken it lists under Files in the case.
 * Saved on the device and recorded to the member's bag (vrQuests).
 */
import { useSyncExternalStore } from 'react';
import { recordVRCollect } from '@/lib/vrQuests';
import { playPickup, playSfx } from '@/lib/vrSfx';
import { getAmmo, mergeAmmo, subscribeAmmo } from '@/lib/vrAmmo';
import { getGoldHerbs, mergeGoldHerbs, subscribeGoldHerbs } from '@/lib/vrPickups';

export type GearKind = 'weapon' | 'armour' | 'quest';
export type Gear = { id: string; kind: GearKind; name: string; icon: string; detail: string; pos: [number, number, number]; shop?: boolean };

export const GEAR: Gear[] = [
  { id: 'pistol', kind: 'weapon', name: 'Handgun', icon: '🔫', detail: 'A worn 9mm handgun.', pos: [6, 0.9, 6] },
  { id: 'knife', kind: 'weapon', name: 'Combat Knife', icon: '🔪', detail: 'Short, sharp and reliable.', pos: [-14, 0.9, -8] },
  { id: 'shotgun', kind: 'weapon', name: 'Shotgun', icon: '🪓', detail: 'Hunting shotgun from the castle armoury.', pos: [-70, 0.9, 4] },
  { id: 'vest', kind: 'armour', name: 'Leather Vest', icon: '🦺', detail: 'Takes the edge off a hit.', pos: [-9, 0.9, -34] },
  { id: 'helmet', kind: 'armour', name: 'Iron Helmet', icon: '⛑️', detail: 'Old castle guard helmet.', pos: [-62, 0.9, 14] },
  { id: 'crest', kind: 'quest', name: "Lord's Crest", icon: '🛡️', detail: 'Found in the castle keep. Bears the M\'Mora mark.', pos: [-70, 0.9, 1] },
  { id: 'medallion', kind: 'quest', name: 'Church Medallion', icon: '🏅', detail: 'Left on the church altar.', pos: [-14, 1.7, -59.2] },
  { id: 'rocket', kind: 'weapon', name: 'Rocket Launcher', icon: '🚀', detail: 'Mercenary rocket launcher. Sold only by the merchant.', pos: [0, -50, 0], shop: true },
  { id: 'headlamp', kind: 'armour', name: "Miner's Headlamp", icon: '🔦', detail: 'Strap-on forehead lamp for night walks. Press L to switch on/off. Sold by villagers for 15 coins.', pos: [0, -50, 0], shop: true },
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
  if (g.kind === 'quest') void import('@/lib/vrStoryline').then(async (sl) => { const r = sl.FIELD_REPORTS[g.id]; if (r) (await import('@/lib/vrStory')).readNote(r.id); });
  if (g.kind === 'quest') { try { localStorage.setItem('mmora-autosave-at', String(Date.now())); } catch { /* */ } window.setTimeout(() => saveProgressNow(), 0); window.dispatchEvent(new CustomEvent('vr-toast', { detail: 'Chapter auto-saved' })); }
  if (g.kind === 'quest') playSfx(g.id === 'map' ? 'paper' : 'medallion'); else playPickup('coin');
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
  playSfx(({ pistol: 'gun', shotgun: 'shotgun', rocket: 'rocket', knife: 'knife', vest: 'leather', helmet: 'metal' } as const)[id as 'pistol'] ?? 'metal');
}
const STAT: Record<string, { attack?: number; defence?: number }> = {
  pistol: { attack: 12 }, knife: { attack: 6 }, shotgun: { attack: 25 }, rocket: { attack: 80 }, vest: { defence: 15 }, helmet: { defence: 10 },
};
/** Base 5 attack / 0 defence plus whatever is equipped. */
// ── Level: earned from quest rewards; each level adds +3 attack, +2 defence. ──
const LKEY = 'vr-level';
let level = (() => { try { return Math.max(1, Number(localStorage.getItem(LKEY)) || 1); } catch { return 1; } })();
const lls = new Set<() => void>();
export const useLevel = () => useSyncExternalStore((l) => { lls.add(l); return () => lls.delete(l); }, () => level, () => level);
export const getLevel = () => level;
export function levelUp() {
  level += 1;
  try { localStorage.setItem(LKEY, String(level)); } catch { /* */ }
  lls.forEach((l) => l());
}
export const getEquipped = () => equipped;
/** Stage 5 merchant upgrades: +6 attack per weapon level, +4 defence per armour level. */
const UKEY = 'mmora-upgrades';
export const getUpgrades = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem(UKEY) || '{}'); } catch { return {}; } };
export function upgradeGear(id: string) { const u = getUpgrades(); if ((u[id] ?? 0) >= 5) return false; u[id] = (u[id] ?? 0) + 1; localStorage.setItem(UKEY, JSON.stringify(u)); lls.forEach((l) => l()); villageChanged(); return true; }
export function gearStats(ids: string[], lvl = level) {
  let attack = 5 + (lvl - 1) * 3, defence = (lvl - 1) * 2;
  const up = getUpgrades();
  for (const id of ids) { attack += (STAT[id]?.attack ?? 0) + (STAT[id]?.attack ? (up[id] ?? 0) * 6 : 0); defence += (STAT[id]?.defence ?? 0) + (STAT[id]?.defence ? (up[id] ?? 0) * 4 : 0); }
  if (hasGear('crest')) attack += 5; // carried Lord's Crest
  return { attack, defence };
}
/** How each weapon fights: reach in metres and seconds between hits. */
export const WEAPON_FIGHT: Record<string, { reach: number; cooldown: number; label: string }> = {
  knife: { reach: 2.2, cooldown: 0.45, label: 'Slash' },
  pistol: { reach: 6, cooldown: 0.8, label: 'Shoot' },
  shotgun: { reach: 4, cooldown: 1.6, label: 'Blast' },
  rocket: { reach: 10, cooldown: 3, label: 'Fire' },
};
export const equippedWeapon = () => equipped.find((id) => WEAPON_FIGHT[id]) ?? null;

// ── Account copy: level, found items and equipped items follow the member to any device. ──
let syncTimer: number | undefined;
let loadedFor: string | null = null;
let readyFor: string | null = null; // set only after the account copy was actually read
async function uid() {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data } = await supabase.auth.getSession();
  return { supabase, id: data.session?.user?.id ?? null };
}
function pushSoon(delay = 1500) {
  if (typeof window === 'undefined') return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(async () => {
    try {
      const { supabase, id } = await uid(); if (!id) return;
      // Upload only after merging with the account copy, so a fresh/cleared device can't wipe gear (e.g. the rifle).
      if (readyFor !== id) { loadedFor = null; await loadGearProgress(); if (readyFor !== id) return; }
      await supabase.from('vr_player_progress' as never).upsert({ user_id: id, level, gear: owned, equipped, ammo: getAmmo(), gold_herbs: getGoldHerbs(), village: readVillage(), updated_at: new Date().toISOString() } as never, { onConflict: 'user_id' });
    } catch { /* offline: retried on the next change */ }
  }, delay);
}
/** Merge the account copy with this device (keeps the higher level and every item found anywhere). */
export async function loadGearProgress() {
  try {
    const { supabase, id } = await uid(); if (!id || loadedFor === id) return;
    loadedFor = id;
    const { data, error } = await supabase.from('vr_player_progress' as never).select('level,gear,equipped,ammo,gold_herbs,village,updated_at').eq('user_id', id).maybeSingle();
    if (error) { loadedFor = null; return; }
    readyFor = id;
    const row = data as { level: number; gear: string[]; equipped: string[]; ammo?: Record<string, { inMag: number; reserve: number }>; gold_herbs?: number; village?: Partial<VillageProgress>; updated_at?: string } | null;
    if (row) {
      owned = [...new Set([...owned, ...row.gear])];
      if (!equipped.length) equipped = row.equipped.filter((x) => owned.includes(x));
      level = Math.max(level, row.level);
      const at = row.updated_at ? Date.parse(row.updated_at) : 0; mergeAmmo(row.ammo, at); mergeGoldHerbs(row.gold_herbs ?? 0, at);
      applyVillage(row.village);
      try { localStorage.setItem(KEY, JSON.stringify(owned)); localStorage.setItem(EKEY, JSON.stringify(equipped)); localStorage.setItem(LKEY, String(level)); } catch { /* */ }
      ls.forEach((l) => l()); els.forEach((l) => l()); lls.forEach((l) => l());
    }
    pushSoon();
  } catch { loadedFor = null; /* offline: retried on next save */ }
}
// Any change on this device is copied to the account.
ls.add(pushSoon); els.add(pushSoon); lls.add(pushSoon); subscribeAmmo(pushSoon); subscribeGoldHerbs(pushSoon);
/** Typewriter save: copy progress to the account right away. */
export const saveProgressNow = () => pushSoon(0);
