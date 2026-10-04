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
  | { status: 'ready'; origin: LatLng; real: boolean };

type State = {
  mode: WorldMode;
  origin: OriginState;
  savedRealPos: [number, number, number] | null;
  chunksLoaded: number;
  chunksWanted: number;
  portalTrips: number;
};

/** Used only when the phone gives no location; the UI says so plainly. */
export const FALLBACK_ORIGIN: LatLng = { lat: 12.9716, lng: 77.5946 };
export const PORTAL_OFFSET: [number, number, number] = [0, 0, -8];
export const RETURN_PORTAL_POS: [number, number, number] = [4, 0, 8];
export const MMORA_SPAWN: [number, number, number] = [0, 1.6, 3];

let state: State = { mode: 'real', origin: { status: 'locating' }, savedRealPos: null, chunksLoaded: 0, chunksWanted: 0, portalTrips: 0 };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

export const getWorldState = () => state;
export function useWorldState() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => state);
}

export function setChunkStats(loaded: number, wanted: number) {
  if (loaded !== state.chunksLoaded || wanted !== state.chunksWanted) set({ chunksLoaded: loaded, chunksWanted: wanted });
}

let locating = false;
export function resolveOrigin(): void {
  if (locating || state.origin.status === 'ready') return;
  locating = true;
  const done = (origin: LatLng, real: boolean) => set({ origin: { status: 'ready', origin, real } });
  if (typeof navigator === 'undefined' || !navigator.geolocation) return done(FALLBACK_ORIGIN, false);
  navigator.geolocation.getCurrentPosition(
    (p) => done({ lat: p.coords.latitude, lng: p.coords.longitude }, true),
    () => done(FALLBACK_ORIGIN, false),
    { enableHighAccuracy: true, timeout: 10_000, maximumAge: 120_000 },
  );
}

const teleport = (position: [number, number, number]) =>
  window.dispatchEvent(new CustomEvent('vr-teleport', { detail: { position, lockGround: true } }));

export function enterMMora(fromPos: [number, number, number]) {
  if (state.mode === 'mmora') return;
  set({ mode: 'mmora', savedRealPos: fromPos, portalTrips: state.portalTrips + 1 });
  teleport(MMORA_SPAWN);
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
  state = { mode: 'real', origin: { status: 'locating' }, savedRealPos: null, chunksLoaded: 0, chunksWanted: 0, portalTrips: 0 };
  locating = false;
}
