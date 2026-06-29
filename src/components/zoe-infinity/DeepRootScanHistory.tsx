/**
 * Daily deep-root scan history viewer + "Run scan now" trigger.
 */
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Play, Download } from 'lucide-react';
import { getDeepRootScanHistory, runDeepRootScanNow, DeepRootScanResult } from '@/hooks/useDeepRootScanScheduler';

export default function DeepRootScanHistory() {
  const [history, setHistory] = useState<DeepRootScanResult[]>(() => getDeepRootScanHistory());
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const onScan = () => setHistory(getDeepRootScanHistory());
    window.addEventListener('zoe:deep-root-scan', onScan);
    return () => window.removeEventListener('zoe:deep-root-scan', onScan);
  }, []);

  const runNow = useCallback(async () => {
    setRunning(true);
    try { await runDeepRootScanNow(); } finally { setRunning(false); }
  }, []);

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `zoe-deep-root-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const recent = history.slice().reverse().slice(0, 10);

  return (
    <section className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Deep-root scan — daily run history</h3>
        <div className="flex gap-1.5">
          <button onClick={runNow} disabled={running}
            className="flex items-center gap-1 rounded-md bg-emerald-600/40 px-2 py-1 text-[11px] hover:bg-emerald-600/60 disabled:opacity-50">
            <Play className="h-3 w-3" /> {running ? 'Scanning…' : 'Run scan now'}
          </button>
          <button onClick={exportHistory} disabled={!history.length}
            className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20 disabled:opacity-40">
            <Download className="h-3 w-3" /> Export
          </button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-white/60">
        Auto-runs once per 24h. Records cascade ping, brain probe, and live signals.
      </p>
      {recent.length === 0 ? (
        <p className="mt-2 text-white/50">No scans yet — click <b>Run scan now</b>.</p>
      ) : (
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
          {recent.map(r => (
            <li key={r.at} className="rounded bg-black/30 px-2 py-1.5">
              <div className="flex items-center gap-2">
                {r.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-rose-400" />}
                <span className="font-mono text-[11px] text-white/70">{new Date(r.at).toLocaleString()}</span>
                {r.cascade && <span className="ml-auto text-[11px] text-white/60">T{r.cascade.selectedTier ?? '?'} · {r.cascade.latencyMs}ms</span>}
              </div>
              <p className="mt-0.5 text-[10px] text-white/50">
                healthy [{r.health?.healthy.join(',') ?? '–'}] · degraded [{r.health?.degraded.join(',') ?? '–'}] · missing [{r.health?.missing.join(',') ?? '–'}]
                {' · '}fusion {r.signals.fusion} · {r.signals.hormonesPhase}
                {r.signals.urgentCall && ' · URGENT'}
                {r.notes && ` · ${r.notes}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
