/**
 * useWeatherBackground — Location-aware weather + day/night background system.
 * Fetches real weather via Open-Meteo API using geolocation.
 * Combines with useSkyPhase for location-based day/night.
 * Drives background colors + weather overlay type.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSkyPhase, type SkyPhase } from './useSkyPhase';
import { getSharedCoords } from '@/utils/sharedGeolocation';

// ── Weather types ────────────────────────────────────────────────────────────

export type WeatherCondition =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy_rain'
  | 'snow'
  | 'heavy_snow'
  | 'thunderstorm';

export interface WeatherBackgroundState {
  // Sky phase from useSkyPhase (location-based)
  skyPhase: SkyPhase;
  isNight: boolean;
  hour: number;
  minute: number;

  // Weather
  weather: WeatherCondition;
  temperature: number | null;      // Celsius
  windSpeed: number | null;        // km/h
  locationName: string;

  // Derived background style
  backgroundColor: string;        // Primary gradient start
  backgroundColorEnd: string;     // Primary gradient end
  overlayType: WeatherCondition;  // Which weather overlay to show
  weatherLoaded: boolean;
}

// ── WMO weather code → condition mapping ─────────────────────────────────────

function wmoToCondition(code: number): WeatherCondition {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly_cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 55) return 'drizzle';
  if (code >= 56 && code <= 57) return 'drizzle'; // freezing drizzle
  if (code >= 61 && code <= 63) return 'rain';
  if (code === 65) return 'heavy_rain';
  if (code >= 66 && code <= 67) return 'rain'; // freezing rain
  if (code >= 71 && code <= 73) return 'snow';
  if (code === 75 || code === 77) return 'heavy_snow';
  if (code >= 80 && code <= 81) return 'rain';
  if (code === 82) return 'heavy_rain';
  if (code >= 85 && code <= 86) return 'snow';
  if (code >= 95) return 'thunderstorm';
  return 'clear';
}

// ── Background colors per weather + day/night ────────────────────────────────

function getBackgroundColors(weather: WeatherCondition, phase: SkyPhase, isNight: boolean): { start: string; end: string } {
  // Night backgrounds
  if (isNight) {
    switch (weather) {
      case 'clear':
        return { start: 'hsl(220, 80%, 4%)', end: 'hsl(240, 70%, 8%)' };
      case 'partly_cloudy':
        return { start: 'hsl(220, 60%, 8%)', end: 'hsl(230, 50%, 14%)' };
      case 'cloudy':
        return { start: 'hsl(220, 30%, 12%)', end: 'hsl(230, 25%, 18%)' };
      case 'fog':
        return { start: 'hsl(220, 15%, 16%)', end: 'hsl(220, 10%, 22%)' };
      case 'drizzle':
      case 'rain':
        return { start: 'hsl(220, 40%, 8%)', end: 'hsl(230, 35%, 14%)' };
      case 'heavy_rain':
        return { start: 'hsl(220, 35%, 6%)', end: 'hsl(225, 30%, 10%)' };
      case 'snow':
      case 'heavy_snow':
        return { start: 'hsl(220, 25%, 12%)', end: 'hsl(230, 20%, 18%)' };
      case 'thunderstorm':
        return { start: 'hsl(240, 50%, 4%)', end: 'hsl(260, 40%, 8%)' };
      default:
        return { start: 'hsl(220, 80%, 4%)', end: 'hsl(240, 70%, 8%)' };
    }
  }

  // Dawn/Dusk
  if (phase === 'dawn') {
    switch (weather) {
      case 'clear':
        return { start: 'hsl(25, 80%, 55%)', end: 'hsl(210, 60%, 45%)' };
      case 'cloudy':
      case 'partly_cloudy':
        return { start: 'hsl(30, 50%, 45%)', end: 'hsl(220, 40%, 40%)' };
      case 'rain':
      case 'drizzle':
      case 'heavy_rain':
        return { start: 'hsl(220, 30%, 40%)', end: 'hsl(230, 35%, 35%)' };
      default:
        return { start: 'hsl(25, 70%, 50%)', end: 'hsl(210, 55%, 42%)' };
    }
  }

  if (phase === 'dusk' || phase === 'evening') {
    switch (weather) {
      case 'clear':
        return { start: 'hsl(280, 60%, 45%)', end: 'hsl(330, 70%, 55%)' };
      case 'cloudy':
      case 'partly_cloudy':
        return { start: 'hsl(260, 40%, 35%)', end: 'hsl(290, 35%, 40%)' };
      case 'rain':
      case 'drizzle':
      case 'heavy_rain':
        return { start: 'hsl(240, 30%, 30%)', end: 'hsl(260, 25%, 35%)' };
      default:
        return { start: 'hsl(270, 55%, 40%)', end: 'hsl(320, 60%, 50%)' };
    }
  }

  // Daytime backgrounds
  switch (weather) {
    case 'clear':
      return { start: 'hsl(205, 90%, 72%)', end: 'hsl(195, 85%, 62%)' };
    case 'partly_cloudy':
      return { start: 'hsl(210, 70%, 68%)', end: 'hsl(200, 65%, 58%)' };
    case 'cloudy':
      return { start: 'hsl(215, 30%, 60%)', end: 'hsl(210, 25%, 52%)' };
    case 'fog':
      return { start: 'hsl(210, 15%, 65%)', end: 'hsl(210, 10%, 58%)' };
    case 'drizzle':
      return { start: 'hsl(215, 40%, 55%)', end: 'hsl(220, 35%, 48%)' };
    case 'rain':
      return { start: 'hsl(220, 45%, 48%)', end: 'hsl(225, 40%, 40%)' };
    case 'heavy_rain':
      return { start: 'hsl(220, 40%, 38%)', end: 'hsl(225, 35%, 30%)' };
    case 'snow':
      return { start: 'hsl(210, 20%, 75%)', end: 'hsl(215, 15%, 68%)' };
    case 'heavy_snow':
      return { start: 'hsl(210, 15%, 78%)', end: 'hsl(210, 10%, 72%)' };
    case 'thunderstorm':
      return { start: 'hsl(230, 50%, 30%)', end: 'hsl(240, 45%, 22%)' };
    default:
      return { start: 'hsl(205, 85%, 70%)', end: 'hsl(195, 80%, 60%)' };
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useWeatherBackground(): WeatherBackgroundState {
  const skyPhaseData = useSkyPhase();
  const [weather, setWeather] = useState<WeatherCondition>('clear');
  const [temperature, setTemperature] = useState<number | null>(null);
  const [windSpeed, setWindSpeed] = useState<number | null>(null);
  const [locationName, setLocationName] = useState('');
  const [weatherLoaded, setWeatherLoaded] = useState(false);
  const fetchedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch weather from Open-Meteo using geolocation
  useEffect(() => {
    if (fetchedRef.current) return;

    const fetchWeather = async () => {
      fetchedRef.current = true;
      try {
        // Get user location (shared, single-prompt)
        const coords = await getSharedCoords();
        const lat = coords.lat;
        const lng = coords.lng;
        let city = '';

        // Fetch weather from Open-Meteo (free, no API key)
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=auto`
        );
        if (!res.ok) throw new Error('Weather fetch failed');
        const data = await res.json();
        const cw = data.current_weather;

        const condition = wmoToCondition(cw.weathercode);
        setWeather(condition);
        setTemperature(Math.round(cw.temperature));
        setWindSpeed(Math.round(cw.windspeed));

        // Reverse geocode for location name
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'User-Agent': 'ZoeInfinity/1.0' } }
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            city = geoData.address?.city || geoData.address?.town || geoData.address?.village || '';
          }
        } catch {}

        setLocationName(city);
        setWeatherLoaded(true);

        console.log(`[WeatherBackground] 🌤️ ${city || 'Unknown'} | ${condition} | ${cw.temperature}°C | Phase: ${skyPhaseData.phase}`);
      } catch (err) {
        console.error('[WeatherBackground] Weather fetch error:', err);
        setWeatherLoaded(true);
      }
    };

    fetchWeather();

    // Refresh weather every 15 minutes
    intervalRef.current = setInterval(() => {
      fetchedRef.current = false;
    }, 15 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Compute background colors
  const colors = getBackgroundColors(weather, skyPhaseData.phase, skyPhaseData.isNight);

  return {
    skyPhase: skyPhaseData.phase,
    isNight: skyPhaseData.isNight,
    hour: skyPhaseData.hour,
    minute: skyPhaseData.minute,
    weather,
    temperature,
    windSpeed,
    locationName,
    backgroundColor: colors.start,
    backgroundColorEnd: colors.end,
    overlayType: weather,
    weatherLoaded,
  };
}
