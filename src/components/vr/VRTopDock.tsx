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
import React, { useEffect, useState } from 'react';
import {
  ChevronDown, ChevronUp, Gauge, Mountain, Mic, Gamepad2, Bug, Shield, Backpack,
  Users, Cpu, ZoomIn, LayoutGrid, Wallet, LogOut, Move3d, Navigation, HelpCircle, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const VRFeature: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <div data-vr-feature={id} style={{ display: 'contents' }}>{children}</div>
);

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
  { id: 'admin', label: 'Admin', icon: Shield, how: 'Enterprise control deck (admin only).' },
  { id: 'debug', label: 'Debug', icon: Bug, how: 'Debug panel (Ctrl+Shift+D).' },
  { id: 'exit', label: 'Exit', icon: LogOut, how: 'Return to reality.' },
];

export const VRTopDock: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onMenu = () => setOpen(o => !o);
    window.addEventListener('vr-open-menu', onMenu);
    return () => window.removeEventListener('vr-open-menu', onMenu);
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-vr-clean', '1');
    return () => document.body.removeAttribute('data-vr-clean');
  }, []);

  const toggle = (id: string) =>
    setShown(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const reveal = Array.from(shown).filter(id => id !== 'guide')
    .map(id => `body[data-vr-clean] [data-vr-feature="${id}"]{display:contents !important}`).join('');

  return (
    <>
      {reveal && <style>{reveal}</style>}
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
