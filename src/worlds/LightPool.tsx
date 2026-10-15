/**
 * Light pool: every lamp, window lamp and room light registers a
 * <PooledLight>, but the scene only ever has POOL_SIZE real point lights that
 * jump to the nearest registered spots (re-picked 4× a second, faded in).
 * A fixed light count means three.js never recompiles every material when a
 * room or lamp mounts, and each pixel only pays for a few lights — twenty
 * separate point lights made the village hang while walking.
 */
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scheduleOn, type LightSchedule } from '@/lib/vrLights';

export const POOL_SIZE = 4;
type Entry = { obj: THREE.Object3D | null; color: THREE.Color; intensity: number; distance: number; decay: number; schedule?: LightSchedule; flicker: boolean };
const entries = new Set<Entry>();
export const pooledLightCount = () => entries.size;

export const PooledLight: React.FC<{ position?: [number, number, number]; color?: string; intensity?: number; distance?: number; decay?: number; schedule?: LightSchedule; flicker?: boolean }> = ({
  position = [0, 0, 0], color = '#ffcf8a', intensity = 1, distance = 8, decay = 2, schedule, flicker = false,
}) => {
  const ref = useRef<THREE.Group>(null);
  const e = useMemo<Entry>(() => ({ obj: null, color: new THREE.Color(color), intensity, distance, decay, schedule, flicker }), []); // eslint-disable-line react-hooks/exhaustive-deps
  e.color.set(color); e.intensity = intensity; e.distance = distance; e.decay = decay; e.schedule = schedule; e.flicker = flicker;
  useLayoutEffect(() => { e.obj = ref.current; entries.add(e); return () => { entries.delete(e); }; }, [e]);
  return <group ref={ref} position={position} />;
};

const tmp = new THREE.Vector3();
export const LightPool: React.FC<{ size?: number }> = ({ size = POOL_SIZE }) => {
  const { camera } = useThree();
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const slot = useRef<(Entry | null)[]>([]);
  const acc = useRef(1);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05);
    acc.current += dt;
    if (acc.current > 0.25) {
      acc.current = 0;
      const near: { e: Entry; d: number }[] = [];
      entries.forEach((e) => {
        if (!e.obj || (e.schedule && !scheduleOn(e.schedule))) return;
        e.obj.getWorldPosition(tmp);
        const d = tmp.distanceTo(camera.position);
        if (d < e.distance + 18) near.push({ e, d: d - e.distance * 0.3 });
      });
      near.sort((a, b) => a.d - b.d);
      const pick = near.slice(0, size).map((n) => n.e);
      // keep lights that are still wanted in their slot so they don't blink
      const next: (Entry | null)[] = slot.current.slice(0, size).map((e) => (e && pick.includes(e) ? e : null));
      for (const e of pick) if (!next.includes(e)) { const k = next.findIndex((x, i) => !x && i < size); if (k >= 0) next[k] = e; else next.push(e); }
      for (let i = 0; i < size; i++) {
        const l = lights.current[i], e = next[i] ?? null;
        if (l && e !== slot.current[i]) { l.intensity = 0; if (e?.obj) { e.obj.getWorldPosition(l.position); l.color.copy(e.color); l.distance = e.distance; l.decay = e.decay; } }
      }
      slot.current = next;
    }
    const t = clock.elapsedTime;
    for (let i = 0; i < size; i++) {
      const l = lights.current[i], e = slot.current[i];
      if (!l) continue;
      if (e?.obj) e.obj.getWorldPosition(l.position);
      const target = e ? e.intensity * (e.flicker ? 1 + Math.sin(t * 7 + i) * 0.14 : 1) : 0;
      l.intensity = THREE.MathUtils.damp(l.intensity, target, 6, dt);
    }
  });
  return <>{Array.from({ length: size }, (_, i) => <pointLight key={i} ref={(l) => { lights.current[i] = l; }} intensity={0} distance={8} decay={2} />)}</>;
};
