/**
 * Throwable grenades (M'Mora originals modelled on classic survival-horror
 * types): hand (fragmentation), flash, incendiary and smoke. Counts are saved
 * on the device; equipping one puts it in the avatar's right hand and the Use
 * button or G throws it. Blasts are announced on one event bus so every
 * enemy system reacts the same way.
 */
import { useSyncExternalStore } from 'react';

export type GrenadeKind = 'fraggrenade' | 'flashgrenade' | 'incgrenade' | 'smokegrenade';
export const GRENADE_SPEC: Record<GrenadeKind, { name: string; fuse: number; radius: number; damage: number; stun: number; burn: number; smoke: number; start: number }> = {
  // fuse s after the throw; impact grenades use 0 (burst on first ground contact)
  fraggrenade: { name: 'Hand Grenade', fuse: 2.0, radius: 6, damage: 120, stun: 0, burn: 0, smoke: 5, start: 3 },
  flashgrenade: { name: 'Flash Grenade', fuse: 1.4, radius: 9, damage: 0, stun: 5, burn: 0, smoke: 2, start: 3 },
  incgrenade: { name: 'Incendiary Grenade', fuse: 0, radius: 3.5, damage: 18, stun: 0, burn: 7, smoke: 8, start: 3 },
  smokegrenade: { name: 'Smoke Grenade', fuse: 1.8, radius: 5, damage: 0, stun: 0, burn: 0, smoke: 14, start: 3 },
};
export const isGrenade = (id: string | null | undefined): id is GrenadeKind => !!id && id in GRENADE_SPEC;

/** Frag damage falls off linearly to nothing at the blast edge. */
export function blastDamage(kind: GrenadeKind, dist: number) {
  const s = GRENADE_SPEC[kind];
  if (dist > s.radius) return 0;
  return Math.round(s.damage * (1 - dist / s.radius));
}
/** Pure ballistic arc for a throw (y up, ground bounces handled by the caller). */
export function throwArc(origin: { x: number; y: number; z: number }, dir: { x: number; z: number }, t: number, speed = 9, lift = 4.5, g = 9.8) {
  return { x: origin.x + dir.x * speed * t, y: origin.y + lift * t - 0.5 * g * t * t, z: origin.z + dir.z * speed * t };
}

const KEY = 'vr-grenades';
type Counts = Partial<Record<GrenadeKind, number>>;
let counts: Counts = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
const ls = new Set<() => void>();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(counts)); } catch { /* */ } ls.forEach((l) => l()); };
export const useGrenadeCounts = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => counts, () => counts);
export const grenadeCount = (k: GrenadeKind) => counts[k] ?? 0;
export function addGrenades(k: GrenadeKind, n: number) { counts = { ...counts, [k]: Math.min(9, grenadeCount(k) + n) }; save(); }
/** Spend one; false when none are left. */
export function spendGrenade(k: GrenadeKind) {
  if (grenadeCount(k) <= 0) return false;
  counts = { ...counts, [k]: grenadeCount(k) - 1 }; save(); return true;
}

export type Blast = { kind: GrenadeKind; x: number; z: number; radius: number; damage: number; stun: number };
const blastLs = new Set<(b: Blast) => void>();
export function onBlast(fn: (b: Blast) => void) { blastLs.add(fn); return () => { blastLs.delete(fn); }; }
export function emitBlast(b: Blast) { blastLs.forEach((f) => { try { f(b); } catch { /* one listener can't stop the rest */ } }); }
