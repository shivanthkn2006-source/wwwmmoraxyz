// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HANDS-FREE DEBUG + STATUS PANEL
// Floating, collapsible. Shows live hands-free state + recent event log.
// Additive UI only — does not touch existing chrome.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { subscribeZoeDebug, clearZoeDebug, type ZoeDebugEntry } from './debugBus';

export interface ZoeHandsFreeDebugPanelProps {
  handsFreeMode: boolean;
  wakeWordActive: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isWakeListening: boolean;
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
}) => {
  const [entries, setEntries] = useState<ZoeDebugEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeZoeDebug(setEntries), []);

  const status =
    isSpeaking ? { label: 'SPEAKING', color: 'bg-purple-500' }
    : isProcessing ? { label: 'PROCESSING', color: 'bg-amber-500' }
    : isListening ? { label: 'LISTENING', color: 'bg-emerald-500' }
    : wakeWordActive ? { label: 'WAKE', color: 'bg-emerald-400' }
    : handsFreeMode ? { label: 'HANDS-FREE IDLE', color: 'bg-cyan-500' }
    : isWakeListening ? { label: 'AWAITING WAKE', color: 'bg-slate-400' }
    : { label: 'OFFLINE', color: 'bg-slate-600' };

  return (
    <div className="fixed bottom-3 left-3 z-[9998] pointer-events-auto select-none font-mono">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur border border-white/10 shadow-lg text-[10px] text-white/90 hover:bg-black/80"
        aria-label="Toggle Zoe hands-free debug"
      >
        <span className={`w-2 h-2 rounded-full ${status.color} ${handsFreeMode || wakeWordActive ? 'animate-pulse' : ''}`} />
        <span className="tracking-wide">HF · {status.label}</span>
        <span className="opacity-50">{open ? '▾' : '▸'}</span>
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
            <button
              type="button"
              onClick={clearZoeDebug}
              className="text-[9px] opacity-70 hover:opacity-100 underline"
            >
              clear
            </button>
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
