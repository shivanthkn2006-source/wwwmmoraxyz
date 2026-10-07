// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, act, screen, fireEvent } from '@testing-library/react';

const inserts: Array<{ table: string; row: unknown }> = [];
vi.mock('@/integrations/supabase/client', () => {
  const chain = (table: string) => ({
    insert: async (row: unknown) => { inserts.push({ table, row }); return { error: null }; },
    upsert: async (row: unknown) => { inserts.push({ table: `${table}:upsert`, row }); return { error: null }; },
    select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [] }) }), then: (r: (v: unknown) => void) => r({ data: [] }) }) }),
  });
  return { supabase: { from: chain, auth: { getSession: async () => ({ data: { session: { user: { id: 'demo-user' } } } }) } } };
});

import VRGamepadHUD from '@/components/vr/VRGamepadHUD';
import { buttonDown, hatToDpad, padFamily, pickActivePad, radial, FACE_GLYPHS } from '@/lib/vrInput';
import { applyCollect, recordVRCollect, QUESTS } from '@/lib/vrQuests';

// ── Simulated controllers (W3C standard mapping) ──────────────────────────
type Btn = { pressed: boolean; touched: boolean; value: number };
const mkPad = (id: string, mapping: 'standard' | '' = 'standard', index = 0) => {
  const buttons: Btn[] = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const axes = mapping === 'standard' ? [0, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 3.28];
  const playEffect = vi.fn(async () => 'complete');
  return { id, index, mapping, connected: true, timestamp: 1, buttons, axes, vibrationActuator: { playEffect } };
};
const XBOX = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)';
const DUALSENSE = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)';
const PS4_OLD = '054c-05c4-Wireless Controller';

let pads: Array<ReturnType<typeof mkPad> | null> = [];
let rafCbs: FrameRequestCallback[] = [];
let now = 0;
const frame = () => { now += 16; const cbs = rafCbs; rafCbs = []; cbs.forEach((cb) => cb(now)); };

const keyLog = () => {
  const log: string[] = [];
  const on = (e: KeyboardEvent) => log.push(`${e.type}:${e.code}`);
  window.addEventListener('keydown', on); window.addEventListener('keyup', on);
  return { log, off: () => { window.removeEventListener('keydown', on); window.removeEventListener('keyup', on); } };
};

