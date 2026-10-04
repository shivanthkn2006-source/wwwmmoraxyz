/**
 * Console-style controls for VR World (Resident Evil mobile layout, trimmed):
 * shoulder buttons, a menu button, four face buttons, a layout editor
 * (opacity + size, saved on the device) and physical game controller support.
 * The existing move and look sticks stay as they are.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Menu, SlidersHorizontal } from 'lucide-react';
import { fireAction, GAMEPAD_BUTTONS, loadLayout, pressKey, saveLayout, stickToKeys, type VRAction, type PadLayout } from '@/lib/vrInput';

const ring = 'flex items-center justify-center border border-foreground/60 text-foreground bg-background/10 select-none touch-none active:bg-foreground/25';

const Btn: React.FC<{ action: VRAction; label: string; className: string; hold?: boolean; aria: string }> = ({ action, label, className, hold, aria }) => (
  <button
    type="button" aria-label={aria} data-exclude-phantom-tap
    className={`${ring} ${className}`}
    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); fireAction(action, true); }}
    onPointerUp={(e) => { e.stopPropagation(); if (hold) fireAction(action, false); }}
    onPointerLeave={() => { if (hold) fireAction(action, false); }}
  >{label}</button>
);

export const VRGamepadHUD: React.FC = () => {
  const [layout, setLayout] = useState<PadLayout>(() => loadLayout());
  const [editing, setEditing] = useState(false);
  const [pad, setPad] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => saveLayout(layout), [layout]);

  // Feedback when Interact finds nothing nearby.
  useEffect(() => {
    const on = (e: Event) => {
      const ok = (e as CustomEvent).detail?.collected;
      setToast(ok ? 'Picked up' : 'Nothing to pick up here');
      window.setTimeout(() => setToast(null), 1200);
    };
    window.addEventListener('vr-interact-result', on);
    return () => window.removeEventListener('vr-interact-result', on);
  }, []);

  // Physical controllers (Xbox, PlayStation, Bluetooth pads).
  const prevBtn = useRef<boolean[]>([]);
  const held = useRef<Record<string, boolean>>({});
  useEffect(() => {
    let raf = 0;
    const onConn = (e: GamepadEvent) => setPad(e.gamepad.id);
    const onDisc = () => setPad(null);
    window.addEventListener('gamepadconnected', onConn);
    window.addEventListener('gamepaddisconnected', onDisc);
    const loop = () => {
      const gp = Array.from(navigator.getGamepads?.() ?? []).find(Boolean);
      if (gp) {
        const keys = stickToKeys(gp.axes[0] ?? 0, gp.axes[1] ?? 0);
        for (const [k, v] of Object.entries(keys)) {
          if (!!held.current[k] !== v) { held.current[k] = v; pressKey(k, v); }
        }
        const rx = gp.axes[2] ?? 0, ry = gp.axes[3] ?? 0;
        if (Math.abs(rx) > 0.2 || Math.abs(ry) > 0.2) {
          window.dispatchEvent(new CustomEvent('vr-camera-look', { detail: { dx: rx * 0.03, dy: ry * 0.02 } }));
        }
        gp.buttons.forEach((b, i) => {
          const was = prevBtn.current[i] ?? false;
          const action = GAMEPAD_BUTTONS[i];
          if (action && b.pressed !== was) fireAction(action, b.pressed);
          prevBtn.current[i] = b.pressed;
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
    };
  }, []);

  const s = layout.scale;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" style={{ opacity: layout.opacity }} data-testid="vr-gamepad-hud">
      {/* Shoulder buttons */}
      <div className="pointer-events-auto absolute left-4 top-24" style={{ transform: `scale(${s})`, transformOrigin: 'top left' }}>
        <Btn action="camera" label="L" aria="Switch camera" className="h-11 w-14 rounded-t-2xl rounded-b-lg text-sm font-semibold" />
      </div>
      <div className="pointer-events-auto absolute right-4 top-24" style={{ transform: `scale(${s})`, transformOrigin: 'top right' }}>
        <Btn action="zoom" label="R" aria="Zoom lens" className="h-11 w-14 rounded-t-2xl rounded-b-lg text-sm font-semibold" />
      </div>

      {/* Menu + layout */}
      <div className="pointer-events-auto absolute right-24 top-24 flex gap-2" style={{ transform: `scale(${s})`, transformOrigin: 'top right' }}>
        <button type="button" aria-label="Open VR menu" data-exclude-phantom-tap className={`${ring} h-10 w-10 rounded-full`} onClick={() => fireAction('menu')}><Menu className="h-4 w-4" /></button>
        <button type="button" aria-label="Edit control layout" data-exclude-phantom-tap className={`${ring} h-10 w-10 rounded-full`} onClick={() => setEditing(v => !v)}><SlidersHorizontal className="h-4 w-4" /></button>
      </div>

      {/* Face buttons (diamond) above the look stick */}
      <div className="pointer-events-auto absolute bottom-52 right-4 h-36 w-36" style={{ transform: `scale(${s})`, transformOrigin: 'bottom right' }}>
        <Btn action="jump" label="Jump" aria="Jump" className="absolute left-1/2 top-0 h-12 w-12 -translate-x-1/2 rounded-full text-[10px]" />
        <Btn action="zoe" label="Zoe" aria="Ask Zoe" className="absolute left-0 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full text-[10px]" />
        <Btn action="run" label="Run" hold aria="Run (hold)" className="absolute right-0 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full text-[10px]" />
        <Btn action="interact" label="Use" aria="Pick up or interact" className="absolute bottom-0 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full text-[10px]" />
      </div>

      {toast && <div className="absolute bottom-40 left-1/2 -translate-x-1/2 rounded-full surface-warm-tan px-3 py-1 text-xs text-foreground">{toast}</div>}
      {pad && <div className="absolute left-1/2 top-12 -translate-x-1/2 text-[10px] text-foreground/80">Controller connected</div>}

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
