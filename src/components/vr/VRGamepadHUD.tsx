import { useVRView, toggleCrouch } from '@/lib/vrView';
import { useNight, toggleFlashlight } from './NightMode';
/**
 * Console-style controls for VR World (Resident Evil mobile layout, trimmed):
 * shoulder buttons, a menu button, four face buttons, a layout editor
 * (opacity + size, saved on the device) and physical game controller support.
 * The existing move and look sticks stay as they are.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Backpack, Menu, SlidersHorizontal } from 'lucide-react';
import {
  buttonDown, DPAD, FACE_GLYPHS, fireAction, GAMEPAD_BUTTONS, hatToDpad, HELD_ACTIONS, L3_SPRINT_TOGGLE, loadLayout,
  padFamily, pickActivePad, pressKey, radial, rumble, saveLayout, stickToKeys, type PadFamily, type PadLayout, type VRAction,
} from '@/lib/vrInput';
import { VRBagPanel } from '@/components/vr/VRBagPanel';
import { useStamina } from '@/lib/vrWalk';
import { peekUse } from '@/lib/vrUse';
import { VRMiniMap } from '@/components/vr/VRMiniMap';
import { pullCloud } from '@/lib/vrPickups';

/** Stamina for running: drains while Run is held and you move, refills when you walk or stop. */
const StaminaMeter: React.FC = () => {
  const { stamina, exhausted, running } = useStamina();
  return (
    <div className="absolute -top-4 left-1/2 h-1.5 w-24 -translate-x-1/2 overflow-hidden rounded-full bg-background/30" role="meter" aria-label="Stamina" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(stamina * 100)} data-running={running || undefined}>
      <div className={`h-full rounded-full transition-[width] duration-100 ${exhausted ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${Math.round(stamina * 100)}%` }} />
    </div>
  );
};

const ring = 'flex items-center justify-center border border-foreground/60 text-foreground bg-background/10 select-none touch-none active:bg-foreground/25';
const faceText = 'flex items-center justify-center bg-transparent border-0 text-white font-semibold [text-shadow:0_1px_3px_rgba(0,0,0,0.6)] select-none touch-none active:opacity-70';

const LightBtn: React.FC = () => {
  const { night, flashlight } = useNight();
  if (!night) return null;
  return <button type="button" aria-label="Flashlight" aria-pressed={flashlight} data-exclude-phantom-tap onClick={toggleFlashlight} className={`${ring} mt-2 block h-9 w-14 rounded-lg text-[10px]`}>{flashlight ? 'Light off' : 'Light'}</button>;
};

const CrouchBtn: React.FC = () => {
  const { crouch } = useVRView();
  return <button type="button" aria-label="Crouch" aria-pressed={crouch} data-exclude-phantom-tap onClick={toggleCrouch} className={`${ring} mt-2 block h-9 w-14 rounded-lg text-[10px] ${crouch ? 'opacity-100' : 'opacity-80'}`}>{crouch ? 'Stand' : 'Crouch'}</button>;
};

/** Run is a tap toggle (on = run whenever you move), so it works with one thumb on phones. */
const RunToggle: React.FC<{ glyph?: string }> = ({ glyph }) => {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => () => { fireAction('run', false); }, []);
  const onRef = React.useRef(false);
  const flip = (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); onRef.current = !onRef.current; fireAction('run', onRef.current); setOn(onRef.current); };
  return (
    <button type="button" aria-label={on ? 'Run on (tap to walk)' : 'Run (tap to toggle)'} aria-pressed={on} data-exclude-phantom-tap onPointerDown={flip}
      className={`${faceText} absolute right-0 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full text-[10px] ${on ? 'underline underline-offset-4' : ''}`}>
      {glyph ? <span className="flex flex-col items-center leading-none"><span className="text-[11px] font-semibold">{glyph}</span><span>{on ? 'Run on' : 'Run'}</span></span> : (on ? 'Run on' : 'Run')}
    </button>
  );
};

/** Shows what Use would do when something usable (door, key, note, relic, player) is within reach. */
const UseHint: React.FC = () => {
  const [label, setLabel] = React.useState<string | null>(null);
  React.useEffect(() => {
    const t = window.setInterval(() => {
      const u = peekUse();
      setLabel(u ? u.label.replace(/^Picked up (the )?/, 'Pick up ').replace(/^Reading: /, 'Read: ') : null);
    }, 500);
    return () => window.clearInterval(t);
  }, []);
  if (!label) return null;
  return <div className="absolute bottom-[19rem] right-4 max-w-[12rem] text-right text-xs font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]" data-testid="vr-use-hint">Use → {label}</div>;
};

