// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import LiveViewBoundary, { LIVE_VIEW_FAILURE_EVENT } from '@/components/live/LiveViewBoundary';

vi.mock('@/utils/errorBoundaryLogger', () => ({ logError: vi.fn() }));
vi.mock('@/lib/runtimeCompatibility', () => ({ recordCompatEvent: vi.fn() }));

/** Simulates the camera layer throwing on denied / partially granted media. */
const Boom = ({ message }: { message: string }) => {
  throw Object.assign(new Error(message), { name: 'NotAllowedError' });
};

const HomeSurface = ({ children }: { children: React.ReactNode }) => (
  <div>
    <h1>M&apos;Mora Home</h1>
    {children}
  </div>
);

describe('LiveViewBoundary', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    delete (window as unknown as { __mmoraLiveViewFailures?: unknown }).__mmoraLiveViewFailures;
  });

  afterEach(() => {
    cleanup();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('renders children when Live mounts successfully', () => {
    render(
      <LiveViewBoundary onClose={vi.fn()}>
        <div>live camera feed</div>
      </LiveViewBoundary>,
    );
    expect(screen.getByText('live camera feed')).toBeInTheDocument();
  });

  it('shows the fallback UI without unmounting the home surface when permissions are denied', () => {
    render(
      <HomeSurface>
        <LiveViewBoundary onClose={vi.fn()}>
          <Boom message="Permission denied by user" />
        </LiveViewBoundary>
      </HomeSurface>,
    );

    expect(screen.getByText("M'Mora Home")).toBeInTheDocument();
    const dialog = screen.getByRole('alertdialog', { name: /live stream unavailable/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/live could not start/i)).toBeInTheDocument();
  });

  it('records a structured failure entry and dispatches the diagnostics event', () => {
    const onFailure = vi.fn();
    window.addEventListener(LIVE_VIEW_FAILURE_EVENT, onFailure);

    render(
      <LiveViewBoundary onClose={vi.fn()}>
        <Boom message="mic granted, camera blocked" />
      </LiveViewBoundary>,
    );

    window.removeEventListener(LIVE_VIEW_FAILURE_EVENT, onFailure);
    expect(onFailure).toHaveBeenCalledTimes(1);

    const failures = (window as unknown as { __mmoraLiveViewFailures?: Array<{ scope: string; message: string; homePageRendered: boolean }> })
      .__mmoraLiveViewFailures;
    expect(failures).toHaveLength(1);
    expect(failures?.[0].scope).toBe('live-stream-view');
    expect(failures?.[0].message).toContain('camera blocked');
    expect(failures?.[0].homePageRendered).toBe(true);
  });

  it('exposes keyboard-reachable controls, focusing Close live by default', () => {
    render(
      <LiveViewBoundary onClose={vi.fn()}>
        <Boom message="denied" />
      </LiveViewBoundary>,
    );

    const retry = screen.getByRole('button', { name: /try again/i });
    const close = screen.getByRole('button', { name: /close live/i });

    expect(close).toHaveFocus();
    // Both controls are natively focusable buttons in DOM order retry -> close.
    retry.focus();
    expect(retry).toHaveFocus();
    close.focus();
    expect(close).toHaveFocus();
  });

  it('calls onClose from the Close live button, Enter and Space keys', () => {
    const onClose = vi.fn();
    render(
      <LiveViewBoundary onClose={onClose}>
        <Boom message="denied" />
      </LiveViewBoundary>,
    );

    const close = screen.getByRole('button', { name: /close live/i });
    fireEvent.click(close);
    fireEvent.keyDown(close, { key: 'Enter' });
    fireEvent.click(close); // Enter/Space on a native button produces a click
    expect(onClose).toHaveBeenCalled();
  });

  it('closes Live when Escape is pressed while the fallback is visible', () => {
    const onClose = vi.fn();
    render(
      <LiveViewBoundary onClose={onClose}>
        <Boom message="denied" />
      </LiveViewBoundary>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('remounts the Live subtree when Try again is pressed', () => {
    let shouldThrow = true;
    const Flaky = () => {
      if (shouldThrow) throw new Error('camera busy');
      return <div>live camera feed</div>;
    };

    render(
      <LiveViewBoundary onClose={vi.fn()}>
        <Flaky />
      </LiveViewBoundary>,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('live camera feed')).toBeInTheDocument();
  });
});
