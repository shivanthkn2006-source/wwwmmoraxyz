// ═══════════════════════════════════════════════════════════════════════════════
// NIGHT SKY OVERLAY - Immersive celestial system for Zoe Infinity
// 5000 stars, shooting stars, crescent moon, nebulas, distant planets
// Pure CSS/Canvas — no Three.js dependency
// ═══════════════════════════════════════════════════════════════════════════════

import { memo, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NightSkyOverlayProps {
  currentTime?: string;
  isNightMode: boolean;
  isDeepNight: boolean;
  phase: string;
}

// ── Star field generation (canvas-based for 5000 stars) ──────────────────────
const StarCanvas = memo(function StarCanvas({ isVisible }: { isVisible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Generate 5000 stars with varied properties
    const stars = Array.from({ length: 5000 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 0.3,
      brightness: Math.random(),
      twinkleSpeed: 0.5 + Math.random() * 2,
      twinkleOffset: Math.random() * Math.PI * 2,
      // Some stars have color tints
      hue: Math.random() > 0.85 ? (Math.random() > 0.5 ? 220 : 30) : 0,
      saturation: Math.random() > 0.85 ? 40 + Math.random() * 30 : 0,
    }));

    let startTime = performance.now();

    const draw = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      for (const star of stars) {
        const twinkle = 0.3 + 0.7 * ((Math.sin(elapsed * star.twinkleSpeed + star.twinkleOffset) + 1) / 2);
        const alpha = star.brightness * twinkle * 0.9;

        if (star.hue > 0) {
          ctx.fillStyle = `hsla(${star.hue}, ${star.saturation}%, 85%, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`;
        }

        const px = star.x * w;
        const py = star.y * h;

        if (star.size > 1.8) {
          // Bright stars get a subtle glow
          ctx.beginPath();
          ctx.arc(px, py, star.size * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 220, 255, ${alpha * 0.15})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(px, py, star.size * 0.5, 0, Math.PI * 2);
        if (star.hue > 0) {
          ctx.fillStyle = `hsla(${star.hue}, ${star.saturation}%, 85%, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`;
        }
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <motion.canvas
      ref={canvasRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2 }}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
});

// ── Shooting Stars ───────────────────────────────────────────────────────────
const ShootingStar = memo(function ShootingStar({ delay }: { delay: number }) {
  const startX = 10 + Math.random() * 60;
  const startY = 5 + Math.random() * 30;
  const angle = 25 + Math.random() * 20;
  const length = 80 + Math.random() * 120;

  return (
    <motion.div
      initial={{ opacity: 0, x: 0, y: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [0, Math.cos(angle * Math.PI / 180) * length],
        y: [0, Math.sin(angle * Math.PI / 180) * length],
      }}
      transition={{
        duration: 0.8 + Math.random() * 0.5,
        delay,
        repeat: Infinity,
        repeatDelay: 8 + Math.random() * 15,
        ease: 'easeOut',
      }}
      className="absolute pointer-events-none"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        width: '2px',
        height: '2px',
        borderRadius: '50%',
        background: 'white',
        boxShadow: `
          0 0 4px 1px rgba(255, 255, 255, 0.8),
          -${length * 0.3}px -${length * 0.15}px ${length * 0.2}px rgba(200, 220, 255, 0.3)
        `,
        zIndex: 2,
      }}
    >
      {/* Trail */}
      <div
        className="absolute"
        style={{
          width: `${40 + Math.random() * 40}px`,
          height: '1px',
          background: 'linear-gradient(90deg, rgba(200, 220, 255, 0.6), transparent)',
          transform: `rotate(${180 + angle}deg)`,
          transformOrigin: 'left center',
          left: 0,
          top: 0,
        }}
      />
    </motion.div>
  );
});

