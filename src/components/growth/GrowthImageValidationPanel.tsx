/**
 * Debug panel for Growth card image validation.
 *
 * Read-only view of the structured validation log plus the two runtime knobs
 * (retry count and prompt strictness) so match rate can be tuned without a
 * code change. Standalone: it renders nothing into the feed and touches no
 * growth data.
 */
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_VALIDATION_CONFIG,
  clearValidationCache,
  clearValidationLog,
  getValidationConfig,
  setValidationConfig,
  subscribeValidationLog,
  type GrowthImageValidationConfig,
  type PromptStrictness,
  type ValidationLogEntry,
} from '@/lib/growthImageValidation';

const STRICTNESS: PromptStrictness[] = ['lenient', 'balanced', 'strict'];

const outcomeTone: Record<ValidationLogEntry['outcome'], string> = {
  match: 'text-emerald-400',
  cached: 'text-sky-400',
  mismatch: 'text-amber-400',
  fallback: 'text-muted-foreground',
  error: 'text-destructive',
};

export const GrowthImageValidationPanel: React.FC = () => {
  const [entries, setEntries] = useState<ValidationLogEntry[]>([]);
  const [config, setConfig] = useState<GrowthImageValidationConfig>(DEFAULT_VALIDATION_CONFIG);

  useEffect(() => {
    setConfig(getValidationConfig());
    return subscribeValidationLog(setEntries);
  }, []);

  const update = (patch: Partial<GrowthImageValidationConfig>) => setConfig(setValidationConfig(patch));

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-4" aria-label="Growth image validation">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Growth image validation</h2>
        <p className="text-xs text-muted-foreground">
          Every card illustration is checked against the card text. Tune the retries and strictness here.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-2 text-muted-foreground">
          Retries
          <input
            type="number"
            min={0}
            max={3}
            value={config.retries}
            aria-label="Validation retries"
            onChange={(e) => update({ retries: Number(e.target.value) })}
            className="w-16 rounded-md border border-border bg-background px-2 py-1 text-foreground"
          />
        </label>

        <label className="flex items-center gap-2 text-muted-foreground">
          Strictness
          <select
            value={config.strictness}
            aria-label="Prompt strictness"
            onChange={(e) => update({ strictness: e.target.value as PromptStrictness })}
            className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          >
            {STRICTNESS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-muted-foreground">
          <input
            type="checkbox"
            checked={config.enabled}
            aria-label="Validation enabled"
            onChange={(e) => update({ enabled: e.target.checked })}
          />
          Enabled
        </label>

        <Button size="sm" variant="outline" onClick={() => { clearValidationCache(); clearValidationLog(); }}>
          Clear cache &amp; log
        </Button>
      </div>

      <ul className="space-y-2 max-h-80 overflow-y-auto">
        {entries.length === 0 && (
          <li className="text-xs text-muted-foreground">No validations recorded yet.</li>
        )}
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-lg border border-border/60 bg-background/60 p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground truncate">{entry.title}</span>
              <span className={outcomeTone[entry.outcome]}>{entry.outcome}</span>
            </div>
            <p className="text-muted-foreground">
              subject: {entry.person ?? 'no named person'} · {entry.category} · attempt {entry.attempt}
              {entry.cached ? ' · cached' : ''}
            </p>
            {entry.reason && <p className="text-muted-foreground/80 mt-1">{entry.reason}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default GrowthImageValidationPanel;
