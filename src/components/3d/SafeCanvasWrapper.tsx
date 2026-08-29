// ═══════════════════════════════════════════════════════════════════════════════
// SAFE CANVAS WRAPPER — thermal-safe WebGL chunking gate
// Heavy 3D scenes are code-split, capability-gated, viewport-gated and
// crash-isolated so they can never block the main thread or nuke the shell.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AppErrorBoundary } from '@/components/core/ErrorBoundary';
import { usePlatformStore } from '@/store/usePlatformStore';
import {
  canAttemptWebGL,
  recordWebGLFailure,
  recordWebGLSuccess,
  resetWebGLBreaker,
  getBreakerState,
  subscribeBreaker,
} from '@/lib/webglCircuitBreaker';

export interface SafeCanvasWrapperProps {
  /** Dynamic import of the heavy scene, e.g. () => import('./HeavyThreeScene') */
  load: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>;
  /** Props forwarded to the loaded scene. */
  sceneProps?: Record<string, unknown>;
  moduleName?: string;
  className?: string;
  /** Only mount once scrolled into view (default true). */
  deferUntilVisible?: boolean;
  /** Rendered when WebGL is unavailable or the device is thermally constrained. */
  fallback2D?: React.ReactNode;
  loadingLabel?: string;
}

let webglCache: boolean | null = null;

export const detectWebGLSupport = (): boolean => {
  if (webglCache !== null) return webglCache;
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    webglCache = !!gl;
    // Release the probe context immediately — browsers cap live contexts.
    const lose = (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context');
    lose?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
};

/** Test/diagnostic hook: forget the memoized WebGL probe result. */
export const __resetCapabilityCache = () => {
  webglCache = null;
};

export const detectLowPowerDevice = (): boolean => {
  if (typeof navigator === 'undefined') return true;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  if (typeof memory === 'number' && memory < 4) return true;
  if (typeof cores === 'number' && cores > 0 && cores < 4) return true;
  return false;
};

const DefaultLoader = ({ label }: { label: string }) => (
  <div className="flex h-full w-full items-center justify-center text-sm text-primary animate-pulse">
    {label}
  </div>
);

const DefaultStatic = ({ label }: { label: string }) => (
  <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
    {label}
  </div>
);

export const SafeCanvasWrapper: React.FC<SafeCanvasWrapperProps> = ({
  load,
  sceneProps,
  moduleName = '3d:heavy-scene',
  className,
  deferUntilVisible = true,
  fallback2D,
  loadingLabel = 'Streaming DHF assets…',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(!deferUntilVisible);
  const thermalSafeMode = usePlatformStore((s) => s.thermalSafeMode);
  const acquireHeavyModule = usePlatformStore((s) => s.acquireHeavyModule);
  const releaseHeavyModule = usePlatformStore((s) => s.releaseHeavyModule);

  // Circuit breaker: re-read on every trip/reset so a failing scene degrades
  // to the safe UI without a page reload.
  const [breakerTick, setBreakerTick] = useState(0);
  useEffect(() => subscribeBreaker(() => setBreakerTick((t) => t + 1)), []);
  const breaker = useMemo(
    () => getBreakerState(moduleName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moduleName, breakerTick],
  );
  const circuitOpen = breaker.state === 'open';

  const capable = useMemo(() => detectWebGLSupport() && !detectLowPowerDevice(), []);
  const shouldRender = capable && !thermalSafeMode && visible && canAttemptWebGL(moduleName);

  // Viewport gate — never initialise a GL context for an offscreen scene.
  useEffect(() => {
    if (!deferUntilVisible || visible) return;
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [deferUntilVisible, visible]);

  // Thermal budget accounting for the platform store.
  useEffect(() => {
    if (!shouldRender) return;
    acquireHeavyModule();
    return () => releaseHeavyModule();
  }, [shouldRender, acquireHeavyModule, releaseHeavyModule]);

  const Scene = useMemo(
    () =>
      React.lazy(() =>
        load()
          .then((mod) => {
            recordWebGLSuccess(moduleName);
            return mod;
          })
          .catch((error) => {
            // Chunk fetch / module init failure counts against the breaker.
            recordWebGLFailure(moduleName, error);
            return { default: () => null };
          }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [load, moduleName, breakerTick],
  );

  const safeUi = (label: string) => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      {circuitOpen && (
        <button
          type="button"
          onClick={() => resetWebGLBreaker(moduleName)}
          className="rounded-full border border-border px-3 py-1 text-[11px] text-foreground/80 hover:bg-muted"
          data-testid="webgl-retry"
        >
          Try 3D again
        </button>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={className ?? 'h-full min-h-[300px] w-full bg-background'}>
      {!shouldRender ? (
        fallback2D ??
        safeUi(
          circuitOpen
            ? '3D preview turned off after repeated load errors. The rest of the app is unaffected.'
            : capable
              ? 'Preview paused to conserve device resources.'
              : '3D preview unavailable on this device.',
        )
      ) : (
        <AppErrorBoundary
          moduleName={moduleName}
          severity="medium"
          onError={(error) => recordWebGLFailure(moduleName, error)}
          fallback={fallback2D ?? safeUi('3D module offline — falling back to the lightweight view.')}
        >
          <Suspense fallback={<DefaultLoader label={loadingLabel} />}>
            <Scene {...(sceneProps ?? {})} />
          </Suspense>
        </AppErrorBoundary>
      )}
    </div>
  );
};

export default SafeCanvasWrapper;
