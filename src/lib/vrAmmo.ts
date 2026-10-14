/**
 * Survival ammo for M'Mora Village guns: each gun has a magazine and a reserve.
 * Shooting spends one round; an empty magazine must be reloaded (takes time)
 * from the reserve. Fallen villagers drop rounds. Knife needs none.
 * Saved on the device.
 */
import { useSyncExternalStore } from 'react';

export const AMMO_SPEC: Record<string, { mag: number; reload: number; drop: number; start: number; label: string }> = {
  pistol: { mag: 10, reload: 1.4, drop: 5, start: 20, label: 'Handgun ammo' },
  shotgun: { mag: 4, reload: 2.2, drop: 2, start: 6, label: 'Shotgun shells' },
  rocket: { mag: 1, reload: 3, drop: 0, start: 2, label: 'Rockets' },
};
/** Bought rounds (merchant). */
export function addAmmo(w: string, n: number) {
  const a = st[w]; if (!a) return;
  st = { ...st, [w]: { ...a, reserve: Math.min(99, a.reserve + n) } }; save();
}
export type AmmoState = Record<string, { inMag: number; reserve: number }>;

const KEY = 'vr-ammo';
const fresh = (): AmmoState => Object.fromEntries(Object.entries(AMMO_SPEC).map(([k, s]) => [k, { inMag: s.mag, reserve: s.start }]));
let st: AmmoState = (() => { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return fresh(); } })();
let reloadingUntil = 0;
const ls = new Set<() => void>();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); localStorage.setItem(KEY + '-at', String(Date.now())); } catch { /* */ } ls.forEach((l) => l()); };
export const useAmmo = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => st, () => st);
export const getAmmo = () => st;
export const usesAmmo = (w: string | null) => !!w && !!AMMO_SPEC[w];
export const isReloading = (now = performance.now()) => now < reloadingUntil;

/** Pure: spend one round. */
export function spend(s: AmmoState, w: string): { next: AmmoState; ok: boolean } {
  const a = s[w]; if (!a || a.inMag <= 0) return { next: s, ok: false };
  return { next: { ...s, [w]: { ...a, inMag: a.inMag - 1 } }, ok: true };
}
/** Pure: fill the magazine from the reserve. */
export function refill(s: AmmoState, w: string): AmmoState {
  const a = s[w], spec = AMMO_SPEC[w]; if (!a || !spec) return s;
  const take = Math.min(spec.mag - a.inMag, a.reserve);
  return take > 0 ? { ...s, [w]: { inMag: a.inMag + take, reserve: a.reserve - take } } : s;
}

export function fire(w: string): boolean {
  if (!usesAmmo(w)) return true;
  if (isReloading()) return false;
  const r = spend(st, w); if (!r.ok) return false;
  st = r.next; save(); return true;
}
export function canReload(w: string) { const a = st[w]; return !!a && a.reserve > 0 && a.inMag < AMMO_SPEC[w].mag; }
export function reload(w: string): boolean {
  if (!canReload(w) || isReloading()) return false;
  reloadingUntil = performance.now() + AMMO_SPEC[w].reload * 1000; ls.forEach((l) => l());
  setTimeout(() => { st = refill(st, w); reloadingUntil = 0; save(); }, AMMO_SPEC[w].reload * 1000);
  return true;
}
/** A fallen villager drops a little ammo for every gun. */
export function dropAmmo() {
  st = Object.fromEntries(Object.entries(st).map(([k, a]) => [k, { ...a, reserve: Math.min(99, a.reserve + (AMMO_SPEC[k]?.drop ?? 0)) }]));
  save();
}

/** Resident Evil-style condition from health (0–100). */
export const condition = (hp: number) => (hp > 66 ? 'Fine' : hp > 33 ? 'Caution' : 'Danger');

/** Account merge: the newest copy wins as a whole (never per-gun maximum), so switching devices can't restore spent rounds. */
export const ammoSavedAt = () => { try { return Number(localStorage.getItem(KEY + '-at')) || 0; } catch { return 0; } };
export function mergeAmmo(remote: AmmoState | null | undefined, remoteAt = 0) {
  if (!remote || !Object.keys(remote).length || remoteAt <= ammoSavedAt()) return;
  const next = fresh();
  for (const [k, r] of Object.entries(remote)) if (AMMO_SPEC[k] && r) next[k] = { inMag: Math.max(0, Math.min(AMMO_SPEC[k].mag, r.inMag | 0)), reserve: Math.max(0, Math.min(99, r.reserve | 0)) };
  st = next; try { localStorage.setItem(KEY, JSON.stringify(st)); localStorage.setItem(KEY + '-at', String(remoteAt)); } catch { /* */ } ls.forEach((l) => l());
}
export const subscribeAmmo = (l: () => void) => { ls.add(l); return () => { ls.delete(l); }; };
