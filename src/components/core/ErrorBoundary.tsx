// ═══════════════════════════════════════════════════════════════════════════════
// ENTERPRISE MODULE ISOLATION BOUNDARY
// A crash inside one agent module must never take down the platform shell.
// Adds: server telemetry, chunk-error recovery, reset keys, retry budget.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportPlatformError, type ErrorSeverity } from '@/lib/enterpriseTelemetry';
import { recoverFromChunkError } from '@/lib/versionCheck';

interface Props {
  children?: ReactNode;
  /** Logical module name, e.g. "agent:dhf-viewer". Used for grouping in telemetry. */
  moduleName?: string;
  severity?: ErrorSeverity;
  /** Custom fallback. Receives the error and a reset callback when a function. */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Changing any value here resets the boundary (e.g. route pathname). */
  resetKeys?: unknown[];
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorMsg: string | null;
  retries: number;
}

const MAX_AUTO_RETRIES = 2;

const isChunkFailure = (message: string): boolean => {
  const m = message.toLowerCase();
  return (
    m.includes('importing a module script failed') ||
    m.includes('failed to fetch dynamically imported module') ||
    m.includes('chunkloaderror') ||
    m.includes('loading chunk')
  );
};

export class AppErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null, errorMsg: null, retries: 0 };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorMsg: error.message };
  }

  public componentDidUpdate(prev: Props) {
    if (!this.state.hasError) return;
    const a = prev.resetKeys ?? [];
    const b = this.props.resetKeys ?? [];
    if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
      this.reset();
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const moduleName = this.props.moduleName ?? 'app-shell';
    console.error(`[mmora core crash] ${moduleName}:`, error, errorInfo);

    reportPlatformError({
      errorType: 'ReactErrorBoundary',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack ?? undefined,
      severity: this.props.severity ?? 'high',
      source: moduleName,
      metadata: { retries: this.state.retries },
    });

    this.props.onError?.(error, errorInfo);

    // Stale-deploy chunk failures self-heal once; VR routes opt out to avoid loops.
    const onVrRoute =
      typeof window !== 'undefined' && window.location.pathname.startsWith('/zoe-omega');
    if (isChunkFailure(error.message) && !onVrRoute && this.state.retries < MAX_AUTO_RETRIES) {
      recoverFromChunkError();
    }
  }

  private reset = () => {
    this.setState((s) => ({
      hasError: false,
      error: null,
      errorMsg: null,
      retries: s.retries + 1,
    }));
  };

  public render() {
    if (!this.state.hasError) return this.props.children;

    const { fallback } = this.props;
    if (typeof fallback === 'function') {
      return fallback(this.state.error ?? new Error(this.state.errorMsg ?? 'Unknown'), this.reset);
    }
    if (fallback) return fallback;

    return (
      <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          Module offline. Rebooting agent logic…
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {this.state.errorMsg || 'An unexpected error occurred in this module.'}
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          Retry module
        </button>
      </div>
    );
  }
}

export default AppErrorBoundary;
