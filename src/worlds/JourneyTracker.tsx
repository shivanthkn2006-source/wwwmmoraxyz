import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BEACON_POS, BEACON_RADIUS, journeyEvent, useJourney } from './journeyQuest';
import { useWorldState } from './worldMode';

/** Feeds real walking distance / doorway / beacon reach into the journey quest. */
export const JourneyTracker: React.FC = () => {
  const { camera } = useThree();
  const { mode } = useWorldState();
  const j = useJourney();
  const last = useRef<{ x: number; z: number } | null>(null);
  const acc = useRef(0);
  const prevMode = useRef(mode);

  if (prevMode.current !== mode) {
    if (mode === 'mmora') journeyEvent({ type: 'entered-mmora' });
    prevMode.current = mode;
    last.current = null;
  }

  useFrame(() => {
    const p = camera.position;
    if (mode === 'real' && j.step === 'walk') {
      // Only count walking at street level; a single jump > 10 m is a teleport/aerial move.
      const step = last.current ? Math.hypot(p.x - last.current.x, p.z - last.current.z) : 0;
      if (p.y < 6 && step < 10) acc.current += step;
      last.current = { x: p.x, z: p.z };
      if (acc.current >= 1) { journeyEvent({ type: 'walked', meters: acc.current }); acc.current = 0; }
    }
    if (mode === 'mmora' && j.step === 'beacon' &&
        Math.hypot(p.x - BEACON_POS[0], p.z - BEACON_POS[2]) < BEACON_RADIUS) journeyEvent({ type: 'near-beacon' });
  });

  if (mode !== 'mmora' || j.step !== 'beacon') return null;
  return (
    <group position={BEACON_POS}>
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 12, 16, 1, true]} />
        <meshBasicMaterial color="#387BF6" transparent opacity={0.45} />
      </mesh>
      <Html position={[0, 13, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div className="surface-warm-tan rounded-full px-2 py-0.5 text-[10px] whitespace-nowrap text-white">Journey beacon</div>
      </Html>
    </group>
  );
};
