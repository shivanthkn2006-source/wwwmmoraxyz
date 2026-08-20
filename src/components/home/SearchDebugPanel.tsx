import React from 'react';
import type { AmbientSearchDebug } from '@/core/ports/useAmbientSearch';

/**
 * Developer-only overlay for the ambient search orchestrator.
 * Rendered as a fixed-position island so it never affects the results UI layout.
 * Hidden entirely in production builds unless ?searchdebug=1 is present.
 */
export default function SearchDebugPanel({ debug }: { debug: AmbientSearchDebug | null }) {
  const [open, setOpen] = React.useState(false);

  const enabled = React.useMemo(() => {
    if (import.meta.env.DEV) return true;
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('searchdebug') === '1';
  }, []);

  if (!enabled || !debug) return null;

  const timings = debug.serverTimings || {};
  const timingKeys = Object.keys(timings);
  const nodeTypeKeys = Object.keys(debug.nodeTypes);

  return (
    <div className="pointer-events-auto fixed bottom-3 left-3 z-[70] max-w-[86vw] font-mono text-[10px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-border/60 bg-background/85 px-2 py-1 text-[10px] text-muted-foreground shadow-sm backdrop-blur"
      >
        search debug {open ? '▾' : '▸'} · {debug.roundTripMs}ms · {debug.nodesEvaluated} nodes
      </button>

      {open && (
        <div className="mt-1 w-[340px] max-w-[86vw] space-y-1 overflow-auto rounded-md border border-border/60 bg-background/95 p-2 text-muted-foreground shadow-lg backdrop-blur">
          <div className="max-h-[46vh] space-y-1 overflow-auto">
            <div className="text-foreground/90">requestId: {debug.requestId}</div>
            <div>query: {debug.query}</div>
            <div>intent: {debug.intent ?? '—'}</div>
            <div>client roundTrip: {debug.roundTripMs}ms</div>
            <div>
              server timings:{' '}
              {timingKeys.length
                ? timingKeys.map((k) => `${k}=${timings[k]}ms`).join(' · ')
                : '—'}
            </div>
            <div>
              node types:{' '}
              {nodeTypeKeys.length
                ? nodeTypeKeys.map((k) => `${k}×${debug.nodeTypes[k]}`).join(' · ')
                : 'none retrieved'}
            </div>
            {debug.degraded ? <div>degraded: {JSON.stringify(debug.degraded)}</div> : null}
            {debug.error ? <div className="text-destructive">error: {debug.error}</div> : null}
            <div className="pt-1 text-foreground/80">zoe_dispatch:</div>
            <pre className="whitespace-pre-wrap break-all rounded bg-muted/60 p-1 text-[10px] leading-snug">
              {debug.dispatchBlock ?? 'none emitted'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
