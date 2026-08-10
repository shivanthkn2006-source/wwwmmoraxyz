/**
 * zoeDiagnosticsBus — tiny store for orb diagnostics: metrics fetch state,
 * CoT route in use, send/loading stage, and the latest errors.
 */

export type SendStage = 'idle' | 'sending' | 'thinking' | 'speaking' | 'done' | 'error';

export interface DiagnosticsState {
  metricsFetch: 'idle' | 'loading' | 'ok' | 'error';
  metricsError: string | null;
  metricsRows: number;
  metricsAt: number | null;
  route: string | null;
  stage: SendStage;
  stageAt: number | null;
  errors: { at: number; source: string; message: string }[];
}

const state: DiagnosticsState = {
  metricsFetch: 'idle',
  metricsError: null,
  metricsRows: 0,
  metricsAt: null,
  route: null,
  stage: 'idle',
  stageAt: null,
  errors: [],
};

type Listener = (s: DiagnosticsState) => void;
const listeners = new Set<Listener>();

const emit = () => {
  const snap = getDiagnostics();
  listeners.forEach((l) => {
    try {
      l(snap);
    } catch {
      /* never break the pipeline */
    }
  });
};

export const getDiagnostics = (): DiagnosticsState => ({ ...state, errors: [...state.errors] });

export const subscribeDiagnostics = (l: Listener): (() => void) => {
  listeners.add(l);
  l(getDiagnostics());
  return () => {
    listeners.delete(l);
  };
};

export const setSendStage = (stage: SendStage, route?: string | null): void => {
  state.stage = stage;
  state.stageAt = Date.now();
  if (route !== undefined) state.route = route;
  emit();
};

export const setMetricsFetch = (
  status: DiagnosticsState['metricsFetch'],
  info?: { rows?: number; error?: unknown },
): void => {
  state.metricsFetch = status;
  state.metricsAt = Date.now();
  if (info?.rows != null) state.metricsRows = info.rows;
  if (status === 'error') {
    const msg = toMessage(info?.error);
    state.metricsError = msg;
    pushError('metrics', msg);
  } else if (status === 'ok') {
    state.metricsError = null;
  }
  emit();
};

const toMessage = (err: unknown): string =>
  err instanceof Error ? err.message : typeof err === 'string' ? err : err ? String(err) : 'Unknown error';

export const reportDiagnosticError = (source: string, err: unknown): void => {
  pushError(source, toMessage(err));
  emit();
};

const pushError = (source: string, message: string) => {
  state.errors = [{ at: Date.now(), source, message }, ...state.errors].slice(0, 8);
};

export const clearDiagnosticErrors = (): void => {
  state.errors = [];
  emit();
};
