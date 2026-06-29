/**
 * Genesis Memory Inspector — surfaces the live contents of zoe_genesis_memory
 * (with localStorage fallback) and highlights which fields are still missing
 * before the IDENTIFY_USER stage can complete.
 */
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useZoeGenesisStateMachine, GENESIS_STAGES } from '@/hooks/useZoeGenesisStateMachine';

const REQUIRED_BEFORE_IDENTIFY: Array<{ key: string; label: string }> = [
  { key: 'name', label: 'Real name' },
  { key: 'age', label: 'Age' },
  { key: 'location', label: 'Location' },
];

export default function GenesisInspectorPanel() {
  const { memory, stage, loading } = useZoeGenesisStateMachine();
  const idx = GENESIS_STAGES.indexOf(stage);
  const beforeIdentify = idx < GENESIS_STAGES.indexOf('IDENTIFY_USER');

  const missing = REQUIRED_BEFORE_IDENTIFY.filter(f => {
    const v = (memory as any)[f.key];
    return v == null || v === '' || (typeof v === 'object' && Object.keys(v).length === 0);
  });

  return (
    <section className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs">
      <h3 className="text-sm font-semibold">Genesis memory inspector</h3>
      <p className="mt-0.5 text-[11px] text-white/60">
        Live view of <code className="font-mono">zoe_genesis_memory</code> + missing-field gating before IDENTIFY_USER.
      </p>
      {loading ? (
        <p className="mt-2 text-white/50">Loading…</p>
      ) : (
        <>
          <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {[
              ['stage', memory.stage],
              ['name', memory.name],
              ['nickname', memory.nickname],
              ['age', memory.age],
              ['dob', memory.dob],
              ['location', memory.location ? JSON.stringify(memory.location) : null],
              ['life_stage', memory.life_stage],
              ['zoe_name', memory.zoe_name],
              ['zoe_gender', memory.zoe_gender],
              ['completed_at', memory.completed_at],
            ].map(([k, v]) => (
              <li key={String(k)} className="flex items-center gap-2 rounded bg-black/30 px-2 py-1">
                {v ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                <span className="font-mono text-[11px] text-white/60">{String(k)}</span>
                <span className="ml-auto truncate text-[11px] text-white/80">{v ? String(v) : '—'}</span>
              </li>
            ))}
          </ul>

          {beforeIdentify && missing.length > 0 && (
            <div className="mt-2 rounded border border-amber-400/40 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100">
              <b>Missing before IDENTIFY_USER:</b> {missing.map(m => m.label).join(' · ')}
            </div>
          )}
          {beforeIdentify && missing.length === 0 && (
            <div className="mt-2 rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-200">
              All required fields captured — ready to advance to IDENTIFY_USER.
            </div>
          )}
        </>
      )}
    </section>
  );
}
