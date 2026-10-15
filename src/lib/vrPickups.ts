/**
 * Green herbs and antique coins in M'Mora World. Counts and which pickups were
 * taken are saved on the device and to the member's account (vr_save_games),
 * together with the latest VR game save. Coins also earn karma; a herb refills
 * stamina when it is low.
 */
import { useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { restoreStamina, getStamina } from '@/lib/vrWalk';
import { readSave, writeSave, type VRSave } from '@/lib/vrSaveGame';
import { setAmbientExtra } from '@/services/zoe-agent/ambientContext';
import { recordVRCollect } from '@/lib/vrQuests';
import { playPickup } from '@/lib/vrSfx';

export type PickupKind = 'herb' | 'coin';
export type Pickup = { id: string; kind: PickupKind; amount: number; pos: [number, number, number] };
type State = { herbs: number; coins: number; taken: string[] };

const KEY = 'vr-pickups';
const load = (): State => { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.taken)) return s; } catch { /* */ } return { herbs: 0, coins: 0, taken: [] }; };
let st: State = typeof localStorage !== 'undefined' ? load() : { herbs: 0, coins: 0, taken: [] };
const ls = new Set<() => void>();
const emit = () => {
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* */ }
  setAmbientExtra('VR herbs and coins', `${st.herbs} green herbs, ${st.coins} antique coins`);
  ls.forEach((l) => l());
  scheduleCloud();
};
export const getPickups = () => st;
export const usePickups = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => st, () => st);
export const isTaken = (id: string) => st.taken.includes(id);

export function takePickup(p: Pickup) {
  if (p.id.startsWith('gold-') && !st.taken.includes(p.id)) window.setTimeout(() => addGoldHerbs(p.amount), 0);
  if (isTaken(p.id)) return;
  st = { ...st, taken: [...st.taken, p.id].slice(-2000), herbs: st.herbs + (p.kind === 'herb' && !p.id.startsWith('gold-') ? p.amount : 0), coins: st.coins + (p.kind === 'coin' ? p.amount : 0) };
  emit();
  playPickup(p.kind);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('vr-hand-reach'));
  void recordVRCollect({ type: p.kind === 'herb' ? 'green_herb' : 'antique_coin', rarity: p.kind === 'coin' && p.amount >= 5 ? 'rare' : 'common' });
  if (p.kind === 'coin') void supabase.rpc('earn_activity_karma' as never, { p_kind: 'vr_coin', p_units: p.amount } as never).then(() => {}, () => {});
}

/** Use one herb: refills stamina. Returns a message for the toast. */
export function useHerb(): string {
  if (st.herbs <= 0) return 'No green herbs — find one in a house';
  st = { ...st, herbs: st.herbs - 1 }; emit();
  restoreStamina(1);
  healPlayer(20, 'heal');
  return 'Used a Green Herb · health +20 (5 herbs = full health)';
}

/** Heal the player (0–100), play the herb sound and the green outline glow. */
export function healPlayer(amount: number, sfx: 'heal' | 'goldheal') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('vr-heal', { detail: { amount } }));
  window.dispatchEvent(new CustomEvent('vr-heal-glow', { detail: { gold: sfx === 'goldheal' } }));
  void import('@/lib/vrSfx').then((m) => m.playSfx(sfx));
}

// ── Golden herbs (bought from the merchant): one restores full health. Device-saved. ──
const GKEY = 'vr-gold-herbs';
let gold = (() => { try { return Math.max(0, Number(localStorage.getItem(GKEY)) || 0); } catch { return 0; } })();
const gls = new Set<() => void>();
const gemit = () => { try { localStorage.setItem(GKEY, String(gold)); localStorage.setItem(GKEY + '-at', String(Date.now())); } catch { /* */ } gls.forEach((l) => l()); };
export const useGoldHerbs = () => useSyncExternalStore((l) => { gls.add(l); return () => gls.delete(l); }, () => gold, () => gold);
export function addGoldHerbs(n: number) { gold += n; gemit(); }
export const getGoldHerbs = () => gold;
export const subscribeGoldHerbs = (l: () => void) => { gls.add(l); return () => { gls.delete(l); }; };
export function mergeGoldHerbs(n: number, remoteAt = 0) {
  let localAt = 0; try { localAt = Number(localStorage.getItem(GKEY + '-at')) || 0; } catch { /* */ }
  if (remoteAt <= localAt) return; // newest copy wins, so used herbs never come back
  gold = Math.max(0, n | 0); try { localStorage.setItem(GKEY, String(gold)); localStorage.setItem(GKEY + '-at', String(remoteAt)); } catch { /* */ } gls.forEach((l) => l());
}
/** Herb combining (survival-horror style): 3 Green Herbs → 1 Golden Herb (full health). */
export function combineHerbs(): string {
  if (st.herbs < 3) return 'Combine needs 3 Green Herbs';
  st = { ...st, herbs: st.herbs - 3 }; emit(); gold += 1; gemit();
  void import('@/lib/vrSfx').then((m) => m.playSfx('heal'));
  return 'Combined 3 Green Herbs → 1 Golden Herb';
}
export function addHerbs(n: number) { st = { ...st, herbs: st.herbs + n }; emit(); }
export function useGoldHerb(): string {
  if (gold <= 0) return 'No golden herbs — the merchant sells them';
  gold -= 1; gemit(); restoreStamina(1); healPlayer(100, 'goldheal');
  return 'Used a Golden Herb · full health restored';
}

