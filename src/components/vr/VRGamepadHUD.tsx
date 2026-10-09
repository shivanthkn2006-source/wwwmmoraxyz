import { useVRView, toggleCrouch, toggleFaceView } from '@/lib/vrView';
import { useNight, toggleFlashlight } from './NightMode';
/**
 * Console-style controls for VR World (Resident Evil mobile layout, trimmed):
 * shoulder buttons, a menu button, four face buttons, a layout editor
 * (opacity + size, saved on the device) and physical game controller support.
 * The existing move and look sticks stay as they are.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  buttonDown, DPAD, FACE_GLYPHS, fireAction, GAMEPAD_BUTTONS, hatToDpad, HELD_ACTIONS, L3_SPRINT_TOGGLE, loadLayout,
  padFamily, pickActivePad, pressKey, radial, rumble, saveLayout, stickToKeys, type PadFamily, type PadLayout, type VRAction,
} from '@/lib/vrInput';
import { VRBagPanel } from '@/components/vr/VRBagPanel';
import { peekUse } from '@/lib/vrUse';
import { VRMiniMap } from '@/components/vr/VRMiniMap';
import { VRRoomInterior } from '@/components/vr/VRRoomInterior';
import { pullCloud } from '@/lib/vrPickups';

const ring = 'flex items-center justify-center border border-foreground/60 text-foreground bg-background/10 select-none touch-none active:bg-foreground/25';
/** Same look as the move pad's knob: soft see-through white ball, readable on light and dark scenes. */
const ball = 'flex items-center justify-center rounded-full bg-white/30 border-2 border-white/60 text-white font-semibold [text-shadow:0_1px_3px_rgba(0,0,0,0.7)] backdrop-blur-sm select-none touch-none active:bg-white/50';
const faceText = 'flex items-center justify-center bg-transparent border-0 text-white font-semibold [text-shadow:0_1px_3px_rgba(0,0,0,0.6)] select-none touch-none active:opacity-70';

const LightBtn: React.FC = () => {
  const { night, flashlight } = useNight();
  if (!night) return null;
  return <button type="button" aria-label="Flashlight" aria-pressed={flashlight} data-exclude-phantom-tap onClick={toggleFlashlight} className={`${ball} mt-2 h-10 w-10 text-[10px]`}>{flashlight ? 'Light off' : 'Light'}</button>;
};

const CrouchBtn: React.FC = () => {
  const { crouch } = useVRView();
  return <button type="button" aria-label="Crouch" aria-pressed={crouch} data-exclude-phantom-tap onClick={toggleCrouch} className={`${ball} mt-2 h-10 w-10 text-[10px] ${crouch ? 'bg-white/50' : ''}`}>{crouch ? 'Stand' : 'Crouch'}</button>;
};

/** Run is a tap toggle (on = run whenever you move), so it works with one thumb on phones. */
const RunToggle: React.FC<{ glyph?: string }> = ({ glyph }) => {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => () => { fireAction('run', false); }, []);
  const onRef = React.useRef(false);
  const flip = (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); onRef.current = !onRef.current; fireAction('run', onRef.current); setOn(onRef.current); };
  return (
    <button type="button" aria-label={on ? 'Run on (tap to walk)' : 'Run (tap to toggle)'} aria-pressed={on} data-exclude-phantom-tap onPointerDown={flip}
      className={`${faceText} h-10 w-12 text-[11px] ${on ? 'underline underline-offset-4' : ''}`}>
      {glyph ? <span className="flex flex-col items-center leading-none"><span className="text-[11px] font-semibold">{glyph}</span><span>{on ? 'Run on' : 'Run'}</span></span> : (on ? 'Run on' : 'Run')}
    </button>
  );
};

