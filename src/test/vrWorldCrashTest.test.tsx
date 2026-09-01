// @vitest-environment jsdom
/**
 * 3D Crash Test — forcing a throw inside the <VROMEGAWorld> subtree must NOT
 * white-screen the app. The VR error boundary has to catch it, keep the
 * surrounding shell mounted, and render the recovery fallback.
 */
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VRErrorBoundary } from '@/pages/ZoeOmegaPage';

const Exploding: React.FC = () => {
  throw new Error('VROMEGAWorld: forced shader compile failure');
};

let errSpy: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterAll(() => errSpy.mockRestore());

describe('3D crash test — VR world error isolation', () => {
  it('renders the fallback instead of a blank screen and keeps the shell alive', () => {
    render(
      <div>
        <div data-testid="app-shell">shell</div>
        <VRErrorBoundary onReset={() => undefined}>
          <Exploding />
        </VRErrorBoundary>
      </div>,
    );

    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByText(/VR World Initialization Issue/i)).toBeInTheDocument();
    expect(document.body.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it('recovers to healthy children after the user retries', () => {
    let shouldThrow = true;
    const Flaky: React.FC = () => {
      if (shouldThrow) throw new Error('VROMEGAWorld: transient GL context loss');
      return <div data-testid="vr-world">world online</div>;
    };

    render(
      <VRErrorBoundary onReset={() => undefined}>
        <Flaky />
      </VRErrorBoundary>,
    );

    expect(screen.getByText(/VR World Initialization Issue/i)).toBeInTheDocument();

    shouldThrow = false;
    const retry = screen.getAllByRole('button').find((b) => /try again|retry/i.test(b.textContent ?? ''));
    expect(retry).toBeTruthy();
    fireEvent.click(retry!);

    expect(screen.getByTestId('vr-world')).toBeInTheDocument();
  });
});