beforeEach(() => {
  pads = []; rafCbs = []; now = 0; inserts.length = 0;
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => pads });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { rafCbs.push(cb); return rafCbs.length; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

const press = (pad: ReturnType<typeof mkPad>, i: number, v = 1) => { pad.buttons[i] = { pressed: v > 0.5, touched: v > 0, value: v }; pad.timestamp++; };
const release = (pad: ReturnType<typeof mkPad>, i: number) => press(pad, i, 0);

describe('controller spec helpers', () => {
  it('identifies Xbox, PlayStation and generic pads and shows the right face glyphs', () => {
    expect(padFamily(XBOX)).toBe('xbox');
    expect(padFamily(DUALSENSE)).toBe('playstation');
    expect(padFamily(PS4_OLD)).toBe('playstation');
    expect(padFamily('8BitDo Pro 2')).toBe('generic');
    expect(FACE_GLYPHS.playstation.interact).toBe('✕');
    expect(FACE_GLYPHS.xbox.jump).toBe('Y');
  });
  it('reads analog triggers by value, not only the pressed flag', () => {
    expect(buttonDown({ pressed: false, value: 0.7 }, 7)).toBe(true);
    expect(buttonDown({ pressed: false, value: 0.3 }, 6)).toBe(false);
    expect(buttonDown({ pressed: false, value: 0.7 }, 0)).toBe(false);
  });
  it('uses a radial dead zone that ramps smoothly', () => {
    expect(radial(0.15, 0.15)).toEqual([0, 0]);
    const [x] = radial(1, 0); expect(x).toBeCloseTo(1);
    const [h] = radial(0.5, 0); expect(h).toBeGreaterThan(0); expect(h).toBeLessThan(0.5);
  });
  it('decodes the old PlayStation hat-axis D-pad', () => {
    expect(hatToDpad(-1)).toMatchObject({ up: true, down: false });
    expect(hatToDpad(0.14)).toMatchObject({ down: true, up: false });
    expect(hatToDpad(3.28)).toEqual({ up: false, down: false, left: false, right: false });
  });
  it('follows the most recently used pad', () => {
    const a = mkPad(XBOX, 'standard', 0); const b = mkPad(DUALSENSE, 'standard', 1);
    a.timestamp = 5; b.timestamp = 9;
    expect(pickActivePad([a, null, b])?.id).toBe(DUALSENSE);
  });
});

describe('simulated controllers driving VR World', () => {
  it('Xbox pad: sticks, D-pad, face buttons, triggers and View reach the world', () => {
    const k = keyLog(); const ev: string[] = [];
    for (const n of ['vr-interact', 'vr-open-menu', 'vr-show-feature', 'vr-camera-look']) window.addEventListener(n, () => ev.push(n));
    const pad = mkPad(XBOX); pads = [pad];
    render(<VRGamepadHUD />);
    act(() => { window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pad })); });
    expect(screen.getByText(/xbox controller connected/i)).toBeInTheDocument();
    act(() => { screen.getByRole('button', { name: /show action buttons/i }).click(); });
    expect(screen.getByRole('button', { name: /pick up/i })).toHaveTextContent('A');

    act(() => { pad.axes[1] = -0.9; frame(); });               // left stick up → W
    act(() => { pad.axes[1] = 0; press(pad, DPADI.right); frame(); }); // D-pad right → D
    act(() => { release(pad, DPADI.right); pad.axes[2] = 0.8; frame(); }); // right stick → look
    act(() => { pad.axes[2] = 0; press(pad, 0); frame(); release(pad, 0); frame(); });  // A → interact
    act(() => { press(pad, 3); frame(); });                     // Y held → jump down
    act(() => { release(pad, 3); frame(); });                   // → jump up
    act(() => { press(pad, 7, 0.8); frame(); release(pad, 7); frame(); }); // RT analog → zoom
    act(() => { press(pad, 9); frame(); release(pad, 9); frame(); });      // Menu → strip
    act(() => { press(pad, 2); frame(); release(pad, 2); frame(); });      // X → Zoe
    act(() => { press(pad, 8); frame(); release(pad, 8); frame(); });      // View → bag
    expect(k.log).toEqual(expect.arrayContaining(['keydown:KeyW', 'keyup:KeyW', 'keydown:KeyD', 'keyup:KeyD', 'keydown:Space', 'keyup:Space', 'keydown:KeyZ']));
    expect(ev).toEqual(expect.arrayContaining(['vr-camera-look', 'vr-interact', 'vr-open-menu', 'vr-show-feature']));
    expect(screen.getByRole('dialog', { name: /item bag/i })).toBeInTheDocument();
    // Interact fired exactly once for one press (no repeat while held).
    expect(ev.filter((e) => e === 'vr-interact')).toHaveLength(1);
    k.off();
  });

  it('DualSense: L3 toggles sprint, glyphs switch to ✕○□△, rumble on pickup', () => {
    const k = keyLog();
    const pad = mkPad(DUALSENSE); pads = [pad];
    render(<VRGamepadHUD />);
    act(() => { window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pad })); });
    act(() => { screen.getByRole('button', { name: /show action buttons/i }).click(); });
    expect(screen.getByRole('button', { name: /pick up/i })).toHaveTextContent('✕');
    act(() => { press(pad, 10); frame(); release(pad, 10); frame(); });
    expect(k.log).toContain('keydown:ShiftLeft');
    expect(k.log).not.toContain('keyup:ShiftLeft');
    act(() => { press(pad, 10); frame(); release(pad, 10); frame(); });
    expect(k.log).toContain('keyup:ShiftLeft');
    act(() => { window.dispatchEvent(new CustomEvent('vr-use-result', { detail: { ok: true, text: 'Picked up' } })); });
    expect(pad.vibrationActuator.playEffect).toHaveBeenCalledWith('dual-rumble', expect.objectContaining({ duration: 140 }));
    k.off();
  });

  it('old PlayStation mapping: hat-axis D-pad moves the player', () => {
    const k = keyLog();
    const pad = mkPad(PS4_OLD, ''); pads = [pad];
    render(<VRGamepadHUD />);
    act(() => { pad.axes[9] = -1; frame(); });
    act(() => { pad.axes[9] = 3.28; frame(); });
    expect(k.log).toEqual(expect.arrayContaining(['keydown:KeyW', 'keyup:KeyW']));
    k.off();
  });

  it('unplugging mid-move releases held keys so the player never runs away', () => {
    const k = keyLog();
    const pad = mkPad(XBOX); pads = [pad];
    render(<VRGamepadHUD />);
    act(() => { pad.axes[0] = 0.9; frame(); });
    expect(k.log).toContain('keydown:KeyD');
    act(() => { pads = []; window.dispatchEvent(new Event('gamepaddisconnected')); });
    expect(k.log).toContain('keyup:KeyD');
    expect(screen.getByText(/controller disconnected/i)).toBeInTheDocument();
    k.off();
  });
});

describe('relic quests + bag', () => {
  it('counts matching pickups and finishes each quest once', () => {
    let s = { progress: {}, done: {} } as Parameters<typeof applyCollect>[0];
    const r1 = applyCollect(s, { type: 'memory_shard', rarity: 'rare' });
    expect(r1.completed.map((q) => q.id)).toEqual(['rare_eye']);
    s = r1.next;
    s = applyCollect(s, { type: 'memory_shard', rarity: 'common' }).next;
    const r3 = applyCollect(s, { type: 'treasure_chest', rarity: 'epic' });
    expect(r3.completed.map((q) => q.id).sort()).toEqual(['relic_hunter', 'treasure_seeker']);
    expect(r3.next.done.memory_keeper).toBe(true);
    const r4 = applyCollect(r3.next, { type: 'treasure_chest', rarity: 'legendary' });
    expect(r4.completed).toHaveLength(0);
    expect(QUESTS.every((q) => r4.next.done[q.id])).toBe(true);
  });

  it('a finished quest saves the bag, the progress and sends a bell alert', async () => {
    const done: string[] = [];
    window.addEventListener('vr-quest-complete', (e) => done.push((e as CustomEvent).detail.id));
    const completed = await recordVRCollect({ type: 'collectible', rarity: 'legendary' });
    expect(completed.map((q) => q.id)).toContain('rare_eye');
    expect(done).toContain('rare_eye');
    expect(inserts.find((i) => i.table === 'vr_bag_items')).toBeTruthy();
    expect(inserts.find((i) => i.table === 'vr_quest_progress:upsert')).toBeTruthy();
    const bell = inserts.find((i) => i.table === 'notifications');
    expect(bell?.row).toMatchObject({ user_id: 'demo-user', type: 'vr_quest_complete' });
  });

  it('bag button opens the bag with quests listed', () => {
    render(<VRGamepadHUD />);
    act(() => { window.dispatchEvent(new Event('vr-open-bag')); });
    fireEvent.click(screen.getByRole('tab', { name: /quests/i }));
    expect(screen.getByTestId('quest-relic_hunter')).toBeInTheDocument();
  });
});

const DPADI = { up: 12, down: 13, left: 14, right: 15 };
