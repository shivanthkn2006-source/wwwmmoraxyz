/**
 * One input layer for VR World: on-screen buttons and physical game controllers
 * both resolve to the same actions, which reuse the world's existing key and
 * event wiring (no second movement system).
 */
export type VRAction = 'interact' | 'jump' | 'run' | 'zoe' | 'zoom' | 'camera' | 'menu';

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
  if (action === 'interact') window.dispatchEvent(new CustomEvent('vr-interact'));
  else if (action === 'menu') window.dispatchEvent(new CustomEvent('vr-open-menu'));
  else if (action === 'zoe') window.dispatchEvent(new CustomEvent('zoe-show-orb'));
  try { navigator.vibrate?.(12); } catch { /* not supported */ }
}

/** Standard Gamepad layout → actions (Xbox A/B/X/Y = PlayStation ✕/○/□/△). */
export const GAMEPAD_BUTTONS: Record<number, VRAction> = {
  0: 'interact', 1: 'run', 2: 'zoe', 3: 'jump', 4: 'camera', 5: 'zoom', 6: 'camera', 7: 'zoom', 9: 'menu',
};

export const STICK_DEAD = 0.25;

/** Left stick → which WASD keys should be held. */
export function stickToKeys(x: number, y: number) {
  return {
    KeyW: y < -STICK_DEAD, KeyS: y > STICK_DEAD, KeyA: x < -STICK_DEAD, KeyD: x > STICK_DEAD,
  } as Record<'KeyW' | 'KeyS' | 'KeyA' | 'KeyD', boolean>;
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
