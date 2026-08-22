import React, { createContext, useContext } from 'react';
import { logError } from '@/utils/errorBoundaryLogger';
import { recordCompatEvent } from '@/lib/runtimeCompatibility';

/**
 * Error boundary for the Home dock badge layer.
 * If anything in the badge rendering path throws, we disable badges (via context)
 * and re-mount the dock so the HomePage never goes blank because of a count.
 */
const DockBadgesEnabledContext = createContext(true);

export const useDockBadgesEnabled = () => useContext(DockBadgesEnabledContext);

/** Structured record of the last badge failure, readable from tests/diagnostics. */
export interface DockBadgeFailure {
  scope: 'home-dock-badges';
  message: string;
  stack?: string;
  componentStack?: string;
  badgesDisabled: true;
  homePageRendered: true;
  at: string;
}

export const DOCK_BADGE_FAILURE_EVENT = 'mmora:dock-badge-failure';

interface State {
  hasError: boolean;
}

export default class DockBadgeBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    const err = error as Error | undefined;
    const entry: DockBadgeFailure = {
      scope: 'home-dock-badges',
      message: err?.message ?? String(error),
      stack: err?.stack,
      componentStack: info?.componentStack ?? undefined,
      badgesDisabled: true,
      homePageRendered: true,
      at: new Date().toISOString(),
    };

    // Structured console line (single JSON payload — easy to assert in e2e).
    console.warn('[HomeDock][badge-boundary]', JSON.stringify(entry));

    // Central error log + compatibility timeline.
    logError('DockBadgeBoundary', entry.message, 'medium', entry.stack);
    recordCompatEvent('dock-badge-boundary', 'caught-error', 'degraded', entry.message);
    recordCompatEvent('dock-badges', 'badges-disabled', 'degraded', 'boundary fallback active');

    try {
      const w = window as unknown as { __mmoraDockBadgeFailures?: DockBadgeFailure[] };
      w.__mmoraDockBadgeFailures = [...(w.__mmoraDockBadgeFailures ?? []), entry].slice(-20);
      window.dispatchEvent(new CustomEvent(DOCK_BADGE_FAILURE_EVENT, { detail: entry }));
    } catch {
      /* diagnostics must never throw */
    }
  }

  render() {
    return (
      <DockBadgesEnabledContext.Provider value={!this.state.hasError}>
        <React.Fragment key={this.state.hasError ? 'dock-no-badges' : 'dock'}>
          {this.props.children}
        </React.Fragment>
      </DockBadgesEnabledContext.Provider>
    );
  }
}
