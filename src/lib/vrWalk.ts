/**
 * Human-style walking for VR World: arrow keys / MOVE stick turn the camera
 * first and then walk where you face (like a person turning their head and
 * body), at real human speeds, with a stamina meter for running.
 */
import { useSyncExternalStore } from 'react';

export const WALK_MPS = 5;        // brisk explore pace (matches the earlier VR speed)
export const RUN_MPS = 9;         // sprint
export const TURN_RAD_PS = 2.4;   // ~140° per second
export const BACK_TURN_RAD_PS = 3.4;

export interface WalkInput { forward: boolean; backward: boolean; left: boolean; right: boolean }
/** `moveYawOffset`: extra yaw for the walk direction, so Down walks backwards at once while the camera is still turning round. */
export interface WalkStep { yawDelta: number; move: boolean; backTurnLeft: number; moveYawOffset: number }

/**
 * One frame of walking. `backTurnLeft` is how much of the about-turn is still
 * owed after Down / S was pressed (π on the first frame of a press).
 */
export function walkStep(i: WalkInput, dt: number, backTurnLeft: number, backWasDown: boolean): WalkStep {
  let yawDelta = 0;
  let left = backTurnLeft;
  if (i.backward && !backWasDown && !i.forward) left = Math.PI;
  if (!i.backward) left = 0;
  if (left > 0) {
    const s = Math.min(left, BACK_TURN_RAD_PS * dt);
    yawDelta += s;
    left -= s;
  }
  const turn = (i.left ? 1 : 0) - (i.right ? 1 : 0);
  yawDelta += turn * TURN_RAD_PS * dt;
  const move = i.forward || i.left || i.right || i.backward;
  return { yawDelta, move, backTurnLeft: left, moveYawOffset: i.backward ? left : 0 };
}

// ── Stamina ───────────────────────────────────────────────────────────────
export const STAMINA_DRAIN_PS = 0.12;   // ~8 s of running from full
export const STAMINA_REGEN_PS = 0.18;
export const STAMINA_RESUME = 0.25;     // after running dry, wait until 25 %

let stamina = 1;
let exhausted = false;
let lastEmit = 0;
const ls = new Set<() => void>();
let snap = { stamina: 1, exhausted: false, running: false };

/** Advance stamina; returns whether the player is allowed to run this frame. */
export function staminaTick(dt: number, wantsRun: boolean, moving: boolean): boolean {
  const running = wantsRun && moving && !exhausted;
  stamina = running ? Math.max(0, stamina - STAMINA_DRAIN_PS * dt) : Math.min(1, stamina + STAMINA_REGEN_PS * dt);
  if (stamina <= 0) exhausted = true;
  if (exhausted && stamina >= STAMINA_RESUME) exhausted = false;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - lastEmit > 100 || running !== snap.running || exhausted !== snap.exhausted) {
    lastEmit = now;
    snap = { stamina, exhausted, running };
    ls.forEach((l) => l());
  }
  return running;
}

export const getStamina = () => snap;
export function useStamina() {
  return useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => snap, () => snap);
}
export function __resetStamina() { stamina = 1; exhausted = false; snap = { stamina: 1, exhausted: false, running: false }; }
