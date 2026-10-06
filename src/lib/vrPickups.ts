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
  if (isTaken(p.id)) return;
  st = { ...st, taken: [...st.taken, p.id].slice(-2000), herbs: st.herbs + (p.kind === 'herb' ? p.amount : 0), coins: st.coins + (p.kind === 'coin' ? p.amount : 0) };
  emit();
  void recordVRCollect({ type: p.kind === 'herb' ? 'green_herb' : 'antique_coin', rarity: p.kind === 'coin' && p.amount >= 5 ? 'rare' : 'common' });
  if (p.kind === 'coin') void supabase.rpc('earn_activity_karma' as never, { p_kind: 'vr_coin', p_units: p.amount } as never).then(() => {}, () => {});
}

/** Use one herb: refills stamina. Returns a message for the toast. */
export function useHerb(): string {
  if (st.herbs <= 0) return 'No green herbs — find one in a house';
  if (getStamina().stamina > 0.85) return 'Stamina is already full';
  st = { ...st, herbs: st.herbs - 1 }; emit();
  restoreStamina(1);
  return 'Used a Green Herb · stamina restored';
}

/** Auto-use a herb when stamina runs dry (Resident Evil style safety net). */
export function autoHerbIfDry() {
  const s = getStamina();
  if (s.exhausted && st.herbs > 0) useHerb();
}

// ── Account sync (one row per member) ──────────────────────────────────────
let timer: ReturnType<typeof setTimeout> | undefined;
function scheduleCloud() { clearTimeout(timer); timer = setTimeout(() => void pushCloud(), 3000); }
export async function pushCloud() {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id; if (!uid) return;
    await supabase.from('vr_save_games' as never).upsert({ user_id: uid, data: { pickups: st, save: readSave() }, updated_at: new Date().toISOString() } as never);
  } catch { /* offline: next save retries */ }
}
let pulled = false;
/** On VR start: take the newer of device and account saves. */
export async function pullCloud() {
  if (pulled) return; pulled = true;
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id; if (!uid) return;
    const { data: row } = await supabase.from('vr_save_games' as never).select('data').eq('user_id', uid).maybeSingle();
    const d = (row as { data?: { pickups?: State; save?: VRSave } } | null)?.data;
    if (d?.pickups && d.pickups.taken.length > st.taken.length) { st = d.pickups; emit(); }
    const local = readSave();
    if (d?.save && (!local || d.save.at > local.at)) { const { at: _a, ...rest } = d.save; writeSave(rest); }
  } catch { /* */ }
}
setInterval(() => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') scheduleCloud(); }, 60_000);
