/**
 * Daily deep-root scan SUMMARY card.
 * Shows pass/fail counts, last-run timestamp, and key failure reasons
 * pulled from the rolling scan history. Also exposes a "Download last 24h"
 * JSON button that includes tier/banner states.
 */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Download, Clock } from 'lucide-react';
import { getDeepRootScanHistory, DeepRootScanResult } from '@/hooks/useDeepRootScanScheduler';
import { getLastHealthSnapshot } from '@/hooks/useProviderHealthScheduler';

export default function DeepRootScanSummaryCard() {
  const [history, setHistory] = useState<DeepRootScanResult[]>(() => getDeepRootScanHistory());

  useEffect(() => {
    const onScan = () => setHistory(getDeepRootScanHistory());
    window.addEventListener('zoe:deep-root-scan', onScan);
    return () => window.removeEventListener('zoe:deep-root-scan', onScan);
  }, []);

  const summary = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60_000;
    const last24 = history.filter(r => new Date(r.at).getTime() >= cutoff);
    const pass = last24.filter(r => r.ok).length;
    const fail = last24.filter(r => !r.ok).length;
    const reasons = last24.filter(r => !r.ok && r.notes).map(r => r.notes!).slice(0, 5);
    const last = history[history.length - 1];
    return { last24, pass, fail, reasons, last };
  }, [history]);

  const download24h = () => {
    const snap = getLastHealthSnapshot();
    const payload = {
      exportedAt: new Date().toISOString(),
      windowHours: 24,
      tierStateAtExport: snap?.summary ?? null,
      bannerState: (snap?.summary?.degradedTiers?.length ?? 0) > 0 || (snap?.summary?.missingKeyTiers?.length ?? 0) > 0 ? 'visible' : 'hidden',
      counts: { pass: summary.pass, fail: summary.fail, total: summary.last24.length },
      entries: summary.last24,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `zoe-deep-scan-24h-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Deep-root scan — daily summary (last 24h)</h3>
        <button
          onClick={download24h}
          disabled={summary.last24.length === 0}
          className="flex items-center gap-1 rounded-md bg-sky-600/40 px-2 py-1 text-[11px] hover:bg-sky-600/60 disabled:opacity-40"
        >
          <Download className="h-3 w-3" /> Download deep scan history (24h)
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="rounded bg-emerald-500/15 px-2 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Pass
          </div>
          <div className="mt-0.5 text-lg font-semibold">{summary.pass}</div>
        </div>
        <div className="rounded bg-rose-500/15 px-2 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-rose-300">
            <XCircle className="h-3.5 w-3.5" /> Fail
          </div>
          <div className="mt-0.5 text-lg font-semibold">{summary.fail}</div>
        </div>
        <div className="rounded bg-white/5 px-2 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-white/70">
            <Clock className="h-3.5 w-3.5" /> Last
          </div>
          <div className="mt-0.5 text-[10px] text-white/70">
            {summary.last ? new Date(summary.last.at).toLocaleString() : '—'}
          </div>
        </div>
      </div>
      {summary.reasons.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-semibold text-rose-300">Key failure reasons</p>
          <ul className="mt-1 space-y-0.5 text-[10px] text-white/60">
            {summary.reasons.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
        </div>
      )}
      {summary.last24.length === 0 && (
        <p className="mt-2 text-[11px] text-white/50">No scans in the last 24 hours yet.</p>
      )}
    </section>
  );
}