/** Auto-use a herb when stamina runs dry (Resident Evil style safety net). */
export function autoHerbIfDry() {
  const s = getStamina();
  if (s.exhausted && st.herbs > 0) useHerb();
}

// ── Account sync (one row per member) ──────────────────────────────────────
/** Explored 50 m squares per city and portal visits, saved on this device. */
function readExplore(): { cells: Record<string, string[]>; portals: Record<string, number> } {
  const cells: Record<string, string[]> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('vr-explored:')) cells[k.slice(12)] = JSON.parse(localStorage.getItem(k) || '[]');
    }
  } catch { /* */ }
  let portals: Record<string, number> = {};
  try { portals = JSON.parse(localStorage.getItem('vr-portal-visits') || '{}'); } catch { /* */ }
  return { cells, portals };
}
/** Merge the account copy into this device (union of squares, highest visit count). */
function mergeExplore(e?: { cells?: Record<string, string[]>; portals?: Record<string, number> }) {
  if (!e) return;
  try {
    for (const [city, list] of Object.entries(e.cells || {})) {
      const k = `vr-explored:${city}`;
      const cur = new Set<string>(JSON.parse(localStorage.getItem(k) || '[]'));
      list.forEach((c) => cur.add(c));
      localStorage.setItem(k, JSON.stringify([...cur].slice(-5000)));
    }
    const p = JSON.parse(localStorage.getItem('vr-portal-visits') || '{}') as Record<string, number>;
    for (const [c, n] of Object.entries(e.portals || {})) p[c] = Math.max(p[c] || 0, n);
    localStorage.setItem('vr-portal-visits', JSON.stringify(p));
    window.dispatchEvent(new Event('vr-explore-changed'));
  } catch { /* */ }
}
if (typeof window !== 'undefined') window.addEventListener('vr-explore-changed', () => scheduleCloud());

let timer: ReturnType<typeof setTimeout> | undefined;
function scheduleCloud() { clearTimeout(timer); timer = setTimeout(() => void pushCloud(), 3000); }
export async function pushCloud() {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id; if (!uid) return;
    await supabase.from('vr_save_games' as never).upsert({ user_id: uid, data: { pickups: st, save: readSave(), explore: readExplore() }, updated_at: new Date().toISOString() } as never);
  } catch { /* offline: next save retries */ }
}
let pulled = false;
/** On VR start: take the newer of device and account saves. */
export async function pullCloud(force = false) {
  if (pulled && !force) return; pulled = true;
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id; if (!uid) return;
    const { data: row } = await supabase.from('vr_save_games' as never).select('data').eq('user_id', uid).maybeSingle();
    const d = (row as { data?: { pickups?: State; save?: VRSave; explore?: { cells?: Record<string, string[]>; portals?: Record<string, number> } } } | null)?.data;
    mergeExplore(d?.explore);
    if (d?.pickups && d.pickups.taken.length > st.taken.length) { st = d.pickups; emit(); }
    const local = readSave();
    if (d?.save && (!local || d.save.at > local.at)) { const { at, ...rest } = d.save; writeSave(rest, at); }
  } catch { /* */ }
}
setInterval(() => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') scheduleCloud(); }, 60_000);

/** Coins earned without a pickup (e.g. sitting on a bench). */
export function addCoins(n: number) {
  if (n <= 0) return;
  st = { ...st, coins: st.coins + n };
  emit();
  playPickup('coin');
}

/** Spend coins (e.g. to build a bench). Returns false when there aren't enough. */
export function spendCoins(n: number): boolean {
  if (st.coins < n) return false;
  st = { ...st, coins: st.coins - n };
  emit();
  return true;
}
