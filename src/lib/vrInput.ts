/**
 * One input layer for VR World: on-screen buttons and physical game controllers
 * both resolve to the same actions, which reuse the world's existing key and
 * event wiring (no second movement system).
 *
 * Controllers follow the W3C Gamepad "standard" mapping, which Chrome, Edge,
 * Safari and Firefox expose for Xbox (One/Series), PlayStation (DualShock 4 /
 * DualSense) and most Bluetooth pads on desktop, Android and iOS:
 *   0 A/✕  1 B/○  2 X/□  3 Y/△  4 LB/L1  5 RB/R1  6 LT/L2 (analog)  7 RT/R2 (analog)
 *   8 View/Share  9 Menu/Options  10 L3  11 R3  12–15 D-pad ↑↓←→  16 Xbox/PS
 *   axes 0/1 left stick, 2/3 right stick (−1..1, up = −1)
 */
import { resolveUse } from './vrUse';

export type VRAction = 'interact' | 'jump' | 'run' | 'zoe' | 'zoom' | 'camera' | 'menu' | 'bag';

const KEY_FOR: Partial<Record<VRAction, string>> = { jump: 'Space', run: 'ShiftLeft', zoom: 'KeyZ', camera: 'KeyV' };

export function pressKey(code: string, down: boolean) {
  window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
}

/** Fire an action. `down=false` only matters for held actions (run, jump). */
export function fireAction(action: VRAction, down = true) {
  const key = KEY_FOR[action];
  if (key) {
    if (action === 'zoom' || action === 'camera') { if (down) { pressKey(key, true); pressKey(key, false); } }
    else pressKey(key, down);
    return;
  }
  if (!down) return;
  if (action === 'interact') { window.dispatchEvent(new CustomEvent('vr-interact')); resolveUse(); }
  else if (action === 'menu') window.dispatchEvent(new CustomEvent('vr-open-menu'));
  else if (action === 'bag') window.dispatchEvent(new CustomEvent('vr-open-bag'));
  else if (action === 'zoe') window.dispatchEvent(new CustomEvent('zoe-show-orb'));
  try { navigator.vibrate?.(12); } catch { /* not supported */ }
}

/** Standard mapping → actions. Face buttons match the on-screen diamond (Use bottom, Run right, Zoe left, Jump top). */
export const GAMEPAD_BUTTONS: Record<number, VRAction> = {
  0: 'interact', 1: 'run', 2: 'zoe', 3: 'jump',
  4: 'camera', 5: 'zoom', 6: 'camera', 7: 'zoom',
  8: 'bag', 9: 'menu', 11: 'camera',
};
/** Held while pressed (released on button-up); everything else fires once per press. */
export const HELD_ACTIONS = new Set<VRAction>(['run', 'jump']);
/** L3 toggles sprint on/off, like mobile GTA. */
export const L3_SPRINT_TOGGLE = 10;
export const DPAD = { up: 12, down: 13, left: 14, right: 15 } as const;

export const STICK_DEAD = 0.25;
export const TRIGGER_THRESHOLD = 0.5;

/** Triggers are analog: some pads only set `pressed` near full travel, so use the value. */
export function buttonDown(b: { pressed: boolean; value: number } | undefined, index: number): boolean {
  if (!b) return false;
  if (index === 6 || index === 7) return b.pressed || b.value > TRIGGER_THRESHOLD;
  return b.pressed;
}

/** Radial dead zone, rescaled so movement starts smoothly just past the dead zone. */
export function radial(x: number, y: number, dead = STICK_DEAD): [number, number] {
  const m = Math.hypot(x, y);
  if (m < dead) return [0, 0];
  const k = Math.min(1, (m - dead) / (1 - dead)) / m;
  return [x * k, y * k];
}

