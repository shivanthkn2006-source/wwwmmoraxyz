/**
 * WebGLBoundary — crash isolation for components that render a raw
 * `<Canvas>` (react-three-fiber) rather than going through SafeCanvasWrapper.
 *
 * A lost GL context or a shader/geometry throw inside the render loop must
 * degrade to a flat fallback, never take the app shell down with it.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AppErrorBoundary } from '@/components/core/ErrorBoundary';
import { canAttemptWebGL, recordWebGLFailure } from '@/lib/webglCircuitBreaker';
import { detectWebGLSupport } from './SafeCanvasWrapper';

interface WebGLBoundaryProps {
  moduleName: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export const WebGLBoundary: React.FC<WebGLBoundaryProps> = ({
  moduleName,
  children,
  fallback,
  className,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // `webglcontextlost` bubbles from the canvas element; treat it as a breaker
  // failure so a thermally throttled device stops retrying the same scene.
  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const onLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
      recordWebGLFailure(moduleName, new Error('webglcontextlost'));
    };
    node.addEventListener('webglcontextlost', onLost, true);
    return () => node.removeEventListener('webglcontextlost', onLost, true);
  }, [moduleName]);

  const safe = fallback ?? (
    <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
      3D view unavailable on this device — the rest of the page still works.
    </div>
  );

  const blocked = contextLost || !canAttemptWebGL(moduleName) || !detectWebGLSupport();

  return (
    <div ref={hostRef} className={className ?? 'h-full w-full'} data-webgl-boundary={moduleName}>
      {blocked ? (
        safe
      ) : (
        <AppErrorBoundary
          moduleName={moduleName}
          severity="medium"
          onError={(error) => recordWebGLFailure(moduleName, error)}
          fallback={safe}
        >
          {children}
        </AppErrorBoundary>
      )}
    </div>
  );
};

export default WebGLBoundary;
