import React from 'react';
import { logError } from '@/utils/errorBoundaryLogger';
import { recordCompatEvent } from '@/lib/runtimeCompatibility';

export interface LiveViewFailure {
  scope: 'live-stream-view';
  message: string;
  stack?: string;
  componentStack?: string;
  homePageRendered: true;
  at: string;
}

export const LIVE_VIEW_FAILURE_EVENT = 'mmora:live-view-failure';

interface Props {
  children: React.ReactNode;
  onClose: () => void;
}

interface State {
  hasError: boolean;
  message: string;
  attempt: number;
}

/**
 * Isolates M'Mora Live. If the camera layer, a lazy chunk, or any Live child
 * throws (denied/partial media permissions, missing hardware, network fetch
 * failures), HomePage keeps rendering and the user gets an actionable,
 * keyboard-reachable fallback instead of a blank screen.
 */
export default class LiveViewBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '', attempt: 0 };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { hasError: true, message: (error as Error)?.message ?? String(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    const err = error as Error | undefined;
    const entry: LiveViewFailure = {
      scope: 'live-stream-view',
      message: err?.message ?? String(error),
      stack: err?.stack,
      componentStack: info?.componentStack ?? undefined,
      homePageRendered: true,
      at: new Date().toISOString(),
    };

    console.warn('[Live][boundary]', JSON.stringify(entry));
    logError('LiveViewBoundary', entry.message, 'medium', entry.stack);
    recordCompatEvent('live-stream', 'boundary-caught', 'failed', entry.message);

    try {
      const w = window as unknown as { __mmoraLiveViewFailures?: LiveViewFailure[] };
      w.__mmoraLiveViewFailures = [...(w.__mmoraLiveViewFailures ?? []), entry].slice(-20);
      window.dispatchEvent(new CustomEvent(LIVE_VIEW_FAILURE_EVENT, { detail: entry }));
    } catch {
      /* diagnostics must never throw */
    }
  }

  private onKeyDown = (event: KeyboardEvent) => {
    // The fallback replaces Live's own Escape handler — keep the exit reachable.
    if (event.key === 'Escape' && this.state.hasError) this.props.onClose();
  };

  componentDidMount() {
    window.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown);
  }

  private retry = () => {
    this.setState((prev) => ({ hasError: false, message: '', attempt: prev.attempt + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-3 bg-black/95 px-8 text-center"
          role="alertdialog"
          aria-modal="true"
          aria-label="Live stream unavailable"
          style={{ height: '100dvh' }}
        >
          <p className="text-base font-semibold text-white">Live could not start</p>
          <p className="max-w-xs text-sm leading-relaxed text-white/70">
            Something interrupted the live view on this device. Your feed is still running behind
            this screen.
          </p>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={this.retry}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.props.onClose}
              autoFocus
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Close live
            </button>
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  }
}
