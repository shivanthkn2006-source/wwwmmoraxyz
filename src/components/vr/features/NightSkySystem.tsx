/**
 * NIGHT SKY SYSTEM — Real-time moon, stars, shooting stars, dark sky
 * Listens to 'vr-sun-hour-change' event for day/night transitions.
 * At night: dark gradient sky, visible stars, crescent moon, random shooting stars.
 * At dawn/dusk: color transitions. Day: hidden.
 */

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

// ── Sky background colors by hour ─────────────────────────────────────
const getSkyColor = (hour: number): string => {
  if (hour >= 20 || hour < 4) return '#020810'; // deep night
  if (hour >= 18) return '#0a1628'; // dusk → night
  if (hour >= 16) return '#1a3050'; // sunset
  if (hour < 5) return '#060e1e'; // pre-dawn
  if (hour < 6) return '#1a2744'; // dawn
  if (hour < 7) return '#3a5a7a'; // early morning
  return '#4a8abe'; // day — won't override seasons
};

const isNightHour = (h: number) => h < 6 || h >= 18;
const isDuskDawn = (h: number) => (h >= 16 && h < 18) || (h >= 5 && h < 7);

// ── Shooting Star ─────────────────────────────────────────────────────
const ShootingStar: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const ref = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const data = useMemo(() => {
    const angle = Math.random() * Math.PI * 2;
    const elev = 0.3 + Math.random() * 0.5;
    const r = 300 + Math.random() * 200;
    return {
      startX: Math.cos(angle) * r,
      startY: elev * r * 0.6 + 80,
      startZ: Math.sin(angle) * r,
      dx: (Math.random() - 0.5) * 200,
      dy: -(60 + Math.random() * 80),
      dz: (Math.random() - 0.5) * 200,
      speed: 1.5 + Math.random() * 2,
      life: 0,
      maxLife: 0.6 + Math.random() * 0.8,
    };
  }, []);

  useFrame((_, delta) => {
    data.life += delta * data.speed;
    const t = data.life / data.maxLife;
    if (t >= 1) { onDone(); return; }
    if (!ref.current) return;
    ref.current.position.set(
      data.startX + data.dx * t,
      data.startY + data.dy * t,
      data.startZ + data.dz * t,
    );
    const fade = t < 0.2 ? t / 0.2 : t > 0.7 ? (1 - t) / 0.3 : 1;
    (ref.current.material as THREE.MeshBasicMaterial).opacity = fade * 0.9;
    if (trailRef.current) {
      trailRef.current.position.copy(ref.current.position);
      trailRef.current.position.x -= data.dx * 0.08;
      trailRef.current.position.y -= data.dy * 0.08;
      trailRef.current.position.z -= data.dz * 0.08;
      (trailRef.current.material as THREE.MeshBasicMaterial).opacity = fade * 0.4;
    }
  });

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[0.8, 6, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} />
      </mesh>
      <mesh ref={trailRef}>
        <sphereGeometry args={[2.5, 4, 4]} />
        <meshBasicMaterial color="#aaccff" transparent opacity={0} />
      </mesh>
    </>
  );
};

// ── Moon ───────────────────────────────────────────────────────────────
const Moon: React.FC<{ hour: number }> = ({ hour }) => {
  const moonRef = useRef<THREE.Group>(null);
  const progress = useMemo(() => {
    // Moon rises in east at ~7PM, sets in west at ~6AM
    if (hour >= 19) return (hour - 19) / 11;
    if (hour < 6) return (hour + 5) / 11;
    return -1; // not visible
  }, [hour]);

  if (progress < 0) return null;

  const azimuth = progress * Math.PI;
  const elevation = Math.sin(azimuth) * 0.6;
  const radius = 400;
  const x = Math.cos(azimuth) * radius;
  const y = elevation * radius * 0.5 + 100;
  const z = Math.sin(azimuth) * radius * 0.3;

  return (
    <group ref={moonRef} position={[x, Math.max(y, 50), z]}>
      {/* Moon sphere */}
      <mesh>
        <sphereGeometry args={[18, 20, 20]} />
        <meshBasicMaterial color="#f0e8d0" />
      </mesh>
      {/* Crescent shadow (dark sphere offset to create crescent) */}
      <mesh position={[6, 2, 4]}>
        <sphereGeometry args={[15, 20, 20]} />
        <meshBasicMaterial color="#020810" />
      </mesh>
      {/* Glow */}
      <mesh>
        <sphereGeometry args={[28, 16, 16]} />
        <meshBasicMaterial color="#d4c89a" transparent opacity={0.06} />
      </mesh>
    </group>
  );
};

// ── Main Component ────────────────────────────────────────────────────
const NightSkySystem: React.FC = () => {
  const { scene } = useThree();
  const [hour, setHour] = useState(() => new Date().getHours());
  const [shootingStars, setShootingStars] = useState<number[]>([]);
  const nextShootRef = useRef(0);
  const idCounter = useRef(0);

  // Listen to sky-phase-change — use detail.isNight from API for threshold
  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (typeof detail.hour === 'number') setHour(detail.hour);
    };
    window.addEventListener('vr-sun-hour-change', onEvent);
    window.addEventListener('sky-phase-change', onEvent);
    return () => {
      window.removeEventListener('vr-sun-hour-change', onEvent);
      window.removeEventListener('sky-phase-change', onEvent);
    };
  }, []);

  // Set scene.background immediately on mount + when hour changes
  useEffect(() => {
    if (isNightHour(hour) || isDuskDawn(hour)) {
      scene.background = new THREE.Color(getSkyColor(hour));
    }
  }, [hour, scene]);

  // Spawn shooting stars randomly at night
  useFrame((state) => {
    if (!isNightHour(hour)) return;
    const t = state.clock.elapsedTime;
    if (t > nextShootRef.current && shootingStars.length < 3) {
      nextShootRef.current = t + 3 + Math.random() * 8;
      const id = ++idCounter.current;
      setShootingStars(prev => [...prev, id]);
    }
  });

  const removeShootingStar = useCallback((id: number) => {
    setShootingStars(prev => prev.filter(s => s !== id));
  }, []);

  const night = isNightHour(hour);
  const dusk = isDuskDawn(hour);

  return (
    <>
      {/* Stars — visible at night and dusk/dawn */}
      {(night || dusk) && (
        <Stars
          radius={450}
          depth={120}
          count={night ? 8000 : 2000}
          factor={night ? 5 : 2.5}
          saturation={0.1}
          fade
          speed={0.3}
        />
      )}

      {/* Moon */}
      {night && <Moon hour={hour} />}

      {/* Shooting stars */}
      {night && shootingStars.map(id => (
        <ShootingStar key={id} onDone={() => removeShootingStar(id)} />
      ))}
    </>
  );
};

export default NightSkySystem;
