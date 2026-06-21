/**
 * VR Altitude Tracker - R3F component that reports camera Y to the progressive loader
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

interface AltitudeTrackerProps {
  onAltitudeChange: (y: number) => void;
}

/** Must be placed inside <Canvas> - reports camera altitude every frame */
export const AltitudeTracker: React.FC<AltitudeTrackerProps> = ({ onAltitudeChange }) => {
  const lastReportedY = useRef<number | null>(null);
  const lastReportAt = useRef(0);

  useFrame(({ camera }) => {
    const y = camera.position.y;
    const now = performance.now();
    const previousY = lastReportedY.current;

    // Report immediately on first frame, then when altitude meaningfully changes.
    // Keepalive prevents phase lock if altitude is constant (e.g. gate/ground spawn).
    const isFirstReport = previousY === null;
    const hasMeaningfulDelta = previousY !== null && Math.abs(y - previousY) >= 0.35;
    const keepaliveElapsed = now - lastReportAt.current >= 450;

    if (isFirstReport || hasMeaningfulDelta || keepaliveElapsed) {
      lastReportedY.current = y;
      lastReportAt.current = now;
      onAltitudeChange(y);
    }
  });

  return null;
};

export default AltitudeTracker;
