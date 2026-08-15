import { useEffect, useState } from 'react';
import { Activity, Brain, Bug, ChevronDown, ChevronUp, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import MetacognitionMetricsPanel from '@/components/zoe-infinity/MetacognitionMetricsPanel';
import CotWiringStatusPanel from '@/components/zoe-infinity/CotWiringStatusPanel';
import {
  clearDiagnosticErrors,
  getDiagnostics,
  subscribeDiagnostics,
  type DiagnosticsState,
} from '@/utils/zoeDiagnosticsBus';

export type DiagTab = 'metrics' | 'wiring' | 'debug';

const STAGE_LABEL: Record<DiagnosticsState['stage'], string> = {
  idle: 'Idle',
  sending: 'Sending…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  done: 'Ready',
  error: 'Error',
};

const TABS: { id: DiagTab; label: string; icon: typeof Brain }[] = [
  { id: 'metrics', label: 'Metrics', icon: Brain },
  { id: 'wiring', label: 'Wiring', icon: Activity },
  { id: 'debug', label: 'Debug', icon: Bug },
];

interface Props {
  tab: DiagTab;
  onTabChange: (t: DiagTab) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  onHide: () => void;
  deepThinking: boolean;
}

/** One compact diagnostics strip for the orb: status line + optional detail panel. */
const ZoeDiagnosticsDrawer = ({ tab, onTabChange, expanded, onToggleExpanded, onHide, deepThinking }: Props) => {
  const [diag, setDiag] = useState<DiagnosticsState>(() => getDiagnostics());
  useEffect(() => subscribeDiagnostics(setDiag), []);

  const busy = diag.stage === 'sending' || diag.stage === 'thinking' || diag.stage === 'speaking';
  const tone =
    diag.stage === 'error' ? 'text-destructive' : busy ? 'text-cyan-300' : 'text-emerald-400';

  return (
    <div className="border-b border-primary/10 bg-background/70">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        {busy ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-cyan-300" />
        ) : (
          <Activity className={cn('h-3 w-3 shrink-0', tone)} />
        )}
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          aria-expanded={expanded}
        >
          <span className={cn('text-[11px] font-medium', tone)}>{STAGE_LABEL[diag.stage]}</span>
          <span className="truncate text-[10px] text-muted-foreground">
            {diag.route ? `via ${diag.route}` : deepThinking ? 'deep thinking on' : 'standard mode'}
            {diag.errors.length > 0 ? ` · ${diag.errors.length} err` : ''}
          </span>
        </button>
        <button
          type="button"
          onClick={onHide}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="Hide diagnostics"
          title="Hide diagnostics"
        >
          <EyeOff className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label={expanded ? 'Collapse diagnostics' : 'Expand diagnostics'}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-primary/10">
          <div className="flex items-center gap-1 px-2 pt-1.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                aria-pressed={tab === id}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]',
                  tab === id
                    ? 'border-primary/40 bg-primary/15 text-foreground'
                    : 'border-border/50 text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          <div className="max-h-[30vh] overflow-y-auto overscroll-contain p-2">
            {tab === 'metrics' && <MetacognitionMetricsPanel />}
            {tab === 'wiring' && (
              <div className="space-y-2">
                <ZoeMemoryStatusPanel />
                <CotWiringStatusPanel />
              </div>
            )}

            {tab === 'debug' && (
              <div className="space-y-2 text-[10px]">
                <div className="grid grid-cols-2 gap-1.5">
                  <Row label="Metrics fetch" value={diag.metricsFetch} />
                  <Row label="Metric rows" value={String(diag.metricsRows)} />
                  <Row label="CoT route" value={diag.route ?? '—'} />
                  <Row label="Send stage" value={diag.stage} />
                  <Row label="Deep thinking" value={deepThinking ? 'on' : 'off'} />
                  <Row label="Diagnostics" value={expanded ? 'expanded' : 'collapsed'} />
                </div>
                {diag.metricsError && (
                  <p className="rounded border border-destructive/40 bg-destructive/10 p-1.5 text-destructive">
                    metrics: {diag.metricsError}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Latest errors</span>
                  {diag.errors.length > 0 && (
                    <button type="button" onClick={clearDiagnosticErrors} className="text-muted-foreground underline">
                      clear
                    </button>
                  )}
                </div>
                {diag.errors.length === 0 ? (
                  <p className="text-muted-foreground">No errors recorded.</p>
                ) : (
                  diag.errors.map((e) => (
                    <p key={`${e.at}-${e.source}`} className="rounded border border-border/50 bg-card/30 p-1.5">
                      <span className="text-destructive">{e.source}</span>{' '}
                      <span className="text-muted-foreground">{new Date(e.at).toLocaleTimeString()}</span>
                      <br />
                      <span className="break-words">{e.message}</span>
                    </p>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded border border-border/50 bg-card/30 px-1.5 py-1">
    <p className="text-muted-foreground">{label}</p>
    <p className="truncate font-medium text-foreground">{value}</p>
  </div>
);

export default ZoeDiagnosticsDrawer;
