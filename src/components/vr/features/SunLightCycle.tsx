/**
 * SUN LIGHT CYCLE - Realistic day/night directional sun based on real-world local time.
 * The sun rotates across the sky from East (sunrise) to West (sunset).
 * At night, emits a dim moonlight. All objects cast dynamic shadows.
 *
 * LOCATION-AWARE: Uses device geolocation timezone so VR world
 * day/night matches the user's real-world local time automatically.
 * Also fetches real weather from Open-Meteo to adjust sky tint.
 */

import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface SunLightCycleProps {
  /** Override hour (0-23) for testing; omit to use real clock */
  overrideHour?: number;
  /** Shadow map size (default from graphics config) */
  shadowMapSize?: number;
  /** Callback when night triggers so parent can toggle train lights */
  onNightChange?: (isNight: boolean) => void;
  /** Callback exposing current hour for parent sync */
  onHourChange?: (hour: number) => void;
}

const isNightHour = (hour: number): boolean => hour < 6 || hour >= 18;

/**
 * Maps a real-world hour to a sun elevation & azimuth.
 * Sun rises in the EAST (+X in our world) and sets in the WEST (-X).
 */
const getSunPositionFromHour = (hour: number, minute: number = 0): THREE.Vector3 => {
  const t = hour + minute / 60;
  const dayProgress = THREE.MathUtils.clamp((t - 5) / 14, 0, 1);
  const elevation = Math.sin(dayProgress * Math.PI);
  const azimuth = dayProgress * Math.PI;

  const isNight = t < 6 || t >= 18;
  if (isNight) {
    return new THREE.Vector3(-200, -50, 100);
  }

  const radius = 500;
  const x = Math.cos(azimuth) * radius * Math.cos(elevation * 0.3);
  const y = elevation * radius * 0.6 + 50;
  const z = Math.sin(azimuth) * radius * 0.3;

  return new THREE.Vector3(x, Math.max(y, 5), z);
};

const getSunColor = (hour: number, weatherCode?: number): string => {
  // Overcast/rainy days have muted sun color
  const isOvercast = weatherCode !== undefined && weatherCode >= 3 && weatherCode < 95;
  if (isNightHour(hour)) return '#1e3a5f';
  if (isOvercast) {
    if (hour < 7 || hour >= 17) return '#9ca3af';
    return '#d1d5db'; // Grey-white overcast daylight
  }
  if (hour < 7) return '#feb47b';
  if (hour < 8) return '#ffd89b';
  if (hour >= 17 && hour < 19) return '#ff7e5f';
  if (hour >= 19) return '#c97b3d';
  return '#fffbe6';
};

const getSunIntensity = (hour: number, weatherCode?: number): number => {
  const isOvercast = weatherCode !== undefined && weatherCode >= 3 && weatherCode < 95;
  const isRain = weatherCode !== undefined && weatherCode >= 51;
  const cloudFactor = isRain ? 0.5 : isOvercast ? 0.7 : 1;

  if (isNightHour(hour)) return 0.08;
  if (hour < 6) return 0.2 * cloudFactor;
  if (hour < 7) return 0.5 * cloudFactor;
  if (hour >= 18) return 0.4 * cloudFactor;
  if (hour >= 17) return 0.6 * cloudFactor;
  return 1.2 * cloudFactor;
};

const getAmbientIntensity = (hour: number): number => {
  if (isNightHour(hour)) return 0.06;
  if (hour < 7 || hour >= 18) return 0.2;
  return 0.4;
};

