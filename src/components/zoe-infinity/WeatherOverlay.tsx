/**
 * WeatherOverlay — Canvas/CSS weather effects for Zoe Infinity background.
 * Rain drops, snow particles, lightning flashes, cloud layers, fog.
 * Driven by useWeatherBackground weather condition.
 */

import { memo, useEffect, useRef, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WeatherCondition } from '@/hooks/useWeatherBackground';

interface WeatherOverlayProps {
  weather: WeatherCondition;
  isNight: boolean;
}

// ── Rain Canvas ──────────────────────────────────────────────────────────────
const RainCanvas = memo(function RainCanvas({ intensity }: { intensity: 'light' | 'normal' | 'heavy' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const dropCount = intensity === 'heavy' ? 400 : intensity === 'normal' ? 200 : 80;
    const drops = Array.from({ length: dropCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      length: 15 + Math.random() * 20,
      speed: 12 + Math.random() * 10,
      opacity: 0.15 + Math.random() * 0.25,
      wind: intensity === 'heavy' ? 3 + Math.random() * 3 : 1 + Math.random() * 2,
    }));

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const drop of drops) {
        ctx.strokeStyle = `rgba(174, 194, 224, ${drop.opacity})`;
        ctx.lineWidth = intensity === 'heavy' ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + drop.wind, drop.y + drop.length);
        ctx.stroke();

        drop.y += drop.speed;
        drop.x += drop.wind * 0.3;

        if (drop.y > h) {
          drop.y = -drop.length;
          drop.x = Math.random() * w;
        }
        if (drop.x > w) drop.x = 0;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [intensity]);

  return (
    <motion.canvas
      ref={canvasRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2 }}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 3 }}
    />
  );
});

// ── Snow Canvas ──────────────────────────────────────────────────────────────
const SnowCanvas = memo(function SnowCanvas({ heavy }: { heavy: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const flakeCount = heavy ? 300 : 120;
    const flakes = Array.from({ length: flakeCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 1 + Math.random() * 3,
      speed: 0.5 + Math.random() * 2,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.01 + Math.random() * 0.03,
      opacity: 0.4 + Math.random() * 0.5,
    }));

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const f of flakes) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
        ctx.fill();

        f.y += f.speed;
        f.wobble += f.wobbleSpeed;
        f.x += Math.sin(f.wobble) * 0.5;

        if (f.y > h + f.radius) {
          f.y = -f.radius;
          f.x = Math.random() * w;
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [heavy]);

  return (
    <motion.canvas
      ref={canvasRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2 }}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 3 }}
    />
  );
});

// ── Lightning Flash ──────────────────────────────────────────────────────────
const LightningFlash = memo(function LightningFlash() {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const triggerFlash = () => {
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
      // Double flash sometimes
      if (Math.random() > 0.5) {
        setTimeout(() => {
          setFlash(true);
          setTimeout(() => setFlash(false), 80);
        }, 200);
      }
    };

    // Random lightning every 4-12 seconds
    const schedule = () => {
      const delay = 4000 + Math.random() * 8000;
      return setTimeout(() => {
        triggerFlash();
        timerRef = schedule();
      }, delay);
    };

    let timerRef = schedule();
    return () => clearTimeout(timerRef);
  }, []);

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.05 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 20%, rgba(200, 210, 255, 0.8) 0%, rgba(150, 170, 255, 0.3) 30%, transparent 70%)',
            zIndex: 4,
          }}
        />
      )}
    </AnimatePresence>
  );
});

// ── Cloud Layer ──────────────────────────────────────────────────────────────
const CloudLayer = memo(function CloudLayer({ density, isNight }: { density: 'light' | 'medium' | 'heavy'; isNight: boolean }) {
  const opacityMap = { light: 0.15, medium: 0.3, heavy: 0.5 };
  const baseOpacity = opacityMap[density];
  const color = isNight ? '30, 35, 50' : '160, 175, 200';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 3 }}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
    >
      {/* Upper cloud band */}
      <motion.div
        animate={{ x: [0, 30, 0] }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          top: '5%',
          left: '-10%',
          right: '-10%',
          height: '25%',
          background: `radial-gradient(ellipse 80% 60% at 30% 50%, rgba(${color}, ${baseOpacity}) 0%, transparent 70%),
                       radial-gradient(ellipse 70% 50% at 70% 40%, rgba(${color}, ${baseOpacity * 0.7}) 0%, transparent 60%)`,
          filter: 'blur(20px)',
        }}
      />
      {/* Mid cloud band */}
      <motion.div
        animate={{ x: [0, -20, 0] }}
        transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          top: '20%',
          left: '-5%',
          right: '-5%',
          height: '20%',
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(${color}, ${baseOpacity * 0.6}) 0%, transparent 65%),
                       radial-gradient(ellipse 50% 40% at 20% 60%, rgba(${color}, ${baseOpacity * 0.5}) 0%, transparent 55%)`,
          filter: 'blur(25px)',
        }}
      />
    </motion.div>
  );
});

// ── Fog Layer ────────────────────────────────────────────────────────────────
const FogLayer = memo(function FogLayer({ isNight }: { isNight: boolean }) {
  const color = isNight ? '40, 45, 60' : '190, 200, 215';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.3, 0.5, 0.3] }}
      transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(ellipse 100% 80% at 50% 80%, rgba(${color}, 0.5) 0%, transparent 60%),
          radial-gradient(ellipse 80% 60% at 30% 50%, rgba(${color}, 0.3) 0%, transparent 50%)
        `,
        filter: 'blur(30px)',
        zIndex: 3,
      }}
    />
  );
});

// ── Main Weather Overlay ─────────────────────────────────────────────────────
export const WeatherOverlay = memo(function WeatherOverlay({ weather, isNight }: WeatherOverlayProps) {
  return (
    <AnimatePresence>
      {/* Clouds for overcast/rainy conditions */}
      {(weather === 'partly_cloudy') && (
        <CloudLayer key="clouds-light" density="light" isNight={isNight} />
      )}
      {(weather === 'cloudy') && (
        <CloudLayer key="clouds-med" density="medium" isNight={isNight} />
      )}
      {(weather === 'rain' || weather === 'heavy_rain' || weather === 'thunderstorm') && (
        <CloudLayer key="clouds-heavy" density="heavy" isNight={isNight} />
      )}

      {/* Fog */}
      {weather === 'fog' && <FogLayer key="fog" isNight={isNight} />}

      {/* Drizzle */}
      {weather === 'drizzle' && (
        <>
          <CloudLayer key="drizzle-clouds" density="medium" isNight={isNight} />
          <RainCanvas key="drizzle" intensity="light" />
        </>
      )}

      {/* Rain */}
      {weather === 'rain' && <RainCanvas key="rain" intensity="normal" />}

      {/* Heavy rain */}
      {weather === 'heavy_rain' && <RainCanvas key="heavy-rain" intensity="heavy" />}

      {/* Snow */}
      {weather === 'snow' && <SnowCanvas key="snow" heavy={false} />}
      {weather === 'heavy_snow' && <SnowCanvas key="heavy-snow" heavy={true} />}

      {/* Thunderstorm = heavy rain + lightning */}
      {weather === 'thunderstorm' && (
        <>
          <RainCanvas key="thunder-rain" intensity="heavy" />
          <LightningFlash key="lightning" />
        </>
      )}
    </AnimatePresence>
  );
});

export default WeatherOverlay;
