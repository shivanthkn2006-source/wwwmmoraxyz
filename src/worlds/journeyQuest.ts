/**
 * "Street to M'Mora" journey quest: walk 50 m on your real street, step
 * through the doorway, then reach the journey beacon inside M'Mora Village.
 * Progress is kept on the device; finishing sends a Quest complete alert.
 */
import { useSyncExternalStore } from 'react';
import { notifySelf } from '@/lib/notifySelf';

export const WALK_GOAL_M = 50;
export const BEACON_POS: [number, number, number] = [30, 0, -30];
export const BEACON_RADIUS = 3;

export type JourneyStep = 'walk' | 'doorway' | 'beacon' | 'done';
export type JourneyState = { step: JourneyStep; walked: number };

const KEY = 'vr-journey-quest-v1';
const read = (): JourneyState => {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? ''); if (v?.step) return v; } catch { /* fresh */ }
  return { step: 'walk', walked: 0 };
};
let state: JourneyState = typeof localStorage === 'undefined' ? { step: 'walk', walked: 0 } : read();
const ls = new Set<() => void>();
const set = (s: JourneyState) => {
  state = s;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
  ls.forEach((l) => l());
};
export const getJourney = () => state;
export const useJourney = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => state, () => state);

/** Pure step function — exported for tests. */
export function journeyReduce(s: JourneyState, ev:
  | { type: 'walked'; meters: number }
  | { type: 'entered-mmora' }
  | { type: 'near-beacon' }): JourneyState {
  if (s.step === 'walk' && ev.type === 'walked') {
    const walked = s.walked + Math.max(0, Math.min(ev.meters, 20)); // ignore teleports
    return walked >= WALK_GOAL_M ? { step: 'doorway', walked } : { ...s, walked };
  }
  if (s.step === 'doorway' && ev.type === 'entered-mmora') return { ...s, step: 'beacon' };
  if (s.step === 'beacon' && ev.type === 'near-beacon') return { ...s, step: 'done' };
  return s;
}

export function journeyEvent(ev: Parameters<typeof journeyReduce>[1]) {
  const next = journeyReduce(state, ev);
  if (next === state) return;
  const finished = next.step === 'done' && state.step !== 'done';
  set(next);
  if (finished) {
    window.dispatchEvent(new CustomEvent('vr-quest-complete', { detail: { id: 'street_to_mmora', title: "Street to M'Mora" } }));
    void notifySelf('vr_quest_complete', 'Quest complete', "Street to M'Mora: you travelled from your real street into M'Mora Village.", { link: '/vr-world', quest: 'street_to_mmora' }).catch(() => {});
  }
}

export const journeyLabel = (s: JourneyState) =>
  s.step === 'walk' ? `Walk your street: ${Math.floor(s.walked)} / ${WALK_GOAL_M} m`
  : s.step === 'doorway' ? "Go through the doorway to M'Mora Village"
  : s.step === 'beacon' ? 'Reach the blue journey beacon'
  : "Street to M'Mora: complete";

export function __resetJourney() { set({ step: 'walk', walked: 0 }); }