type HintKind = 'door' | 'hand' | 'talk' | 'read' | 'sit' | 'build' | 'paw' | 'enter';
export function hintKind(label: string): HintKind {
  const l = label.toLowerCase();
  if (/pet|feed|help the injured|call the|cow|dog|cat|crow|animal/.test(l)) return 'paw';
  if (/chat|talk|say hi|greet/.test(l)) return 'talk';
  if (/door|unlock|open/.test(l)) return 'door';
  if (/enter|go in|portal/.test(l)) return 'enter';
  if (/read|note/.test(l)) return 'read';
  if (/build/.test(l)) return 'build';
  if (/sit|bench/.test(l)) return 'sit';
    return 'hand';
}
const HINT_PATH: Record<HintKind, string> = {
  door: 'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14.5 12.5h.01',
  enter: 'M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5',
  hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5V4a1.5 1.5 0 0 1 3 0v6m0-4.5a1.5 1.5 0 0 1 3 0V12m-9 1a2 2 0 0 0-3 2.5l3.5 5A3 3 0 0 0 10 22h5a4 4 0 0 0 4-4v-6.5a1.5 1.5 0 0 0-3 0',
  talk: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  read: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM20 17v4H6.5',
  sit: 'M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M3 11h18v4H3zM5 15v5M19 15v5',
  build: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  paw: 'M12 14c-3 0-5 2.5-5 4.5S9 21 12 21s5-.5 5-2.5S15 14 12 14zM6 11a1.8 2.3 0 1 0 0-.01M18 11a1.8 2.3 0 1 0 0-.01M9.5 7a1.8 2.3 0 1 0 0-.01M14.5 7a1.8 2.3 0 1 0 0-.01',
};

/**
 * Icon prompt when something usable (door, house, coin, herb, note, bench,
 * member, animal) is within reach: a symbol of what will happen plus the
 * Use button / E key. Tapping it does the action.
 */
const UseHint: React.FC = () => {
  const [label, setLabel] = React.useState<string | null>(null);
  React.useEffect(() => {
    const t = window.setInterval(() => {
      const u = peekUse();
      setLabel(u ? u.label.replace(/^Picked up (the )?/, 'Pick up ').replace(/^Reading: /, 'Read: ').replace(/^Opened the door$/, 'Open the door') : null);
    }, 400);
    return () => window.clearInterval(t);
  }, []);
  if (!label) return null;
  const k = hintKind(label);
  return (
    <button type="button" data-exclude-phantom-tap data-testid="vr-use-hint" aria-label={`Use: ${label}`} title={label}
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); fireAction('interact', true); }}
      className="pointer-events-auto absolute left-1/2 top-[30%] z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-white [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.75))]">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/90">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={HINT_PATH[k]} /></svg>
      </span>
      <span className="flex items-center gap-1 text-[10px] font-semibold"><span className="rounded border border-white/80 px-1 leading-4">Use</span><span className="hidden sm:inline rounded border border-white/80 px-1 leading-4">E</span></span>
    </button>
  );
};

const Btn: React.FC<{ action: VRAction; label: string; className: string; hold?: boolean; aria: string; glyph?: string; plain?: boolean; round?: boolean }> = ({ action, label, className, hold, aria, glyph, plain, round }) => (
  <button
    type="button" aria-label={aria} data-exclude-phantom-tap
    className={`${round ? ball : plain ? faceText : ring} ${className}`}
    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); fireAction(action, true); }}
    onPointerUp={(e) => { e.stopPropagation(); if (hold) fireAction(action, false); }}
    onPointerLeave={() => { if (hold) fireAction(action, false); }}
  >{glyph ? <span className="flex flex-col items-center leading-none"><span className="text-[11px] font-semibold">{glyph}</span><span>{label}</span></span> : label}</button>
);

