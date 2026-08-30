// @vitest-environment jsdom
// ═══════════════════════════════════════════════════════════════════════════════
// WEBGL CIRCUIT BREAKER
// Repeated 3D initialisation failures must trip the breaker, swap in the
// lightweight safe UI, survive a reload (per-tab), cool off, and be manually
// resettable — all without ever taking the surrounding shell down.
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

vi.mock('@/lib/enterpriseTelemetry', () => ({
  reportPlatformError: vi.fn(),
  flushPlatformErrors: vi.fn(),
}));
vi.mock('@/lib/versionCheck', () => ({
  recoverFromChunkError: vi.fn(),
  checkAppVersion: vi.fn(),
}));

const breaker = await import('@/lib/webglCircuitBreaker');
const { __resetCapabilityCache } = await import('@/components/3d/SafeCanvasWrapper');

/** jsdom has no GL: fake a capable, high-power device + visible viewport. */
const makeDeviceCapable = () => {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => ({ getExtension: () => null }) as unknown as RenderingContext,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true });
  Object.defineProperty(navigator, 'deviceMemory', { value: 8, configurable: true });
  __resetCapabilityCache();
};
const {
  canAttemptWebGL,
  getBreakerState,
  recordWebGLFailure,
  recordWebGLSuccess,
  resetWebGLBreaker,
  __resetAllBreakers,
  DEFAULT_BREAKER_CONFIG,
} = breaker;

const MODULE = '3d:test-scene';

beforeEach(() => {
  __resetAllBreakers();
  cleanup();
  vi.restoreAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  makeDeviceCapable();
});

describe('breaker state machine', () => {
  it('stays closed for a single isolated failure', () => {
    recordWebGLFailure(MODULE, new Error('context lost'));
    expect(getBreakerState(MODULE).state).toBe('closed');
    expect(canAttemptWebGL(MODULE)).toBe(true);
  });

  it('trips open at the failure threshold and blocks further attempts', () => {
    recordWebGLFailure(MODULE, new Error('context lost'));
    const snapshot = recordWebGLFailure(MODULE, new Error('context lost again'));
    expect(snapshot.state).toBe('open');
    expect(snapshot.failures).toBe(DEFAULT_BREAKER_CONFIG.threshold);
    expect(canAttemptWebGL(MODULE)).toBe(false);
  });

  it('expires stale failures outside the rolling window', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    recordWebGLFailure(MODULE);
    vi.spyOn(Date, 'now').mockReturnValue(now + DEFAULT_BREAKER_CONFIG.windowMs + 1);
    expect(getBreakerState(MODULE).state).toBe('closed');
    // A later single failure must not immediately trip on the stale count.
    expect(recordWebGLFailure(MODULE).state).toBe('closed');
  });

  it('moves to half-open after the cooldown and re-trips on the next failure', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    recordWebGLFailure(MODULE);
    recordWebGLFailure(MODULE);
    expect(getBreakerState(MODULE).state).toBe('open');

    vi.spyOn(Date, 'now').mockReturnValue(now + DEFAULT_BREAKER_CONFIG.cooldownMs + 1);
    expect(getBreakerState(MODULE).state).toBe('half-open');
    expect(canAttemptWebGL(MODULE)).toBe(true);

    recordWebGLFailure(MODULE);
    expect(getBreakerState(MODULE).state).toBe('open');
  });

  it('a success closes the breaker and clears history', () => {
    recordWebGLFailure(MODULE);
    recordWebGLFailure(MODULE);
    recordWebGLSuccess(MODULE);
    expect(getBreakerState(MODULE)).toEqual({ state: 'closed', failures: 0, openedAt: 0 });
  });

  it('isolates modules from each other', () => {
    recordWebGLFailure('3d:avatar');
    recordWebGLFailure('3d:avatar');
    expect(canAttemptWebGL('3d:avatar')).toBe(false);
    expect(canAttemptWebGL('3d:vehicle')).toBe(true);
  });

  it('persists an open breaker for the tab and supports a manual reset', () => {
    recordWebGLFailure(MODULE);
    recordWebGLFailure(MODULE);
    expect(sessionStorage.getItem('mmora.webgl.breaker.v1')).toContain(MODULE);
    resetWebGLBreaker(MODULE);
    expect(canAttemptWebGL(MODULE)).toBe(true);
  });

  it('survives corrupt persisted state without throwing', () => {
    sessionStorage.setItem('mmora.webgl.breaker.v1', '{not json');
    __resetAllBreakers.call(null);
    sessionStorage.setItem('mmora.webgl.breaker.v1', '{not json');
    expect(() => getBreakerState(MODULE)).not.toThrow();
    expect(canAttemptWebGL(MODULE)).toBe(true);
  });
});

describe('SafeCanvasWrapper fallback behaviour', () => {
  it('renders the lightweight safe UI with a retry action once the breaker is open', async () => {
    recordWebGLFailure(MODULE);
    recordWebGLFailure(MODULE);
    const { SafeCanvasWrapper } = await import('@/components/3d/SafeCanvasWrapper');

    render(
      <div>
        <span>shell stays alive</span>
        <SafeCanvasWrapper
          moduleName={MODULE}
          deferUntilVisible={false}
          load={async () => ({ default: () => <canvas data-testid="scene" /> })}
        />
      </div>,
    );

    expect(await screen.findByText(/3D preview turned off after repeated load errors/i)).toBeTruthy();
    expect(screen.getByTestId('webgl-retry')).toBeTruthy();
    expect(screen.queryByTestId('scene')).toBeNull();
    // The rest of the app is untouched — that is the whole point.
    expect(screen.getByText('shell stays alive')).toBeTruthy();
  });

  it('records a failure when the lazy 3D chunk fails to load', async () => {
    const { SafeCanvasWrapper } = await import('@/components/3d/SafeCanvasWrapper');
    render(
      <SafeCanvasWrapper
        moduleName="3d:chunk-fail"
        deferUntilVisible={false}
        load={() => Promise.reject(new Error('chunk 404'))}
      />,
    );
    await waitFor(() => expect(getBreakerState('3d:chunk-fail').failures).toBeGreaterThan(0));
    expect(getBreakerState('3d:chunk-fail').lastError).toBe('chunk 404');
  });

  it('does not attempt a scene load while the breaker is open', async () => {
    recordWebGLFailure('3d:no-load');
    recordWebGLFailure('3d:no-load');
    const load = vi.fn(async () => ({ default: () => <canvas /> }));
    const { SafeCanvasWrapper } = await import('@/components/3d/SafeCanvasWrapper');
    render(<SafeCanvasWrapper moduleName="3d:no-load" deferUntilVisible={false} load={load} />);
    await waitFor(() => expect(screen.getByTestId('webgl-retry')).toBeTruthy());
    expect(load).not.toHaveBeenCalled();
  });
});
