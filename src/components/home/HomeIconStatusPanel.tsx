import React, { useCallback, useEffect, useState } from 'react';
import {
  ChecklistResult,
  clearHomeIconErrors,
  getHomeIconErrors,
  getHomeIconStatuses,
  runHomeIconChecklist,
  subscribeHomeIconStatus,
  type HomeIconStatus,
} from '@/lib/homeIconStatus';

const formatTime = (value: number | null) => {
  if (!value) return 'never';
  const delta = Date.now() - value;
  if (delta < 60_000) return `${Math.max(1, Math.round(delta / 1000))}s ago`;
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m ago`;
  return new Date(value).toLocaleString();
};

const stateLabel: Record<HomeIconStatus['state'], string> = {
  unknown: 'not wired',
  wired: 'wired',
  ok: 'ok',
  failed: 'failed',
};

/**
 * Diagnostics-only overlay. Rendered exclusively when the URL carries
 * `?iconstatus=1`, so the normal Home UI is untouched.
 */
const HomeIconStatusPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [, force] = useState(0);
  const [results, setResults] = useState<ChecklistResult[] | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => subscribeHomeIconStatus(() => force((n) => n + 1)), []);

  const runChecklist = useCallback(async () => {
    setRunning(true);
    try {
      setResults(await runHomeIconChecklist());
    } finally {
      setRunning(false);
    }
  }, []);

  const statuses = getHomeIconStatuses();
  const errors = getHomeIconErrors();
  const resultFor = (id: string) => results?.find((r) => r.id === id);

  return (
    <div className="fixed inset-x-2 bottom-2 top-16 z-[80] overflow-y-auto rounded-xl border border-border bg-background/95 p-3 text-foreground shadow-xl backdrop-blur md:inset-x-auto md:right-4 md:w-[420px]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Home icon status</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void runChecklist()}
            disabled={running}
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run checklist'}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close icon status panel"
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ×
          </button>
        </div>
      </div>

      <table className="w-full text-left text-[11px]">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1">Icon</th>
            <th className="py-1">Integration</th>
            <th className="py-1">Last success</th>
            <th className="py-1">Check</th>
          </tr>
        </thead>
        <tbody>
          {statuses.length === 0 && (
            <tr>
              <td colSpan={4} className="py-2 text-muted-foreground">
                No icons registered yet.
              </td>
            </tr>
          )}
          {statuses.map((status) => {
            const result = resultFor(status.id);
            return (
              <tr key={status.id} className="border-t border-border/50 align-top">
                <td className="py-1 pr-2">{status.label}</td>
                <td className="py-1 pr-2 font-mono">
                  {status.registered ? `${status.kind} · ${stateLabel[status.state]}` : 'missing'}
                </td>
                <td className="py-1 pr-2 font-mono">{formatTime(status.lastSuccessAt)}</td>
                <td className="py-1 font-mono">
                  {result ? (result.pass ? `pass (${result.durationMs}ms)` : 'fail') : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {results && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {results.filter((r) => r.pass).length}/{results.length} icon actions passed.
        </p>
      )}

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-semibold">Errors ({errors.length})</h3>
          {errors.length > 0 && (
            <button
              type="button"
              onClick={clearHomeIconErrors}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              clear
            </button>
          )}
        </div>
        {errors.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No icon errors captured.</p>
        ) : (
          <ul className="space-y-1">
            {errors.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="rounded-md bg-muted/50 p-2 text-[11px]">
                <span className="font-mono">{entry.id}</span> · {formatTime(entry.at)}
                <div className="text-muted-foreground">{entry.message}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HomeIconStatusPanel;