// ─── Location-based weather fetcher (lightweight, no state dependency) ───────
const fetchWeatherCode = async (): Promise<number | undefined> => {
  try {
    if (!navigator.geolocation) return undefined;
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 600000 })
    );
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true&timezone=auto`
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.current_weather?.weathercode as number | undefined;
  } catch {
    return undefined;
  }
};

const SunLightCycle: React.FC<SunLightCycleProps> = ({
  overrideHour,
  shadowMapSize = 2048,
  onNightChange,
  onHourChange,
}) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const lastNightState = useRef<boolean | null>(null);
  const lastReportedHour = useRef<number | null>(null);
  const frameCount = useRef(0);
  const [weatherCode, setWeatherCode] = useState<number | undefined>(undefined);

  // Fetch real weather once on mount, refresh every 15 min
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const code = await fetchWeatherCode();
      if (mounted) setWeatherCode(code);
    };
    load();
    const interval = setInterval(load, 15 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const shadowCameraConfig = useMemo(() => ({
    left: -300, right: 300, top: 300, bottom: -300, near: 1, far: 1500,
  }), []);

  const { gl } = useThree();
  useMemo(() => {
    if (!gl) return;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  // Fire onHourChange immediately on mount so listeners don't miss initial state
  const mountFired = useRef(false);
  useEffect(() => {
    if (mountFired.current) return;
    mountFired.current = true;
    const h = overrideHour ?? new Date().getHours();
    onHourChange?.(h);
    onNightChange?.(isNightHour(h));
    lastReportedHour.current = h;
    lastNightState.current = isNightHour(h);
  }, []);

  useFrame(() => {
    if (!lightRef.current) return;

    frameCount.current++;
    if (frameCount.current % 30 !== 0) return;

    const now = new Date();
    const hour = overrideHour ?? now.getHours();
    const minute = now.getMinutes();

    const sunPos = getSunPositionFromHour(hour, minute);
    lightRef.current.position.copy(sunPos);
    lightRef.current.color.set(getSunColor(hour, weatherCode));
    lightRef.current.intensity = getSunIntensity(hour, weatherCode);
    lightRef.current.target.position.set(0, 0, 0);
    lightRef.current.target.updateMatrixWorld();

    // Sync ambient & hemisphere live
    if (ambientRef.current) {
      ambientRef.current.intensity = getAmbientIntensity(hour);
      ambientRef.current.color.set(isNightHour(hour) ? '#1a2744' : '#ffeedd');
    }
    if (hemiRef.current) {
      const night = isNightHour(hour);
      (hemiRef.current as any).color?.set(night ? '#0a1628' : '#87ceeb');
      (hemiRef.current as any).groundColor?.set(night ? '#050a14' : '#2d5a1e');
      hemiRef.current.intensity = night ? 0.05 : 0.25;
    }

    // Notify parent about night state
    const isNight = isNightHour(hour);
    if (isNight !== lastNightState.current) {
      lastNightState.current = isNight;
      onNightChange?.(isNight);
    }

    // Notify parent about current hour (always fire, not just on change)
    if (hour !== lastReportedHour.current) {
      lastReportedHour.current = hour;
      onHourChange?.(hour);
    }
  });

  // Initial position
  const now = new Date();
  const initHour = overrideHour ?? now.getHours();
  const initPos = getSunPositionFromHour(initHour, now.getMinutes());

  return (
    <>
      <ambientLight
        ref={ambientRef}
        intensity={getAmbientIntensity(initHour)}
        color={isNightHour(initHour) ? '#1a2744' : '#ffeedd'}
      />
      <directionalLight
        ref={lightRef}
        position={[initPos.x, initPos.y, initPos.z]}
        intensity={getSunIntensity(initHour, weatherCode)}
        color={getSunColor(initHour, weatherCode)}
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={shadowCameraConfig.left}
        shadow-camera-right={shadowCameraConfig.right}
        shadow-camera-top={shadowCameraConfig.top}
        shadow-camera-bottom={shadowCameraConfig.bottom}
        shadow-camera-near={shadowCameraConfig.near}
        shadow-camera-far={shadowCameraConfig.far}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <hemisphereLight
        ref={hemiRef}
        args={[
          isNightHour(initHour) ? '#0a1628' : '#87ceeb',
          isNightHour(initHour) ? '#050a14' : '#2d5a1e',
          isNightHour(initHour) ? 0.05 : 0.25,
        ]}
      />
    </>
  );
};

export default SunLightCycle;
