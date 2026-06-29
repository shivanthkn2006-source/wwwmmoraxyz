/**
 * "Today missing prompts" widget.
 * Counts which Genesis stages and which scan-pipeline stages were skipped
 * across today's deep-root scan runs.
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getDeepRootScanHistory, DeepRootScanResult } from '@/hooks/useDeepRootScanScheduler';
import { GENESIS_STAGES } from '@/hooks/useZoeGenesisStateMachine';
import { supabase } from '@/integrations/supabase/client';

interface MissingReport {
  scanStagesSkipped: string[];          // health | cascade | signals
  totalScans: number;
  genesisStagesPending: string[];       // ASK_AGE, ASK_LOCATION, etc.
  totalMissing: number;
}

export default function MissingPromptsWidget() {
  const [history, setHistory] = useState<DeepRootScanResult[]>(() => getDeepRootScanHistory());
  const [genesisStage, setGenesisStage] = useState<string | null>(null);

  useEffect(() => {
    const onScan = () => setHistory(getDeepRootScanHistory());
    window.addEventListener('zoe:deep-root-scan', onScan);
    return () => window.removeEventListener('zoe:deep-root-scan', onScan);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('zoe_genesis_memory' as any).select('stage').limit(1).maybeSingle();
        setGenesisStage((data as any)?.stage ?? GENESIS_STAGES[0]);
      } catch { setGenesisStage(GENESIS_STAGES[0]); }
    })();
  }, []);

  const report: MissingReport = useMemo(() => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const today = history.filter(r => new Date(r.at).getTime() >= startOfDay.getTime());
    const skipped = new Set<string>();
    for (const r of today) {
      if (!r.health) skipped.add('health-ping');
      if (!r.cascade) skipped.add('cascade-probe');
      if (!r.signals) skipped.add('runtime-signals');
    }
    const idx = genesisStage ? GENESIS_STAGES.indexOf(genesisStage as any) : 0;
    const pending = idx >= 0 ? GENESIS_STAGES.slice(idx + 1).filter(s => s !== 'COMPLETE') : [];
    return {
      scanStagesSkipped: Array.from(skipped),
      totalScans: today.length,
      genesisStagesPending: pending,
      totalMissing: skipped.size + pending.length,
    };
  }, [history, genesisStage]);

  return (
    <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-300" />
        <h3 className="text-sm font-semibold">Today — missing prompts</h3>
        <span className="ml-auto rounded bg-amber-500/30 px-2 py-0.5 text-[11px] font-semibold">
          {report.totalMissing} missing
        </span>
      </div>
      <p className="mt-1 text-[11px] text-white/60">
        {report.totalScans} scan{report.totalScans === 1 ? '' : 's'} today · current Genesis stage: <b>{genesisStage ?? '—'}</b>
      </p>

      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold text-amber-200">Skipped scan stages</p>
          {report.scanStagesSkipped.length === 0 ? (
            <p className="text-[10px] text-white/50">None — all scan stages executed.</p>
          ) : (
            <ul className="mt-0.5 space-y-0.5 text-[10px] text-white/70">
              {report.scanStagesSkipped.map(s => <li key={s}>• {s}</li>)}
            </ul>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold text-amber-200">Pending Genesis stages</p>
          {report.genesisStagesPending.length === 0 ? (
            <p className="text-[10px] text-white/50">All Genesis stages complete.</p>
          ) : (
            <ul className="mt-0.5 space-y-0.5 text-[10px] text-white/70">
              {report.genesisStagesPending.map(s => <li key={s}>• {s}</li>)}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
