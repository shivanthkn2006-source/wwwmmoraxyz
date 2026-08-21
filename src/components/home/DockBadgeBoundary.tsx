import React, { createContext, useContext } from 'react';

/**
 * Error boundary for the Home dock badge layer.
 * If anything in the badge rendering path throws, we disable badges (via context)
 * and re-mount the dock so the HomePage never goes blank because of a count.
 */
const DockBadgesEnabledContext = createContext(true);

export const useDockBadgesEnabled = () => useContext(DockBadgesEnabledContext);

interface State {
  hasError: boolean;
}

export default class DockBadgeBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[HomeDock] badge render failed — badges disabled for this session', error);
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
