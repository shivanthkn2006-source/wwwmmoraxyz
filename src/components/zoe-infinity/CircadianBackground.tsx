// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 3: CIRCADIAN BACKGROUND - Location-Aware Weather + Day/Night
// ═══════════════════════════════════════════════════════════════════════════════
//
// Background is driven by REAL location data:
// - Day/Night: via useSkyPhase (sunrise-sunset.org API + geolocation)
// - Weather: via Open-Meteo API (rain, snow, thunder, clouds, clear, fog)
// - Colors shift based on actual weather + time at user's location
// - Night: 5000 stars, 5 shooting stars, moon, nebulas, planets
// - Weather overlays: rain drops, snow particles, lightning, clouds, fog
//
// ═══════════════════════════════════════════════════════════════════════════════

import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NightSkyOverlay } from './NightSkyOverlay';
import { WeatherOverlay } from './WeatherOverlay';
import { useWeatherBackground } from '@/hooks/useWeatherBackground';
import { useTimeSimulationSafe } from '@/contexts/TimeSimulationContext';
import type { AvatarEmotionState } from '@/utils/avatarEmotionClassifier';

interface CircadianBackgroundProps {
  className?: string;
  currentTime?: string;
  emotion?: AvatarEmotionState;
  kernelHeartRate?: number;
}

export const CircadianBackground = memo(function CircadianBackground({
  className = '',
  currentTime,
  emotion = 'idle',
  kernelHeartRate,
}: CircadianBackgroundProps) {
  const {
    skyPhase,
    isNight,
    hour,
    weather,
    temperature,
    locationName,
    backgroundColor,
    backgroundColorEnd,
    overlayType,
    weatherLoaded,
  } = useWeatherBackground();

  const { simulationEnabled, simulatedHour } = useTimeSimulationSafe();

  // Derive night mode flags from skyPhase
  const isNightMode = isNight;
  const isDeepNight = skyPhase === 'night' && (hour >= 0 && hour < 4);

  // Live-updating local time (refreshes every minute)
  const [localTime, setLocalTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Glow color based on weather
  const glowColor = isNightMode
    ? weather === 'thunderstorm' ? 'rgba(150, 130, 255, 0.15)' : 'rgba(100, 120, 255, 0.1)'
    : 'rgba(255, 200, 50, 0.08)';

  return (
    <motion.div
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2 }}
    >
      {/* Primary gradient background — driven by weather + location day/night */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: `linear-gradient(180deg, ${backgroundColor} 0%, ${backgroundColorEnd} 100%)`,
        }}
        transition={{ duration: 3, ease: 'easeInOut' }}
      />

      {/* Night glow orbs — OPACITY ONLY, NO SCALE */}
      <AnimatePresence>
        {isNightMode && weather === 'clear' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.15, 0.25, 0.15] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
              className="absolute top-1/4 right-1/4"
              style={{
                width: '300px', height: '300px', borderRadius: '50%',
                background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                filter: 'blur(40px)',
              }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.2, 0.1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
              className="absolute bottom-1/4 left-1/4"
              style={{
                width: '400px', height: '400px', borderRadius: '50%',
                background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                filter: 'blur(60px)',
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to top, rgba(0,0,0,${isNightMode ? 0.4 : 0.15}) 0%, transparent 25%)`,
          transition: 'all 3s ease-in-out',
        }}
      />

      {/* Night Sky: keep the night shell stable even after weather/background sync */}
      <NightSkyOverlay
        isNightMode={isNightMode}
        isDeepNight={isDeepNight}
        currentTime={currentTime}
        phase={skyPhase}
      />

      {/* Weather overlay: rain, snow, thunder, clouds, fog */}
      <WeatherOverlay weather={overlayType} isNight={isNightMode} />

      {/* SIMULATION INDICATOR */}
      {simulationEnabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-cyan-500/20 border border-cyan-400/50 rounded-lg px-3 py-1.5 backdrop-blur-sm"
        >
          <span className="text-cyan-400 text-xs font-mono font-bold animate-pulse">SIM</span>
          <span className="text-white font-mono text-sm">{simulatedHour.toString().padStart(2, '0')}:00</span>
        </motion.div>
      )}

      {/* Phase + weather indicator (dev only) */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-4 left-4 text-xs text-white/30 font-mono">
          {skyPhase} | {weather}{temperature !== null ? ` ${temperature}°C` : ''} | {locationName || '...'} | {simulationEnabled ? `SIM:${simulatedHour}:00` : localTime}
        </div>
      )}
    </motion.div>
  );
});

export default CircadianBackground;
