/**
 * "Follow my GPS": while on, the avatar moves to where the phone really is
 * (checked every few seconds), so a member can travel their real streets in
 * VR World. It pauses at driving speed so nobody uses it behind the wheel,
 * and the bell pings once an hour per friend who is within 200 m.
 * Off by default; only runs while the member keeps it switched on.
 */
import { useSyncExternalStore } from 'react';
import { toLocal, type LatLng } from './geo';
import { getWorldState } from '../worldMode';
import { getMeet } from '../meet/vrMeet';

export const DRIVING_MPS = 8;          // ~29 km/h
export const MIN_STEP_M = 2;           // ignore GPS jitter
export const MIN_INTERVAL_MS = 3000;
export const FRIEND_NEAR_M = 200;
export const FRIEND_PING_MS = 3600_000;

type S = { on: boolean; paused: 'driving' | null; error: string | null; fixes: number };
let st: S = { on: false, paused: null, error: null, fixes: 0 };
const ls = new Set<() => void>();
const set = (p: Partial<S>) => { st = { ...st, ...p }; ls.forEach((l) => l()); };
export const useGpsFollow = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => st, () => st);

let watch: number | null = null;
let last: { x: number; z: number; at: number } | null = null;
const pinged = new Map<string, number>();

export function metersBetween(a: LatLng, b: LatLng): number {
  const p = toLocal(b, a);
  return Math.hypot(p.x, p.z);
}

/** Pure: should this GPS fix move the avatar? */
export function followDecision(prev: { x: number; z: number; at: number } | null, x: number, z: number, at: number, speed: number | null) {
  if (speed !== null && speed > DRIVING_MPS) return 'driving' as const;
  if (!prev) return 'move' as const;
  if (at - prev.at < MIN_INTERVAL_MS) return 'skip' as const;
  const d = Math.hypot(x - prev.x, z - prev.z);
  if (d < MIN_STEP_M) return 'skip' as const;
  // Fall back to measured speed when the phone doesn't report one.
  if (speed === null && d / ((at - prev.at) / 1000) > DRIVING_MPS) return 'driving' as const;
  return 'move' as const;
}

/** Pure: friends within range who haven't been pinged in the last hour. */
export function friendsToPing(me: LatLng, players: { id: string; tag: string; lat?: number; lng?: number; username: string }[], now: number, seen: Map<string, number>) {
  return players.filter((p) => p.tag === 'friend' && typeof p.lat === 'number' && typeof p.lng === 'number'
    && metersBetween(me, { lat: p.lat, lng: p.lng }) <= FRIEND_NEAR_M
    && now - (seen.get(p.id) ?? 0) > FRIEND_PING_MS);
}

function onFix(pos: GeolocationPosition) {
  const w = getWorldState();
  if (w.mode !== 'real' || w.origin.status !== 'ready') return;
  const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  const { x, z } = toLocal(here, w.origin.origin);
  const now = Date.now();
  const speed = Number.isFinite(pos.coords.speed as number) ? (pos.coords.speed as number) : null;
  const d = followDecision(last, x, z, now, speed);
  if (d === 'driving') { set({ paused: 'driving' }); last = { x, z, at: now }; return; }
  if (st.paused) set({ paused: null });
  if (d === 'skip') return;
  last = { x, z, at: now };
  window.dispatchEvent(new CustomEvent('vr-teleport', { detail: { position: [x, 1.6, z], lockGround: true } }));
  set({ fixes: st.fixes + 1 });
  for (const f of friendsToPing(here, getMeet().players, now, pinged)) {
    pinged.set(f.id, now);
    void import('@/lib/notifySelf').then(({ notifySelf }) =>
      notifySelf('vr_player_met', `@${f.username} is nearby`, `Your friend @${f.username} is within ${FRIEND_NEAR_M} m of you on your real street.`, { link: '/vr-world' })).catch(() => {});
  }
}

export function startGpsFollow(): boolean {
  if (st.on) return true;
  if (typeof navigator === 'undefined' || !navigator.geolocation) { set({ error: 'This device has no GPS' }); return false; }
  last = null;
  watch = navigator.geolocation.watchPosition(onFix, (e) => set({ error: e.code === 1 ? 'Location not allowed' : 'No GPS signal' }),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 });
  set({ on: true, error: null, paused: null });
  return true;
}

export function stopGpsFollow() {
  if (watch !== null) navigator.geolocation.clearWatch(watch);
  watch = null; last = null;
  set({ on: false, paused: null });
}
