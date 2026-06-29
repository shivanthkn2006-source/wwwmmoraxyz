/**
 * Genesis protocol progress widget.
 * Shows ASK_NAME → … → COMPLETE with the active stage highlighted, and lets
 * the user restart from the last persisted step or fully reset.
 */
import { RotateCcw, StepBack } from 'lucide-react';
import { useZoeGenesisStateMachine, GENESIS_STAGES, GenesisStage } from '@/hooks/useZoeGenesisStateMachine';

export default function GenesisProgressWidget() {
  const { stage, persist, reset, loading } = useZoeGenesisStateMachine();
  const idx = GENESIS_STAGES.indexOf(stage);

  const restartFromPrevious = async () => {
    const prevStage: GenesisStage = GENESIS_STAGES[Math.max(0, idx - 1)];
    await persist({ stage: prevStage });
  };

  return (
    <section className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Genesis protocol progress</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={restartFromPrevious}
            disabled={loading || idx === 0}
            className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20 disabled:opacity-40"
          >
            <StepBack className="h-3 w-3" /> Restart last step
          </button>
          <button
            onClick={() => reset()}
            disabled={loading}
            className="flex items-center gap-1 rounded-md bg-rose-500/30 px-2 py-1 text-[11px] hover:bg-rose-500/50 disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" /> Full reset
          </button>
        </div>
      </div>
      <ol className="mt-3 flex flex-wrap items-center gap-1">
        {GENESIS_STAGES.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={s} className="flex items-center gap-1">
              <span
                className={`rounded-md px-2 py-1 font-mono text-[10px] ${
                  active ? 'bg-violet-500 text-white' : done ? 'bg-emerald-500/30 text-emerald-100' : 'bg-white/5 text-white/40'
                }`}
              >
                {s}
              </span>
              {i < GENESIS_STAGES.length - 1 && <span className="text-white/30">→</span>}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[11px] text-white/60">
        Current stage: <b className="text-white/90">{stage}</b> · step {idx + 1}/{GENESIS_STAGES.length}
      </p>
    </section>
  );
}
