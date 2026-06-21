/**
 * useSkyPhase — Shared hook for real-world sky phase synchronization.
 * Fetches sunrise/sunset from sunrise-sunset.org API using geolocation.
 * Falls back to hardcoded hour boundaries if unavailable.
 * Dispatches 'sky-phase-change' CustomEvent on mount AND every update.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSharedCoords } from '@/utils/sharedGeolocation';

export type SkyPhase = 'night' | 'dawn' | 'morning' | 'day' | 'evening' | 'dusk';

interface SunTimes {
  sunrise: number; // hour (decimal)
  sunset: number;
}

const DEFAULT_SUN_TIMES: SunTimes = { sunrise: 6, sunset: 19 };

const fetchSunTimes = async (): Promise<SunTimes> => {
  try {
    const coords = await getSharedCoords();
    const res = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${coords.lat}&lng=${coords.lng}&formatted=0`
    );
    if (!res.ok) return DEFAULT_SUN_TIMES;
    const data = await res.json();
    if (data.status !== 'OK') return DEFAULT_SUN_TIMES;

    const sunriseDate = new Date(data.results.sunrise);
    const sunsetDate = new Date(data.results.sunset);

    return {
      sunrise: sunriseDate.getHours() + sunriseDate.getMinutes() / 60,
      sunset: sunsetDate.getHours() + sunsetDate.getMinutes() / 60,
    };
  } catch {
    return DEFAULT_SUN_TIMES;
  }
};

const getPhaseFromHour = (hour: number, sunTimes: SunTimes): SkyPhase => {
  const { sunrise, sunset } = sunTimes;
  if (hour < sunrise - 1) return 'night';
  if (hour < sunrise) return 'dawn';
  if (hour < sunrise + 2) return 'morning';
  if (hour < sunset - 2) return 'day';
  if (hour < sunset) return 'evening';
  if (hour < sunset + 1) return 'dusk';
  return 'night';
};

const isNightPhase = (phase: SkyPhase) => phase === 'night' || phase === 'dusk';

/**
 * Returns true when current time is >= (sunset - 10min) OR < (sunrise - 10min).
 * Uses real API sunrise/sunset times for location-aware night detection.
 */
export const isNightByAPI = (hour: number, minute: number, sunTimes: SunTimes): boolean => {
  const currentDecimal = hour + minute / 60;
  const sunsetMinus10 = sunTimes.sunset - 10 / 60; // 10 minutes before sunset
  const sunriseMinus10 = sunTimes.sunrise - 10 / 60; // 10 minutes before sunrise
  return currentDecimal >= sunsetMinus10 || currentDecimal < sunriseMinus10;
};

export interface SkyPhaseData {
  hour: number;
  minute: number;
  phase: SkyPhase;
  isNight: boolean;
  sunTimes: SunTimes;
}

export const useSkyPhase = (): SkyPhaseData => {
  const [sunTimes, setSunTimes] = useState<SunTimes>(DEFAULT_SUN_TIMES);
  const [now, setNow] = useState(() => new Date());
  const dispatched = useRef(false);

  // Fetch real sunrise/sunset once, refresh every 30 min
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const times = await fetchSunTimes();
      if (mounted) setSunTimes(times);
    };
    load();
    const iv = setInterval(load, 30 * 60 * 1000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  // Update clock every 30s
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(iv);
  }, []);

  const hour = now.getHours();
  const minute = now.getMinutes();
  const decimalHour = hour + minute / 60;
  const phase = getPhaseFromHour(decimalHour, sunTimes);
  const isNight = isNightByAPI(hour, minute, sunTimes);

  // Dispatch event on mount AND every update
  useEffect(() => {
    const detail = { hour, minute, phase, isNight, sunTimes };
    window.dispatchEvent(new CustomEvent('sky-phase-change', { detail }));

    // Also fire vr-sun-hour-change for backward compat on every dispatch
    window.dispatchEvent(new CustomEvent('vr-sun-hour-change', { detail: { hour } }));
    dispatched.current = true;
  }, [hour, minute, phase, isNight, sunTimes]);

  // Fire immediately on mount (before first interval tick)
  useEffect(() => {
    if (!dispatched.current) {
      const h = new Date().getHours();
      const m = new Date().getMinutes();
      const dh = h + m / 60;
      const p = getPhaseFromHour(dh, sunTimes);
      const n = isNightByAPI(h, m, sunTimes);
      window.dispatchEvent(new CustomEvent('sky-phase-change', { detail: { hour: h, minute: m, phase: p, isNight: n, sunTimes } }));
      window.dispatchEvent(new CustomEvent('vr-sun-hour-change', { detail: { hour: h } }));
    }
  }, [sunTimes]);

  return { hour, minute, phase, isNight, sunTimes };
};
