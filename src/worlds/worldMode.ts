/**
 * Which world the player is in: the Real Map (their actual neighbourhood,
 * default) or M'Mora World (the existing VR city behind the doorway).
 * Also holds the session's real GPS origin and live map stats.
 */
import { useSyncExternalStore } from 'react';
import type { LatLng } from './realmap/geo';

export type WorldMode = 'real' | 'mmora';
export type OriginState =
  | { status: 'locating' }
  /** Phone gave no location: the member picks a city (never a silent fallback). */
  | { status: 'pick'; reason: 'denied' | 'unavailable' }
  | { status: 'ready'; origin: LatLng; real: boolean; label?: string };

type State = {
  mode: WorldMode;
  origin: OriginState;
  savedRealPos: [number, number, number] | null;
  chunksLoaded: number;
  chunksWanted: number;
  portalTrips: number;
  aerial: boolean;
  /** Tallest building measured near the start point (m), drives the entry height. */
  tallestNear: number;
};

/** Kept for tests/tools only — members without a location now pick a city instead. */
export const FALLBACK_ORIGIN: LatLng = { lat: 12.9716, lng: 77.5946 };
export const PORTAL_OFFSET: [number, number, number] = [0, 0, -8];
export const RETURN_PORTAL_POS: [number, number, number] = [4, 0, 8];
export const MMORA_SPAWN: [number, number, number] = [0, 1.6, 3];

let state: State = { mode: 'real', origin: { status: 'locating' }, savedRealPos: null, chunksLoaded: 0, chunksWanted: 0, portalTrips: 0, aerial: false, tallestNear: 0 };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

export const getWorldState = () => state;
export function useWorldState() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => state);
}

export function setChunkStats(loaded: number, wanted: number) {
  if (loaded !== state.chunksLoaded || wanted !== state.chunksWanted) set({ chunksLoaded: loaded, chunksWanted: wanted });
}

/** Entry view: 100 m above the street, or just above the tallest nearby building. */
export const ENTRY_MIN_HEIGHT_M = 100;
export const ENTRY_ROOF_CLEARANCE_M = 20;
export const ENTRY_MAX_HEIGHT_M = 650;
export const AERIAL_HEIGHT_M = ENTRY_MIN_HEIGHT_M;
export function entryHeightFor(tallest: number): number {
  return Math.min(ENTRY_MAX_HEIGHT_M, Math.max(ENTRY_MIN_HEIGHT_M, tallest + ENTRY_ROOF_CLEARANCE_M));
}
export const entryHeight = () => entryHeightFor(state.tallestNear);
export function reportNearbyHeight(h: number) {
  if (Number.isFinite(h) && h > state.tallestNear) set({ tallestNear: h });
}
let aerialShown = false;
/** Once per session, the Real Map opens above the player's real spot and glides down into 3D. */
export function startAerialEntry(): boolean {
  if (aerialShown || state.mode !== 'real') return false;
  aerialShown = true;
  set({ aerial: true });
  window.dispatchEvent(new CustomEvent('vr-view-transition', { detail: { mode: 'aerial_real' } }));
  return true;
}
export function landOnStreet() {
  set({ aerial: false });
  window.dispatchEvent(new CustomEvent('vr-view-transition', { detail: { mode: 'ground' } }));
}

let locating = false;
const CITY_KEY = 'vr-start-city';
export type StartCity = { name: string; lat: number; lng: number };
export function savedStartCity(): StartCity | null {
  try { const c = JSON.parse(localStorage.getItem(CITY_KEY) || 'null'); return c && typeof c.lat === 'number' && typeof c.lng === 'number' ? c : null; } catch { return null; }
}
/** Asks the phone for its location; if it can't or won't, the member is asked to pick a city. */
export function resolveOrigin(): void {
  if (locating || state.origin.status === 'ready') return;
  locating = true;
  if (state.origin.status !== 'locating') set({ origin: { status: 'locating' } });
  const ask = (reason: 'denied' | 'unavailable') => { locating = false; set({ origin: { status: 'pick', reason } }); };
  if (typeof navigator === 'undefined' || !navigator.geolocation) return ask('unavailable');
  navigator.geolocation.getCurrentPosition(
    (p) => { locating = false; set({ origin: { status: 'ready', origin: { lat: p.coords.latitude, lng: p.coords.longitude }, real: true } }); },
    (err) => ask(err && err.code === 1 ? 'denied' : 'unavailable'),
    { enableHighAccuracy: true, timeout: 10_000, maximumAge: 120_000 },
  );
}
export function chooseStartCity(city: StartCity) {
  try { localStorage.setItem(CITY_KEY, JSON.stringify(city)); } catch { /* private mode */ }
  set({ origin: { status: 'ready', origin: { lat: city.lat, lng: city.lng }, real: false, label: city.name } });
}

const teleport = (position: [number, number, number]) =>
  window.dispatchEvent(new CustomEvent('vr-teleport', { detail: { position, lockGround: true } }));

export function enterMMora(fromPos: [number, number, number]) {
  if (state.mode === 'mmora') return;
  set({ mode: 'mmora', savedRealPos: fromPos, portalTrips: state.portalTrips + 1 });
  teleport(MMORA_SPAWN);
  void import('@/lib/notifySelf').then(({ notifySelf }) => notifySelf('vr_doorway', "Entered M'Mora World", "You walked through the doorway from your real street into M'Mora World.", { link: '/vr-world' })).catch(() => {});
}

export function returnToReal() {
  if (state.mode === 'real') return;
  const back = state.savedRealPos ?? [0, 1.6, 0];
  set({ mode: 'real', portalTrips: state.portalTrips + 1 });
  // Step back from the doorway so the player isn't re-sucked in.
  teleport([back[0], 1.6, back[2] + 3]);
}

/** Portal hit test with re-arm: must walk ≥ armDist away before it can fire again. */
export function portalStep(armed: boolean, dist: number, hit = 1.4, armDist = 4): { armed: boolean; fire: boolean } {
  if (!armed) return { armed: dist > armDist, fire: false };
  if (dist < hit) return { armed: false, fire: true };
  return { armed: true, fire: false };
}

export function __resetWorldForTests() {
  state = { mode: 'real', origin: { status: 'locating' }, savedRealPos: null, chunksLoaded: 0, chunksWanted: 0, portalTrips: 0, aerial: false, tallestNear: 0 };
  locating = false;
  aerialShown = false;
}
