// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HANDS-FREE DEBUG + STATUS PANEL
// Floating, collapsible. Shows live hands-free state + recent event log.
// Additive UI only — does not touch existing chrome.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeZoeDebug, clearZoeDebug, type ZoeDebugEntry } from './debugBus';

export interface ZoeHandsFreeDebugPanelProps {
  handsFreeMode: boolean;
  wakeWordActive: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isWakeListening: boolean;
  onToggleHandsFree?: (next: boolean) => void | Promise<void>;
}

const levelColor: Record<ZoeDebugEntry['level'], string> = {
  info: 'text-cyan-300',
  wake: 'text-emerald-300',
  voice: 'text-violet-300',
  error: 'text-red-300',
};

export const ZoeHandsFreeDebugPanel: React.FC<ZoeHandsFreeDebugPanelProps> = ({
  handsFreeMode,
  wakeWordActive,
  isListening,
  isProcessing,
  isSpeaking,
  isWakeListening,
  onToggleHandsFree,
}) => {
  const [entries, setEntries] = useState<ZoeDebugEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 12, y: 12 };
    try {
      const saved = localStorage.getItem('zoe-hf-debug-position');
      if (saved) {
        const parsed = JSON.parse(saved) as { x?: number; y?: number };
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed as { x: number; y: number };
      }
    } catch { /* noop */ }
    return { x: 12, y: Math.max(12, window.innerHeight - 110) };
  });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean; pointerId: number } | null>(null);

  useEffect(() => subscribeZoeDebug(setEntries), []);

  useEffect(() => {
    try { localStorage.setItem('zoe-hf-debug-position', JSON.stringify(position)); } catch { /* noop */ }
  }, [position]);

  const clampPosition = useCallback((x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y };
    return {
      x: Math.min(Math.max(6, x), Math.max(6, window.innerWidth - 40)),
      y: Math.min(Math.max(6, y), Math.max(6, window.innerHeight - 40)),
    };
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [position.x, position.y]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    setPosition(clampPosition(drag.originX + dx, drag.originY + dy));
  }, [clampPosition]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    try { event.currentTarget.releasePointerCapture(drag.pointerId); } catch { /* noop */ }
    dragRef.current = null;
    if (!drag.moved) setOpen((v) => !v);
  }, []);

  const status =
    isSpeaking ? { label: 'SPEAKING', color: 'bg-purple-500' }
    : isProcessing ? { label: 'PROCESSING', color: 'bg-amber-500' }
    : isListening ? { label: 'LISTENING', color: 'bg-emerald-500' }
    : wakeWordActive ? { label: 'WAKE', color: 'bg-emerald-400' }
    : handsFreeMode ? { label: 'HANDS-FREE IDLE', color: 'bg-cyan-500' }
    : isWakeListening ? { label: 'AWAITING WAKE', color: 'bg-slate-400' }
    : { label: 'OFFLINE', color: 'bg-slate-600' };

  return (
    <div
      className="fixed z-[9998] pointer-events-auto select-none font-mono"
      style={{ left: position.x, top: position.y, touchAction: 'none' }}
    >
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative flex h-6 w-6 items-center justify-center rounded-full bg-black/60 backdrop-blur border border-white/10 shadow-lg text-[11px] text-white/90 hover:bg-black/80 cursor-grab active:cursor-grabbing"
        aria-label={`Zoe hands-free status: ${status.label}. Drag to move, tap to open debug.`}
        title={`HF · ${status.label}`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${status.color} ${handsFreeMode || wakeWordActive || isListening || isProcessing || isSpeaking ? 'animate-pulse' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 w-[320px] max-h-[300px] rounded-lg bg-black/80 backdrop-blur border border-white/10 shadow-2xl text-[10px] text-white/90 overflow-hidden flex flex-col">
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 px-2.5 py-2 border-b border-white/10 bg-white/5">
            <StateLine label="handsFreeMode" ok={handsFreeMode} />
            <StateLine label="wakeActive" ok={wakeWordActive} />
            <StateLine label="listening" ok={isListening} />
            <StateLine label="processing" ok={isProcessing} />
            <StateLine label="speaking" ok={isSpeaking} />
            <StateLine label="wakeMic" ok={isWakeListening} />
          </div>
          <div className="flex items-center justify-between px-2.5 py-1 border-b border-white/10 bg-white/[0.03]">
            <span className="opacity-60">events · {entries.length}</span>
            <div className="flex items-center gap-2">
              {onToggleHandsFree && (
                <button
                  type="button"
                  onClick={() => { void onToggleHandsFree(!handsFreeMode); }}
                  className={`text-[9px] px-1.5 py-0.5 rounded border ${handsFreeMode ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' : 'bg-white/5 border-white/15 hover:bg-white/10'}`}
                  aria-pressed={handsFreeMode}
                  title={handsFreeMode ? 'Stop hands-free' : 'Start hands-free (grants mic on mobile)'}
                >
                  {handsFreeMode ? '■ stop HF' : '▶ start HF'}
                </button>
              )}
              <button
                type="button"
                onClick={clearZoeDebug}
                className="text-[9px] opacity-70 hover:opacity-100 underline"
              >
                clear
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-0.5">
            {entries.length === 0 && (
              <div className="opacity-50 py-2">No events yet — say "hey Zoe".</div>
            )}
            {entries.slice().reverse().map((e) => (
              <div key={e.id} className="leading-tight">
                <span className="opacity-40">{new Date(e.ts).toLocaleTimeString().slice(0, 8)} </span>
                <span className={levelColor[e.level]}>[{e.level}]</span>{' '}
                <span className="opacity-95">{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StateLine: React.FC<{ label: string; ok: boolean }> = ({ label, ok }) => (
  <div className="flex items-center gap-1.5">
    <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-slate-600'}`} />
    <span className="opacity-80">{label}</span>
  </div>
);

export default ZoeHandsFreeDebugPanel;
