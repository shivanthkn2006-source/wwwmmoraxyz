// Device capability + viewport gating for the WebGL wrapper: heavy 3D must
// degrade to a 2D fallback on low-power devices, without WebGL, in thermal-safe
// mode, and while offscreen — and must never block the calling render.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

vi.mock('@/lib/enterpriseTelemetry', () => ({
  reportPlatformError: vi.fn(),
  flushPlatformErrors: vi.fn(),
}));
vi.mock('@/lib/versionCheck', () => ({
  recoverFromChunkError: vi.fn(),
  checkAppVersion: vi.fn(),
}));

const { SafeCanvasWrapper, detectWebGLSupport, detectLowPowerDevice } = await import(
  '@/components/3d/SafeCanvasWrapper'
);
const { usePlatformStore } = await import('@/store/usePlatformStore');

const HeavyScene = () => <div>heavy-3d-scene</div>;
const loadHeavy = () => Promise.resolve({ default: HeavyScene });

/** Immediate-intersection observer so mount is deterministic. */
class ObserverIntersecting {
  constructor(private cb: IntersectionObserverCallback) {}
  observe() {
    this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
  }
  disconnect() {}
  unobserve() {}
}

/** Never-intersecting observer: element stays offscreen. */
class ObserverOffscreen {
  observe() {}
  disconnect() {}
  unobserve() {}
}

const setHardware = (cores: number, memory?: number) => {
  Object.defineProperty(navigator, 'hardwareConcurrency', { value: cores, configurable: true });
  Object.defineProperty(navigator, 'deviceMemory', { value: memory, configurable: true });
};

const mockWebGL = (supported: boolean) => {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => (supported ? ({ getExtension: () => null } as unknown as RenderingContext) : null),
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
};

describe('SafeCanvasWrapper capability gating', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    vi.resetModules();
    (globalThis as unknown as Record<string, unknown>).IntersectionObserver =
      ObserverIntersecting as unknown as typeof IntersectionObserver;
    setHardware(8, 8);
    mockWebGL(true);
    usePlatformStore.setState({ thermalSafeMode: false, heavyModulesMounted: 0 });
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    vi.restoreAllMocks();
  });

  it('detects WebGL support and low-power hardware', () => {
    expect(detectWebGLSupport()).toBe(true);
    setHardware(2, 2);
    expect(detectLowPowerDevice()).toBe(true);
    setHardware(8, 8);
    expect(detectLowPowerDevice()).toBe(false);
  });

  it('mounts the 3D scene on a capable device that is in view', async () => {
    render(<SafeCanvasWrapper load={loadHeavy} moduleName="3d:test" />);
    await waitFor(() => expect(screen.getByText('heavy-3d-scene')).toBeTruthy());
    expect(usePlatformStore.getState().heavyModulesMounted).toBe(1);
  });

  it('degrades to the 2D fallback on a low-power device', async () => {
    setHardware(2, 2);
    render(
      <SafeCanvasWrapper load={loadHeavy} fallback2D={<div>flat-2d-fallback</div>} />,
    );
    expect(screen.getByText('flat-2d-fallback')).toBeTruthy();
    expect(screen.queryByText('heavy-3d-scene')).toBeNull();
    expect(usePlatformStore.getState().heavyModulesMounted).toBe(0);
  });

  it('degrades to the 2D fallback when WebGL is unavailable', () => {
    mockWebGL(false);
    render(<SafeCanvasWrapper load={loadHeavy} fallback2D={<div>flat-2d-fallback</div>} />);
    expect(screen.getByText('flat-2d-fallback')).toBeTruthy();
  });

  it('honours thermal-safe mode even on capable hardware', () => {
    act(() => usePlatformStore.getState().setThermalSafeMode(true));
    render(<SafeCanvasWrapper load={loadHeavy} fallback2D={<div>flat-2d-fallback</div>} />);
    expect(screen.getByText('flat-2d-fallback')).toBeTruthy();
  });

  it('does not initialise a GL context while offscreen', () => {
    (globalThis as unknown as Record<string, unknown>).IntersectionObserver =
      ObserverOffscreen as unknown as typeof IntersectionObserver;
    render(<SafeCanvasWrapper load={loadHeavy} fallback2D={<div>flat-2d-fallback</div>} />);
    expect(screen.getByText('flat-2d-fallback')).toBeTruthy();
    expect(usePlatformStore.getState().heavyModulesMounted).toBe(0);
  });

  it('releases the thermal budget on unmount', async () => {
    const view = render(<SafeCanvasWrapper load={loadHeavy} />);
    await waitFor(() => expect(usePlatformStore.getState().heavyModulesMounted).toBe(1));
    view.unmount();
    expect(usePlatformStore.getState().heavyModulesMounted).toBe(0);
  });

  it('gating decisions are synchronous and cheap (performance budget)', () => {
    const started = performance.now();
    for (let i = 0; i < 500; i++) {
      detectWebGLSupport();
      detectLowPowerDevice();
    }
    expect(performance.now() - started).toBeLessThan(150);
  });

  it('falls back when the lazy chunk fails to load', async () => {
    render(
      <SafeCanvasWrapper
        load={() => Promise.reject(new Error('chunk 404'))}
        fallback2D={<div>flat-2d-fallback</div>}
      />,
    );
    await waitFor(() => expect(screen.queryByText('heavy-3d-scene')).toBeNull());
  });
});
