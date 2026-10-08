import { getMapPrefs, setMapPrefs } from '@/lib/vrMapPrefs';
import { ListChecks, Menu as MenuIcon, SlidersHorizontal } from 'lucide-react';
import { fireAction } from '@/lib/vrInput';
/**
 * VRTopDock — the single, decluttered entry point for every VR World panel.
 *
 * While mounted, the body gets `data-vr-clean`, which hides every overlay
 * wrapped in <VRFeature id>. Only the clock/compass, the left move stick and
 * the right look/360 pad stay on screen. A plain down arrow next to the
 * compass drops a ~1 cm horizontal, scrollable strip of icons; tapping an
 * icon reveals just that feature (its content only mounts once it's shown,
 * because hidden features with `display:none` are still cheap DOM and the
 * heavy panels are already lazy behind their own toggles).
 */
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  ChevronDown, ChevronUp, Gauge, Mountain, Mic, Gamepad2, Bug, Shield, Backpack,
  Users, Cpu, ZoomIn, LayoutGrid, Wallet, LogOut, Move3d, Navigation, HelpCircle, MapPin, GripHorizontal,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// ── Which features the dock has opened (shared with every <VRFeature>) ──
let shownIds = new Set<string>();
const listeners = new Set<() => void>();
const setShownIds = (next: Set<string>) => { shownIds = next; listeners.forEach(l => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const useFeatureShown = (id: string) => useSyncExternalStore(subscribe, () => shownIds.has(id), () => false);
let dockMounted = false;
const setDockMounted = (v: boolean) => { dockMounted = v; listeners.forEach(l => l()); };

type Offset = { x: number; y: number };
const posKey = (id: string) => `vr-feature-pos:${id}`;
const defaultOffset = (_id: string): Offset => ({ x: 0, y: 0 });
const clampOffset = (o: Offset): Offset => {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const h = typeof window !== 'undefined' ? window.innerHeight : 1000;
  return { x: Math.max(-w + 60, Math.min(w - 60, o.x)), y: Math.max(-h + 60, Math.min(h - 60, o.y)) };
};
const readOffset = (id: string): Offset => {
  try {
    const raw = window.localStorage.getItem(posKey(id));
    if (raw) { const p = JSON.parse(raw); if (typeof p?.x === 'number' && typeof p?.y === 'number') return clampOffset(p); }
  } catch { /* ignore */ }
  return defaultOffset(id);
};

/** Pointer drag that moves an element by an offset, saved per key. */
function useDragOffset(key: string, onEnd?: () => void) {
  const [offset, setOffset] = useState<Offset>(() => (typeof window !== 'undefined' ? readOffset(key) : { x: 0, y: 0 }));
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault(); e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      drag.current = { px: e.clientX, py: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      setOffset(clampOffset({ x: d.ox + e.clientX - d.px, y: d.oy + e.clientY - d.py }));
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (!drag.current) return;
      e.stopPropagation();
      drag.current = null;
      try { window.localStorage.setItem(posKey(key), JSON.stringify(offsetRef.current)); } catch { /* ignore */ }
      onEnd?.();
    },
    onDoubleClick: () => {
      setOffset(defaultOffset(key));
      try { window.localStorage.removeItem(posKey(key)); } catch { /* ignore */ }
    },
  };
  return { offset, offsetRef, dragging: () => !!drag.current, handlers: { ...handlers, onPointerCancel: handlers.onPointerUp } };
}

const GRIP_CLASS = 'h-7 w-11 rounded-full surface-warm-tan flex items-center justify-center text-white/90 cursor-grab active:cursor-grabbing';

// ── The controls tray: every on-screen control opened from the menu sits here, side by side ──
let trayEl: HTMLElement | null = null;
const trayListeners = new Set<() => void>();
const setTrayEl = (el: HTMLElement | null) => { if (trayEl !== el) { trayEl = el; trayListeners.forEach(l => l()); } };
const useTrayEl = () => useSyncExternalStore(
  (l) => { trayListeners.add(l); return () => { trayListeners.delete(l); }; }, () => trayEl, () => null);

/** One tray for all extra controls, beside the main pad; the whole tray drags as one. */
const VRControlTray: React.FC = () => {
  const { offset, handlers } = useDragOffset('tray');
  const ref = useCallback((el: HTMLDivElement | null) => setTrayEl(el), []);
  useEffect(() => () => setTrayEl(null), []);
  return (
    <div
      className="vr-control-tray fixed z-[9991] surface-warm-tan rounded-2xl p-2 pt-1 flex flex-col items-center gap-1"
      style={{ transform: `translate(calc(var(--vr-tray-shift, -50%) + ${offset.x}px), ${offset.y}px)` }}
      data-exclude-phantom-tap
    >
      <button type="button" data-vr-grip="1" aria-label="Drag controls tray" className={GRIP_CLASS} style={{ touchAction: 'none' }} {...handlers}>
        <GripHorizontal className="h-4 w-4" />
      </button>
      <div ref={ref} data-vr-tray-items className="flex flex-wrap items-end justify-center gap-2" />
    </div>
  );
};

/**
 * Wraps a VR World overlay. Hidden while the dock is mounted; once opened from the menu:
 *  - `tray` features (controls) move into the shared controls tray, side by side, so they
 *    never land on top of the main pads;
 *  - other features (panels) float above the scene with their own drag grip.
 * Positions are remembered per device.
 */
export const VRFeature: React.FC<{ id: string; part?: string; tray?: boolean; children: React.ReactNode }> = ({ id, part, tray, children }) => {
  const shown = useFeatureShown(id);
  const dockOn = useSyncExternalStore(subscribe, () => dockMounted, () => false);
  const tray$ = useTrayEl();
  const key = part ? `${id}:${part}` : id;
  const ref = useRef<HTMLDivElement>(null);
  const [handle, setHandle] = useState<Offset | null>(null);
  const measureRef = useRef<() => void>(() => {});
  const { offset, offsetRef, dragging, handlers } = useDragOffset(key, () => measureRef.current());

  // Place the grip at the top-left corner of whatever this feature draws.
  const measure = useCallback(() => {
    const root = ref.current;
    if (!root || dragging()) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    let minX = Infinity, minY = Infinity;
    const els = root.querySelectorAll<HTMLElement>('*');
    for (let i = 0; i < els.length && i < 400; i++) {
      const el = els[i];
      if (el.dataset.vrGrip) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.width > vw * 0.95 || r.height > vh * 0.95) continue;
      if (r.left < minX) minX = r.left;
      if (r.top < minY) minY = r.top;
    }
    if (!Number.isFinite(minX)) { setHandle(null); return; }
    const o = offsetRef.current;
    setHandle({ x: Math.max(4, Math.min(vw - 40, minX)) - o.x, y: Math.max(4, minY - 30) - o.y });
  }, [dragging, offsetRef]);
  measureRef.current = measure;

  const floating = shown && !(tray && tray$);
  useEffect(() => {
    if (!floating) { setHandle(null); return; }
    const t0 = window.setTimeout(measure, 60);
    const iv = window.setInterval(measure, 1200);
    window.addEventListener('resize', measure);
    return () => { window.clearTimeout(t0); window.clearInterval(iv); window.removeEventListener('resize', measure); };
  }, [floating, measure]);

  if (tray && tray$) {
    // Dock is mounted: controls render only while opened, inside the tray.
    return shown ? createPortal(<div data-vr-tray-item={id} className="contents">{children}</div>, tray$) : null;
  }
  // Dock is mounted and this feature isn't opened: render nothing, so panels that
  // portal to <body> (VR Voice, Controls) can't escape the hidden wrapper.
  if (dockOn && !shown) return null;

  return (
    <div
      ref={ref}
      data-vr-feature={id}
      data-vr-float={floating ? '' : undefined}
      style={floating
        ? { position: 'fixed', inset: 0, zIndex: 9990, pointerEvents: 'none', transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }
        : { display: 'contents' }}
    >
      {children}
      {floating && handle && (
        <button
          type="button"
          data-vr-grip="1"
          data-exclude-phantom-tap
          aria-label="Drag to move"
          {...handlers}
          className={cn('absolute', GRIP_CLASS)}
          style={{ left: handle.x, top: handle.y, touchAction: 'none', pointerEvents: 'auto' }}
        >
          <GripHorizontal className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

type Item = { id: string; label: string; icon: React.ElementType; how: string };

const ITEMS: Item[] = [
  { id: 'guide', label: 'How to', icon: HelpCircle, how: 'This chart. Tap any icon to show or hide that part of VR World.' },
  { id: 'map', label: 'Map', icon: MapPin, how: 'Your real street: location, map blocks loaded, which world you are in, and a world check.' },
  { id: 'nav', label: 'Travel', icon: Navigation, how: 'Satellite, aerial, ground, mountains, summit, city core and the VR catalog.' },
  { id: 'session', label: 'Session', icon: Move3d, how: 'Zoe Omega badge, sound, Exit VR, dreamscape and the time bar.' },
  { id: 'panels', label: 'Panels', icon: LayoutGrid, how: 'Music, Ask Zoe, friends, uploads, planetary mood, Zoe cards, mind HUD, diagnostics.' },
  { id: 'voice', label: 'Voice', icon: Mic, how: 'Say "Zoe satellite view", "Zoe F1 circuit", "Zoe mountain view" and more.' },
  { id: 'controls', label: 'Controls', icon: Gamepad2, how: 'Keyboard and touch controls list, plus integrity level.' },
  { id: 'extras', label: 'More moves', icon: Move3d, how: 'Look stick, turn left/right/180, 5X lens, spawn a car, bike controls.' },
  { id: 'zoom5x', label: '5X lens', icon: ZoomIn, how: 'Desktop 5X zoom button (key Z).' },
  { id: 'altitude', label: 'Altitude', icon: Mountain, how: 'Your height, zoom level and current view.' },
  { id: 'status', label: 'Loading', icon: Gauge, how: 'World loading progress and control readiness.' },
  { id: 'graphics', label: 'Graphics', icon: Cpu, how: 'Graphics tier, FPS and City / Splat / view toggles.' },
  { id: 'inventory', label: 'Inventory', icon: Backpack, how: 'Items you own in VR World.' },
  { id: 'wallet', label: 'Wallet', icon: Wallet, how: 'Karma and credits.' },
  { id: 'online', label: 'Online', icon: Users, how: 'How many people are in the world with you.' },
  { id: 'check', label: 'Check', icon: Gauge, how: 'Run end-to-end check and see top players.' },
  { id: 'admin', label: 'Admin', icon: Shield, how: 'Enterprise control deck (admin only).' },
  { id: 'debug', label: 'Debug', icon: Bug, how: 'Debug panel (Ctrl+Shift+D).' },
  { id: 'exit', label: 'Exit', icon: LogOut, how: 'Return to reality.' },
];

export const VRTopDock: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onMenu = () => setOpen(o => !o);
    const onShow = (e: Event) => { const id = (e as CustomEvent).detail?.id; if (typeof id === 'string') setShown(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
    window.addEventListener('vr-open-menu', onMenu);
    window.addEventListener('vr-show-feature', onShow);
    return () => { window.removeEventListener('vr-open-menu', onMenu); window.removeEventListener('vr-show-feature', onShow); };
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-vr-clean', '1');
    setDockMounted(true);
    return () => { document.body.removeAttribute('data-vr-clean'); setDockMounted(false); };
  }, []);

  const toggle = (id: string) =>
    setShown(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Share the open set with every <VRFeature>; closing the dock's page resets it.
  useEffect(() => { setShownIds(new Set(Array.from(shown).filter(id => id !== 'guide'))); }, [shown]);
  useEffect(() => () => setShownIds(new Set()), []);

  return (
    <>
      <VRControlTray />
      <button
        type="button"
        aria-label={open ? 'Hide VR menu' : 'Show VR menu'}
        onClick={() => setOpen(o => !o)}
        className="fixed top-3 z-[9998] h-7 w-7 flex items-center justify-center text-[hsl(var(--foreground))] drop-shadow"
        style={{ left: 'calc(50% + 118px)' }}
        data-exclude-phantom-tap
      >
        {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="fixed top-12 left-1/2 -translate-x-1/2 z-[9998] w-[min(94vw,680px)] surface-warm-tan rounded-full"
          style={{ height: '38px' }}
          data-exclude-phantom-tap
        >
          <div className="h-full flex items-center gap-1 px-2 overflow-x-auto overscroll-contain [scrollbar-width:none]">
            {([['Bag', Backpack, () => window.dispatchEvent(new Event('vr-open-bag'))], ['Menu', MenuIcon, () => fireAction('menu')], ['Layout', SlidersHorizontal, () => window.dispatchEvent(new Event('vr-edit-layout'))], ['Map opacity', MapPin, () => { const o = getMapPrefs().opacity; setMapPrefs({ opacity: o >= 1 ? 0.4 : +(o + 0.2).toFixed(1) }); }], ['Map size', MapPin, () => setMapPrefs({ size: getMapPrefs().size === 'large' ? 'normal' : 'large' })], ['Big map', MapPin, () => setMapPrefs({ big: true })]] as const).map(([label, Icon, run]) => (
              <button key={label} type="button" aria-label={label === 'Bag' ? 'Open item bag' : label === 'Menu' ? 'Open VR menu' : label === 'Layout' ? 'Edit control layout' : label} onClick={run}
                className="shrink-0 h-[30px] px-2 rounded-full flex items-center gap-1 text-[11px] whitespace-nowrap text-white/90"><Icon className="h-4 w-4" />{label}</button>
            ))}
            {ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                aria-pressed={shown.has(id)}
                className={cn(
                  'shrink-0 h-[30px] px-2 rounded-full flex items-center gap-1 text-[11px] whitespace-nowrap transition-colors',
                  shown.has(id) ? 'bg-white text-stone-800' : 'text-white/90',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {open && shown.has('guide') && (
        <div className="fixed top-[6.25rem] left-1/2 -translate-x-1/2 z-[9998] w-[min(94vw,680px)] max-h-[50vh] overflow-y-auto surface-warm-tan rounded-2xl p-3 text-[11px] text-white/90">
          <p className="mb-2">Left stick moves you. Right pad (360) looks and zooms. Everything else lives in this menu.</p>
          <table className="w-full">
            <tbody>
              {ITEMS.filter(i => i.id !== 'guide').map(({ id, label, icon: Icon, how }) => (
                <tr key={id} className="align-top">
                  <td className="py-1 pr-2 whitespace-nowrap"><span className="inline-flex items-center gap-1"><Icon className="h-3.5 w-3.5" />{label}</span></td>
                  <td className="py-1">{how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default VRTopDock;
