// ═══════════════════════════════════════════════════════════════════════════════
// ZOE GOD MODE — Platform Scan floating trigger + report modal
// One button in the bottom-left corner. Runs the end-to-end scan and shows
// a live checklist + copy-to-clipboard markdown report.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  runGodModePlatformScan,
  formatReportMarkdown,
  type CheckResult,
  type CheckStatus,
  type PlatformScanReport,
  type ScanProgress,
} from './platformScan';

const badge: Record<CheckStatus, { icon: string; color: string; bg: string }> = {
  pass: { icon: '✓', color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-400/30' },
  warn: { icon: '⚠', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-400/30' },
  fail: { icon: '✗', color: 'text-red-300', bg: 'bg-red-500/10 border-red-400/30' },
  skip: { icon: '–', color: 'text-white/50', bg: 'bg-white/5 border-white/10' },
};

const GAP = 16; // px from viewport edges
const BTN_W = 96; // approximate button width
const BTN_H = 36; // approximate button height
const GOD_MODE_POSITION_KEY = 'zoe-godmode-trigger-position-v1';

const readSavedPosition = () => {
  if (typeof window === 'undefined') return { left: GAP, bottom: GAP };
  try {
    const saved = localStorage.getItem(GOD_MODE_POSITION_KEY);
    if (!saved) return { left: GAP, bottom: GAP };
    const parsed = JSON.parse(saved) as { left?: number; bottom?: number };
    if (typeof parsed.left === 'number' && typeof parsed.bottom === 'number') {
      return { left: parsed.left, bottom: parsed.bottom };
    }
  } catch { /* noop */ }
  return { left: GAP, bottom: GAP };
};

export const ZoeGodModeScanPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [report, setReport] = useState<PlatformScanReport | null>(null);
  const [copied, setCopied] = useState(false);

  const [pos, setPos] = useState<{ left: number; bottom: number }>(readSavedPosition);
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; initialLeft: number; initialBottom: number; movedPx: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const clampPos = useCallback((nextLeft: number, nextBottom: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = buttonRef.current?.offsetWidth || BTN_W;
    const height = buttonRef.current?.offsetHeight || BTN_H;
    return {
      left: Math.max(GAP, Math.min(vw - width - GAP, nextLeft)),
      bottom: Math.max(GAP, Math.min(vh - height - GAP, nextBottom)),
    };
  }, []);

  useEffect(() => {
    setPos((current) => clampPos(current.left, current.bottom));
    const onResize = () => setPos((current) => clampPos(current.left, current.bottom));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampPos]);

  useEffect(() => {
    try { localStorage.setItem(GOD_MODE_POSITION_KEY, JSON.stringify(pos)); } catch { /* noop */ }
  }, [pos]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current?.dragging) return;
      e.preventDefault();
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      dragRef.current.movedPx = Math.hypot(dx, dy);
      setPos(clampPos(dragRef.current.initialLeft + dx, dragRef.current.initialBottom - dy));
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragRef.current?.dragging) return;
      e.preventDefault();
      dragRef.current.dragging = false;
      // Keep the ref so onClick can inspect movedPx; clear it after click has fired.
      setTimeout(() => { dragRef.current = null; }, 50);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [clampPos]);

  const startScan = useCallback(async () => {


    setRunning(true);
    setReport(null);
    setProgress({ completed: 0, total: 0, results: [] });
    try {
      const r = await runGodModePlatformScan((p) => setProgress(p));
      setReport(r);
    } finally {
      setRunning(false);
    }
  }, []);

  const copyReport = useCallback(async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(formatReportMarkdown(report));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  }, [report]);

  const downloadJson = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zoe-godmode-scan-${new Date(report.startedAt).toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  const activeResults = progress?.results ?? report?.checks ?? [];
  const grouped = useMemo(() => {
    const map = new Map<string, CheckResult[]>();
    for (const r of activeResults) {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    }
    return Array.from(map.entries());
  }, [activeResults]);

  return (
    <>
      {/* Floating trigger — draggable, bottom-left by default, out of the way of the bottom-right call controls */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          // Only open if the user didn't just drag.
          if (!dragRef.current?.dragging && (dragRef.current ? dragRef.current.movedPx < 4 : true)) {
            setOpen(true);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        onPointerDown={(e) => {
          // Left button only.
          if (e.button !== 0) return;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          dragRef.current = {
            dragging: true,
            startX: e.clientX,
            startY: e.clientY,
            initialLeft: pos.left,
            initialBottom: pos.bottom,
            movedPx: 0,
          };
        }}
        style={{ left: pos.left, bottom: pos.bottom }}
        className="fixed z-[9997] flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur border border-fuchsia-400/40 text-fuchsia-200 hover:bg-black/85 hover:border-fuchsia-300/60 px-3 py-1.5 text-[11px] font-mono shadow-lg pointer-events-auto cursor-move select-none touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        title="Drag to reposition. Tap to open Zoe God Mode scan."
        aria-label="Open Zoe God Mode platform scan. Draggable trigger."
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="zoe-godmode-scan-dialog"
      >
        <span className="text-sm leading-none">🛰</span>
        <span>god-mode</span>
      </button>


      {open && (
        <div
          id="zoe-godmode-scan-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="zoe-godmode-scan-title"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-mono"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl bg-zinc-950 border border-fuchsia-400/30 shadow-2xl text-white/90 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-fuchsia-500/10 to-cyan-500/10">
              <div>
                <div id="zoe-godmode-scan-title" className="text-sm font-semibold text-fuchsia-200">🛰 Zoe God Mode — Platform Scan</div>
                <div className="text-[10px] opacity-60">End-to-end check across browser, cloud, AI, hands-free, runtime</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { void startScan(); }}
                  disabled={running}
                  className={`text-[11px] px-2.5 py-1 rounded border ${running ? 'bg-amber-500/20 border-amber-400/40 text-amber-200' : 'bg-fuchsia-500/20 border-fuchsia-400/40 text-fuchsia-100 hover:bg-fuchsia-500/30'}`}
                  aria-label={running ? 'Zoe God Mode scan running' : report ? 'Run Zoe God Mode scan again' : 'Run Zoe God Mode scan'}
                >
                  {running ? '⏳ scanning…' : report ? '↻ re-scan' : '▶ run scan'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[11px] px-2 py-1 rounded border border-white/15 hover:bg-white/10"
                  aria-label="Close Zoe God Mode scan dialog"
                >
                  close
                </button>
              </div>
            </div>

            {/* Progress / Summary bar */}
            {(progress || report) && (
              <div className="px-4 py-2 border-b border-white/10 bg-white/[0.03] text-[11px] flex items-center justify-between">
                {report ? (
                  <>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${badge[report.overall].color}`}>
                        {badge[report.overall].icon} {report.overall.toUpperCase()}
                      </span>
                      <span className="opacity-70">{report.counts.pass}✓ · {report.counts.warn}⚠ · {report.counts.fail}✗ · {report.counts.skip}–</span>
                      <span className="opacity-50">{report.durationMs}ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => { void copyReport(); }} className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 hover:bg-white/10" aria-label="Copy Zoe God Mode scan report as Markdown">
                        {copied ? '✓ copied' : 'copy md'}
                      </button>
                      <button type="button" onClick={downloadJson} className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 hover:bg-white/10" aria-label="Download Zoe God Mode scan report JSON">
                        json
                      </button>
                    </div>
                  </>
                ) : progress ? (
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-1">
                      <span className="opacity-70">{progress.completed}/{progress.total || '…'} checks</span>
                      <span className="opacity-50">{progress.current ?? ''}</span>
                    </div>
                    <div className="h-1 rounded bg-white/10 overflow-hidden">
                      <div className="h-full bg-fuchsia-400 transition-all" style={{ width: progress.total ? `${(progress.completed / progress.total) * 100}%` : '0%' }} />
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-[11px]">
              {!progress && !report && (
                <div className="opacity-60 py-8 text-center">
                  Press <span className="text-fuchsia-200">▶ run scan</span> to probe every subsystem.
                  <br />
                  Runs in ~1–3 seconds. Nothing is persisted server-side.
                </div>
              )}
              {grouped.map(([category, items]) => (
                <div key={category}>
                  <div className="text-[9px] uppercase tracking-widest opacity-50 mb-1">{category}</div>
                  <div className="space-y-1">
                    {items.map((c) => (
                      <div key={c.id} className={`px-2 py-1.5 rounded border ${badge[c.status].bg} flex items-start gap-2`}>
                        <span className={`font-bold ${badge[c.status].color}`}>{badge[c.status].icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-white/95 truncate">{c.label}</span>
                            {c.durationMs != null && <span className="opacity-40 text-[9px] shrink-0">{c.durationMs}ms</span>}
                          </div>
                          {c.detail && <div className="opacity-70 text-[10px] break-words">{c.detail}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {report && report.runtimeIssues.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-widest opacity-50 mb-1">recent runtime issues ({report.runtimeIssues.length})</div>
                  <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
                    {report.runtimeIssues.slice(-20).reverse().map((i, idx) => (
                      <div key={idx} className="text-[10px] leading-tight border-l-2 border-red-400/40 pl-2 py-0.5">
                        <span className="opacity-40">{new Date(i.ts).toLocaleTimeString().slice(0, 8)} </span>
                        <span className="text-red-300">[{i.kind}]</span>{' '}
                        <span className="opacity-90 break-words">{i.message}</span>
                        {i.source && <span className="opacity-40"> @ {i.source}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {report && (
              <div className="px-4 py-2 border-t border-white/10 bg-white/[0.02] text-[10px] opacity-60">
                {report.route} · {new Date(report.startedAt).toLocaleString()} · {report.online ? 'online' : 'OFFLINE'}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ZoeGodModeScanPanel;
