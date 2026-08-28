// Verifies module isolation: a crashing child reports to enterpriseTelemetry
// and the surrounding app keeps rendering.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const reportPlatformError = vi.fn();

vi.mock('@/lib/enterpriseTelemetry', () => ({
  reportPlatformError: (...args: unknown[]) => reportPlatformError(...args),
  flushPlatformErrors: vi.fn(),
}));

vi.mock('@/lib/versionCheck', () => ({
  recoverFromChunkError: vi.fn(),
  checkAppVersion: vi.fn(),
}));

// Imported after the mocks so the boundary picks up the mocked sink.
const { AppErrorBoundary } = await import('@/components/core/ErrorBoundary');

const Boom = ({ message = 'agent exploded' }: { message?: string }) => {
  throw new Error(message);
};

const Sibling = () => <div>shell-alive</div>;

describe('AppErrorBoundary', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    reportPlatformError.mockClear();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('reports the crash to enterpriseTelemetry with the module name', () => {
    render(
      <AppErrorBoundary moduleName="agent:test-module" severity="high">
        <Boom />
      </AppErrorBoundary>,
    );

    expect(reportPlatformError).toHaveBeenCalledTimes(1);
    const payload = reportPlatformError.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.errorType).toBe('ReactErrorBoundary');
    expect(payload.message).toBe('agent exploded');
    expect(payload.source).toBe('agent:test-module');
    expect(payload.severity).toBe('high');
    expect(String(payload.componentStack ?? '')).toContain('Boom');
  });

  it('keeps the rest of the app mounted when one module fails', () => {
    render(
      <div>
        <AppErrorBoundary moduleName="agent:isolated">
          <Boom />
        </AppErrorBoundary>
        <Sibling />
      </div>,
    );

    expect(screen.getByText('shell-alive')).toBeTruthy();
    expect(screen.getByText(/Module offline/i)).toBeTruthy();
  });

  it('renders a custom fallback and can be reset by the user', () => {
    const Flaky = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) throw new Error('transient');
      return <div>recovered</div>;
    };

    const Harness = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      return (
        <AppErrorBoundary
          moduleName="agent:flaky"
          fallback={(error, reset) => (
            <button
              type="button"
              onClick={() => {
                setShouldThrow(false);
                reset();
              }}
            >
              retry {error.message}
            </button>
          )}
        >
          <Flaky shouldThrow={shouldThrow} />
        </AppErrorBoundary>
      );
    };

    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /retry transient/i }));
    expect(screen.getByText('recovered')).toBeTruthy();
  });

  it('resets automatically when the reset keys change (route navigation)', () => {
    const Harness = () => {
      const [route, setRoute] = React.useState('/a');
      return (
        <div>
          <button type="button" onClick={() => setRoute('/b')}>
            navigate
          </button>
          <AppErrorBoundary moduleName={`route:${route}`} resetKeys={[route]}>
            {route === '/a' ? <Boom message="route a broke" /> : <div>route-b-ok</div>}
          </AppErrorBoundary>
        </div>
      );
    };

    render(<Harness />);
    expect(screen.getByText(/Module offline/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'navigate' }));
    expect(screen.getByText('route-b-ok')).toBeTruthy();
  });
});