const Btn: React.FC<{ action: VRAction; label: string; className: string; hold?: boolean; aria: string; glyph?: string; plain?: boolean }> = ({ action, label, className, hold, aria, glyph, plain }) => (
  <button
    type="button" aria-label={aria} data-exclude-phantom-tap
    className={`${plain ? faceText : ring} ${className}`}
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
  useEffect(() => { void pullCloud(); }, []);
  const toastTimer = useRef<number>();
  const say = (msg: string, ms = 1400) => {
    setToast(msg); window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  };

  // Bag: ≡-style button, View/Share on a controller, or the 'vr-open-bag' event.
  useEffect(() => {
    const on = () => setBagOpen((v) => !v);
    window.addEventListener('vr-open-bag', on);
    return () => window.removeEventListener('vr-open-bag', on);
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
      {/* Shoulder buttons */}
      <div className="pointer-events-auto absolute left-4 top-24" style={{ transform: `scale(${s})`, transformOrigin: 'top left' }}>
        <Btn action="camera" label="L" aria="Switch camera" className="h-11 w-14 rounded-t-2xl rounded-b-lg text-sm font-semibold" />
        <CrouchBtn />
        <LightBtn />
      </div>
      <div className="pointer-events-auto absolute right-4 top-24" style={{ transform: `scale(${s})`, transformOrigin: 'top right' }}>
        <Btn action="zoom" label="R" aria="Zoom lens" className="h-11 w-14 rounded-t-2xl rounded-b-lg text-sm font-semibold" />
      </div>

      {/* Menu + layout */}
      <div className="pointer-events-auto absolute right-24 top-24 flex gap-2" style={{ transform: `scale(${s})`, transformOrigin: 'top right' }}>
        <button type="button" aria-label="Open item bag" data-exclude-phantom-tap className={`${ring} h-10 w-10 rounded-full`} onClick={() => setBagOpen(v => !v)}><Backpack className="h-4 w-4" /></button>
        <button type="button" aria-label="Open VR menu" data-exclude-phantom-tap className={`${ring} h-10 w-10 rounded-full`} onClick={() => fireAction('menu')}><Menu className="h-4 w-4" /></button>
        <button type="button" aria-label="Edit control layout" data-exclude-phantom-tap className={`${ring} h-10 w-10 rounded-full`} onClick={() => setEditing(v => !v)}><SlidersHorizontal className="h-4 w-4" /></button>
      </div>

      {/* Face buttons (diamond) above the look stick */}
      <button type="button" aria-label={faceOpen ? 'Hide action buttons' : 'Show action buttons'} aria-expanded={faceOpen} data-exclude-phantom-tap onClick={() => setFaceOpen((v) => !v)}
        className={`${faceText} pointer-events-auto absolute bottom-[14.5rem] right-4 h-10 w-10 text-xl`}>{faceOpen ? '›' : '◇'}</button>
      <div className={`vr-face-diamond pointer-events-auto absolute bottom-52 right-16 h-36 w-36 transition-all duration-200 ${faceOpen ? 'opacity-100 translate-x-0' : 'pointer-events-none opacity-0 translate-x-8'}`} style={{ transform: `scale(${s})`, transformOrigin: 'bottom right' }} aria-hidden={!faceOpen}>
        <Btn plain action="jump" label="Jump" hold aria="Jump" glyph={pad ? FACE_GLYPHS[pad].jump : undefined} className="absolute left-1/2 top-0 h-12 w-12 -translate-x-1/2 rounded-full text-[10px]" />
        <Btn plain action="zoe" label="Zoe" aria="Ask Zoe" glyph={pad ? FACE_GLYPHS[pad].zoe : undefined} className="absolute left-0 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full text-[10px]" />
        <RunToggle glyph={pad ? FACE_GLYPHS[pad].run : undefined} />
        <Btn plain action="interact" label="Use" aria="Pick up or interact" glyph={pad ? FACE_GLYPHS[pad].interact : undefined} className="absolute bottom-0 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full text-[10px]" />
        <StaminaMeter />
      </div>

      <VRMiniMap onToast={(m) => say(m, 1800)} />
      <UseHint />
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
            <button type="button" className="text-xs underline" onClick={() => setLayout({ opacity: 0.7, scale: 1 })}>Reset</button>
            <button type="button" className="text-xs underline" onClick={() => setEditing(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VRGamepadHUD;