// ── Crescent Moon ────────────────────────────────────────────────────────────
const CrescentMoon = memo(function CrescentMoon() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 3, ease: 'easeOut' }}
      className="absolute pointer-events-none"
      style={{
        top: '8%',
        right: '12%',
        zIndex: 2,
      }}
    >
      {/* Moon glow */}
      <div
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 248, 220, 0.15) 0%, transparent 70%)',
          position: 'absolute',
          top: '-20px',
          left: '-20px',
          filter: 'blur(15px)',
        }}
      />
      {/* Moon body */}
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 40%, #fef3c7 0%, #fde68a 40%, #d4a574 100%)',
          boxShadow: '0 0 30px rgba(255, 248, 220, 0.3), 0 0 60px rgba(255, 248, 220, 0.1)',
          position: 'relative',
        }}
      >
        {/* Crescent shadow */}
        <div
          style={{
            position: 'absolute',
            width: '50px',
            height: '60px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 50%, #020810 0%, #020810 80%, transparent 100%)',
            top: '0',
            left: '18px',
          }}
        />
        {/* Surface details */}
        <div style={{ position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(180, 150, 100, 0.3)', top: '20px', left: '10px' }} />
        <div style={{ position: 'absolute', width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(180, 150, 100, 0.2)', top: '35px', left: '14px' }} />
        <div style={{ position: 'absolute', width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(180, 150, 100, 0.25)', top: '15px', left: '6px' }} />
      </div>
    </motion.div>
  );
});

// ── Nebulas ──────────────────────────────────────────────────────────────────
const Nebulas = memo(function Nebulas() {
  return (
    <>
      {/* Purple/blue nebula - top left */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute pointer-events-none"
        style={{
          top: '5%',
          left: '5%',
          width: '500px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.4) 0%, rgba(59, 130, 246, 0.2) 40%, transparent 70%)',
          filter: 'blur(50px)',
          transform: 'rotate(-15deg)',
          zIndex: 1,
        }}
      />

      {/* Cyan/teal nebula - center right */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute pointer-events-none"
        style={{
          top: '30%',
          right: '0%',
          width: '600px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(6, 182, 212, 0.3) 0%, rgba(45, 212, 191, 0.15) 40%, transparent 70%)',
          filter: 'blur(60px)',
          transform: 'rotate(20deg)',
          zIndex: 1,
        }}
      />

      {/* Rose/amber nebula - bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.04, 0.08, 0.04] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 10 }}
        className="absolute pointer-events-none"
        style={{
          bottom: '10%',
          left: '20%',
          width: '700px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(244, 63, 94, 0.2) 0%, rgba(251, 146, 60, 0.1) 40%, transparent 70%)',
          filter: 'blur(70px)',
          transform: 'rotate(-10deg)',
          zIndex: 1,
        }}
      />
    </>
  );
});

// ── Distant Planets ─────────────────────────────────────────────────────────
const DistantPlanets = memo(function DistantPlanets() {
  return (
    <>
      {/* Gas giant - subtle, far away */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.25 }}
        transition={{ duration: 4 }}
        className="absolute pointer-events-none"
        style={{
          bottom: '25%',
          right: '8%',
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 35%, #c4b5a0 0%, #8b7355 50%, #4a3728 100%)',
            boxShadow: '0 0 8px rgba(200, 180, 150, 0.2)',
          }}
        />
        {/* Ring */}
        <div
          style={{
            position: 'absolute',
            width: '30px',
            height: '6px',
            border: '1px solid rgba(200, 180, 150, 0.25)',
            borderRadius: '50%',
            top: '7px',
            left: '-6px',
            transform: 'rotate(-15deg)',
          }}
        />
      </motion.div>

      {/* Small reddish planet */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ duration: 5, delay: 2 }}
        className="absolute pointer-events-none"
        style={{
          top: '40%',
          left: '6%',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #d4a574 0%, #8b4513 100%)',
          boxShadow: '0 0 4px rgba(180, 120, 80, 0.15)',
          zIndex: 2,
        }}
      />

      {/* Tiny blue-ish planet */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 6, delay: 3 }}
        className="absolute pointer-events-none"
        style={{
          top: '18%',
          left: '45%',
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 40%, #93c5fd 0%, #1e3a5f 100%)',
          boxShadow: '0 0 3px rgba(147, 197, 253, 0.2)',
          zIndex: 2,
        }}
      />
    </>
  );
});

// ── Main Night Sky Overlay ──────────────────────────────────────────────────
export const NightSkyOverlay = memo(function NightSkyOverlay({
  currentTime,
  isNightMode,
  isDeepNight,
  phase,
}: NightSkyOverlayProps) {
  // Generate shooting star delays (stable across renders)
  const shootingStarDelays = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => i * 3 + Math.random() * 5),
  []);

  return (
    <AnimatePresence>
      {isNightMode && (
        <motion.div
          key="night-sky"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 3 }}
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 1 }}
        >
          {/* 5000 stars via canvas */}
          <StarCanvas isVisible={isNightMode} />

          {/* Nebulas */}
          <Nebulas />

          {/* Moon */}
          <CrescentMoon />

          {/* Distant planets */}
          {isDeepNight && <DistantPlanets />}

          {/* Shooting stars */}
          {shootingStarDelays.map((delay, i) => (
            <ShootingStar key={i} delay={delay} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default NightSkyOverlay;