/** Left stick (+ D-pad) → which WASD keys should be held. */
export function stickToKeys(x: number, y: number, dpad?: { up?: boolean; down?: boolean; left?: boolean; right?: boolean }) {
  return {
    KeyW: y < -STICK_DEAD || !!dpad?.up, KeyS: y > STICK_DEAD || !!dpad?.down,
    KeyA: x < -STICK_DEAD || !!dpad?.left, KeyD: x > STICK_DEAD || !!dpad?.right,
  } as Record<'KeyW' | 'KeyS' | 'KeyA' | 'KeyD', boolean>;
}

/**
 * Some older browsers report PlayStation pads with a non-standard mapping where
 * the D-pad is a single "hat" axis (usually axis 9): ↑ −1, → −0.43, ↓ 0.14, ← 0.71.
 */
export function hatToDpad(v: number | undefined) {
  if (v === undefined || v > 1.05 || v < -1.05) return { up: false, down: false, left: false, right: false };
  const near = (t: number) => Math.abs(v - t) < 0.15;
  return {
    up: near(-1) || near(-0.71) || near(1),
    right: near(-0.71) || near(-0.43) || near(-0.14),
    down: near(-0.14) || near(0.14) || near(0.43),
    left: near(0.43) || near(0.71) || near(1),
  };
}

export type PadFamily = 'xbox' | 'playstation' | 'generic';
export function padFamily(id: string): PadFamily {
  // Xbox first: Xbox Series pads report "Xbox Wireless Controller", which would
  // otherwise match the PlayStation "Wireless Controller" name.
  if (/045e|xbox|xinput/i.test(id)) return 'xbox';
  if (/054c|playstation|dualsense|dualshock|wireless controller/i.test(id)) return 'playstation';
  return 'generic';
}
export const FACE_GLYPHS: Record<PadFamily, Record<'interact' | 'run' | 'zoe' | 'jump', string>> = {
  xbox: { interact: 'A', run: 'B', zoe: 'X', jump: 'Y' },
  playstation: { interact: '✕', run: '○', zoe: '□', jump: '△' },
  generic: { interact: 'A', run: 'B', zoe: 'X', jump: 'Y' },
};

/** With several pads plugged in, follow the one used most recently. */
export function pickActivePad<T extends { connected: boolean; timestamp: number } | null>(pads: readonly T[]): NonNullable<T> | null {
  let best: NonNullable<T> | null = null;
  for (const p of pads) if (p && p.connected && (!best || p.timestamp > best.timestamp)) best = p as NonNullable<T>;
  return best;
}

/** Controller rumble (Chrome/Edge/Android dual-rumble; quietly skipped where unsupported, e.g. iOS). */
export function rumble(kind: 'pickup' | 'quest' | 'tap' = 'tap') {
  const fx = kind === 'quest' ? { duration: 380, strongMagnitude: 0.9, weakMagnitude: 0.6 }
    : kind === 'pickup' ? { duration: 140, strongMagnitude: 0.5, weakMagnitude: 0.35 }
    : { duration: 40, strongMagnitude: 0, weakMagnitude: 0.3 };
  try {
    const pad = pickActivePad(Array.from(navigator.getGamepads?.() ?? []));
    const act = (pad as unknown as { vibrationActuator?: { playEffect?: (t: string, p: object) => Promise<unknown> } })?.vibrationActuator;
    void act?.playEffect?.('dual-rumble', { startDelay: 0, ...fx })?.catch?.(() => undefined);
  } catch { /* no rumble */ }
}

export interface PadLayout { opacity: number; scale: number }
export const LAYOUT_KEY = 'vr-pad-layout';
export function loadLayout(): PadLayout {
  try {
    const v = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}');
    return { opacity: clamp(v.opacity ?? 0.7, 0.2, 1), scale: clamp(v.scale ?? 1, 0.7, 1.4) };
  } catch { return { opacity: 0.7, scale: 1 }; }
}
export function saveLayout(l: PadLayout) { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(l)); } catch { /* private mode */ } }
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, Number(n) || a));