export const VRGamepadHUD: React.FC = () => {
  const [layout, setLayout] = useState<PadLayout>(() => loadLayout());
  const [editing, setEditing] = useState(false);
  const [pad, setPad] = useState<PadFamily | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [faceOpen, setFaceOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  useEffect(() => { void pullCloud(); }, []);
  const toastTimer = useRef<number>();
  const say = (msg: string, ms = 1400) => {
    setToast(msg); window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  };

  // Bag: ≡-style button, View/Share on a controller, or the 'vr-open-bag' event.
  useEffect(() => {
    const on = () => setBagOpen((v) => !v);
    const ed = () => setEditing((v) => !v);
    window.addEventListener('vr-open-bag', on);
    window.addEventListener('vr-edit-layout', ed);
    return () => { window.removeEventListener('vr-open-bag', on); window.removeEventListener('vr-edit-layout', ed); };
  }, []);

  // Quest finished: toast + strong rumble (the bell alert is sent by the quest store).
  useEffect(() => {
    const on = (e: Event) => { say(`Quest complete: ${(e as CustomEvent).detail?.title ?? ''}`, 2600); rumble('quest'); try { navigator.vibrate?.([30, 60, 30]); } catch { /* */ } };
    window.addEventListener('vr-quest-complete', on);
    return () => window.removeEventListener('vr-quest-complete', on);
  }, []);

  useEffect(() => saveLayout(layout), [layout]);

  // Feedback from the Use button: what it did, or that nothing is in reach.
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail ?? {};
      say(d.text ?? (d.ok ? 'Done' : 'Nothing to use here'), 1500);
      if (d.ok) rumble('pickup');
    };
    window.addEventListener('vr-use-result', on);
    return () => window.removeEventListener('vr-use-result', on);
  }, []);

  // Physical controllers (Xbox, PlayStation, Bluetooth pads).
  const prevBtn = useRef<boolean[]>([]);
  const held = useRef<Record<string, boolean>>({});
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let sprintLatched = false;
    const onConn = (e: GamepadEvent) => {
      const fam = padFamily(e.gamepad.id); setPad(fam);
      say(`${fam === 'playstation' ? 'PlayStation' : fam === 'xbox' ? 'Xbox' : 'Game'} controller connected`);
    };
    const onDisc = () => {
      const still = pickActivePad(Array.from(navigator.getGamepads?.() ?? []));
      setPad(still ? padFamily(still.id) : null);
      if (!still) {
        say('Controller disconnected');
        for (const k of Object.keys(held.current)) if (held.current[k]) { held.current[k] = false; pressKey(k, false); }
        if (sprintLatched) { sprintLatched = false; fireAction('run', false); }
        prevBtn.current = [];
      }
    };
    window.addEventListener('gamepadconnected', onConn);
    window.addEventListener('gamepaddisconnected', onDisc);
    // Pads already connected before VR World opened (browsers only fire gamepadconnected once).
    const early = pickActivePad(Array.from(navigator.getGamepads?.() ?? []));
    if (early) setPad(padFamily(early.id));
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const gp = pickActivePad(Array.from(navigator.getGamepads?.() ?? []));
      if (gp) {
        const b = gp.buttons;
        const dpad = gp.mapping === 'standard'
          ? { up: buttonDown(b[DPAD.up], DPAD.up), down: buttonDown(b[DPAD.down], DPAD.down), left: buttonDown(b[DPAD.left], DPAD.left), right: buttonDown(b[DPAD.right], DPAD.right) }
          : hatToDpad(gp.axes[9]);
        const keys = stickToKeys(gp.axes[0] ?? 0, gp.axes[1] ?? 0, dpad);
        for (const [k, v] of Object.entries(keys)) {
          if (!!held.current[k] !== v) { held.current[k] = v; pressKey(k, v); }
        }
        const [rx, ry] = radial(gp.axes[2] ?? 0, gp.axes[3] ?? 0, 0.18);
        if (rx || ry) {
          // Same feel as the on-screen look stick at 60 fps, but frame-rate independent.
          window.dispatchEvent(new CustomEvent('vr-camera-look', { detail: { dx: rx * 1.8 * dt, dy: ry * 1.2 * dt } }));
        }
        b.forEach((btn, i) => {
          const down = buttonDown(btn, i);
          const was = prevBtn.current[i] ?? false;
          prevBtn.current[i] = down;
          if (down === was) return;
          if (i === L3_SPRINT_TOGGLE) { if (down) { sprintLatched = !sprintLatched; fireAction('run', sprintLatched); } return; }
          const action = GAMEPAD_BUTTONS[i];
          if (!action) return;
          if (HELD_ACTIONS.has(action)) fireAction(action, down);
          else if (down) fireAction(action, true);
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('gamepadconnected', onConn);
      window.removeEventListener('gamepaddisconnected', onDisc);
      for (const k of Object.keys(held.current)) if (held.current[k]) pressKey(k, false);
      if (sprintLatched) fireAction('run', false);
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  const s = layout.scale;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" style={{ opacity: layout.opacity }} data-testid="vr-gamepad-hud">
      {/* Left: L then a small dropdown (Crouch / Light). Right: dropdown (Jump / Zoe / Run / Use) then R.
          Both rows share the same height and edge distance so L and R mirror each other. */}
      <div className="vr-shoulder-row pointer-events-auto absolute left-3 flex items-center gap-2" style={{ transform: `translateY(-50%) scale(${s})`, transformOrigin: 'left center' }}>
        <Btn round action="camera" label="L" aria="Switch camera" className="h-11 w-11 text-base" />
        <button type="button" aria-label={leftOpen ? 'Hide crouch and light' : 'Show crouch and light'} aria-expanded={leftOpen} data-exclude-phantom-tap onClick={() => { setLeftOpen((v) => !v); setFaceOpen(false); }}
          className={`${ball} h-9 w-9 text-sm`}>{leftOpen ? '◂' : '▸'}</button>
        {leftOpen && <div className="flex items-center gap-2 [&>button]:mt-0" data-testid="vr-left-menu"><CrouchBtn /><LightBtn /><FaceBtn /></div>}
      </div>
      <div className="vr-shoulder-row pointer-events-auto absolute right-3 flex flex-row-reverse items-center gap-2" style={{ transform: `translateY(-50%) scale(${s})`, transformOrigin: 'right center' }}>
        <Btn round action="zoom" label="R" aria="Zoom lens (5X)" className="h-11 w-11 text-base" />
        <button type="button" aria-label={faceOpen ? 'Hide action buttons' : 'Show action buttons'} aria-expanded={faceOpen} data-exclude-phantom-tap onClick={() => { setFaceOpen((v) => !v); setLeftOpen(false); }}
          className={`${ball} h-9 w-9 text-sm`}>{faceOpen ? '▸' : '◂'}</button>
        {faceOpen && (
          <div className="flex flex-row-reverse items-center gap-1 rounded-full bg-black/30 px-1 backdrop-blur-sm" data-testid="vr-face-menu">
            <Btn plain action="jump" label="Jump" hold aria="Jump" glyph={pad ? FACE_GLYPHS[pad].jump : undefined} className="h-10 w-12 text-[11px]" />
            <Btn plain action="zoe" label="Zoe" aria="Ask Zoe" glyph={pad ? FACE_GLYPHS[pad].zoe : undefined} className="h-10 w-10 text-[11px]" />
            <RunToggle glyph={pad ? FACE_GLYPHS[pad].run : undefined} />
            <Btn plain action="interact" label="Use" aria="Pick up or interact" glyph={pad ? FACE_GLYPHS[pad].interact : undefined} className="h-10 w-12 text-[11px]" />
          </div>
        )}
      </div>

      <VRMiniMap onToast={(m) => say(m, 1800)} />
      <UseHint />
      <VRRoomInterior />
      {toast && <div className="absolute bottom-40 left-1/2 -translate-x-1/2 rounded-full surface-warm-tan px-3 py-1 text-xs text-foreground">{toast}</div>}
      {bagOpen && <VRBagPanel onClose={() => setBagOpen(false)} />}

      {editing && (
        <div className="pointer-events-auto absolute left-1/2 top-1/3 w-64 -translate-x-1/2 rounded-2xl surface-warm-tan p-4 text-sm text-foreground" style={{ opacity: 1 / layout.opacity }}>
          <p className="mb-3 font-medium">Control layout</p>
          {([['Opacity', 'opacity', 0.2, 1, 0.1], ['Size', 'scale', 0.7, 1.4, 0.1]] as const).map(([label, key, min, max, step]) => (
            <div key={key} className="mb-3 flex items-center justify-between">
              <span>{label}</span>
              <div className="flex items-center gap-2">
                <button type="button" aria-label={`Less ${label}`} className={`${ring} h-8 w-8 rounded-lg`} onClick={() => setLayout(l => ({ ...l, [key]: Math.max(min, +(l[key] - step).toFixed(2)) }))}>−</button>
                <span className="w-10 text-center tabular-nums">{Math.round(layout[key] * 100)}%</span>
                <button type="button" aria-label={`More ${label}`} className={`${ring} h-8 w-8 rounded-lg`} onClick={() => setLayout(l => ({ ...l, [key]: Math.min(max, +(l[key] + step).toFixed(2)) }))}>+</button>
              </div>
            </div>
          ))}
          <div className="flex justify-between">
            <button type="button" className="text-xs underline" onClick={() => setLayout({ opacity: 1, scale: 1 })}>Reset</button>
            <button type="button" className="text-xs underline" onClick={() => setEditing(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VRGamepadHUD;

/** Face view: your avatar turns round so you see your own face (press again to go back). */
function FaceBtn() {
  const v = useVRView();
  return <button type="button" aria-pressed={v.face} aria-label="Face view" data-exclude-phantom-tap onClick={toggleFaceView}
    className="pointer-events-auto flex h-9 min-w-9 items-center justify-center rounded-full border border-white/40 px-2 text-xs text-white">{v.face ? 'Back' : 'Face'}</button>;
}
