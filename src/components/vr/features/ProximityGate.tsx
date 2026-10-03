/**
 * ProximityGate — "what the eyes can see" streaming for the VR world.
 *
 * Children mount only while the camera (the member's point of view) is
 * inside `radius` of `center`, and unmount again past `radius * 1.25`
 * (hysteresis, so walking along the edge never flickers). Because the check
 * is distance-based — not view-direction-based — anything near the member is
 * already mounted, so turning the head shows it instantly.
 *
 * `preload` (usually the lazy chunk's import) starts downloading while the
 * member is still `radius * 1.6` away, so the area is ready on arrival.
 * Low-memory phones get smaller radii so less of the world is alive at once.
 */
import React, { Suspense, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

const isLowEndDevice = (() => {
  if (typeof navigator === 'undefined') return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 8;
  return (mem !== undefined && mem <= 4) || cores <= 4;
})();

/** Radius multiplier for the current device (smaller world bubble on 4 GB phones). */
export const PROXIMITY_SCALE = isLowEndDevice ? 0.7 : 1;

interface ProximityGateProps {
  center: [number, number, number];
  radius: number;
  preload?: () => unknown;
  children: React.ReactNode;
}

export const ProximityGate: React.FC<ProximityGateProps> = ({ center, radius, preload, children }) => {
  const { camera } = useThree();
  const r = radius * PROXIMITY_SCALE;
  const dist = () => Math.hypot(camera.position.x - center[0], camera.position.z - center[2]);
  const [inside, setInside] = useState(() => dist() <= r);
  const insideRef = useRef(inside);
  const preloaded = useRef(false);
  const acc = useRef(0);

  useFrame((_, delta) => {
    acc.current += delta;
    if (acc.current < 0.2) return; // 5 checks/sec is plenty for walking speed
    acc.current = 0;
    const d = dist();
    if (!preloaded.current && preload && d <= r * 1.6) {
      preloaded.current = true;
      try { void preload(); } catch { /* chunk retries on mount */ }
    }
    const next = insideRef.current ? d <= r * 1.25 : d <= r;
    if (next !== insideRef.current) {
      insideRef.current = next;
      setInside(next);
    }
  });

  return inside ? <Suspense fallback={null}>{children}</Suspense> : null;
};

export default ProximityGate;
