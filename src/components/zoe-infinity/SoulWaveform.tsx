// ═══════════════════════════════════════════════════════════════════════════════
// SOUL WAVEFORM - Bio-Resonance Display
// ═══════════════════════════════════════════════════════════════════════════════
//
// Visual representation of Zoe's emotional state.
// BATTERY OPTIMIZED: Uses requestAnimationFrame with throttling.
// Runs at adaptive FPS based on device capability.
//
// MODES:
// - ZEN_CALM: Smooth sine waves (Ocean) - Cyan
// - ECSTATIC: High-frequency noise (Fire) - Gold
// - LOVING: Pulsing radial gradient (Heart) - Rose
// - MELANCHOLY: Slow, low waves (Mist) - Indigo
// - ANXIOUS: Jagged, rapid waves (Static) - Orange
// - TIRED: Minimal, fading waves (Dusk) - Purple
// - NEUTRAL: Balanced waves (Flow) - Teal
//
// ═══════════════════════════════════════════════════════════════════════════════

import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { getZoeBioKernel, type BioMood, type BioKernelState } from '@/core/soul/ZoeBioKernel';

interface SoulWaveformProps {
  width?: number;
  height?: number;
  opacity?: number;
  className?: string;
  showHeartRate?: boolean;
  reducedMotion?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOOD VISUAL CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface MoodVisual {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  waveType: 'sine' | 'noise' | 'pulse' | 'jagged' | 'fade';
  frequency: number;
  amplitude: number;
  speed: number;
}

const MOOD_VISUALS: Record<BioMood, MoodVisual> = {
  // NEGATIVE SPECTRUM
  ANGRY: { primaryColor: '#ef4444', secondaryColor: '#dc2626', glowColor: 'rgba(239, 68, 68, 0.3)', waveType: 'jagged', frequency: 0.12, amplitude: 0.5, speed: 2.2 },
  FRUSTRATED: { primaryColor: '#f97316', secondaryColor: '#ea580c', glowColor: 'rgba(249, 115, 22, 0.3)', waveType: 'jagged', frequency: 0.1, amplitude: 0.45, speed: 1.8 },
  SAD: { primaryColor: '#94a3b8', secondaryColor: '#64748b', glowColor: 'rgba(148, 163, 184, 0.2)', waveType: 'sine', frequency: 0.015, amplitude: 0.2, speed: 0.25 },
  MELANCHOLY: { primaryColor: '#818cf8', secondaryColor: '#6366f1', glowColor: 'rgba(129, 140, 248, 0.2)', waveType: 'sine', frequency: 0.015, amplitude: 0.2, speed: 0.3 },
  ANXIOUS: { primaryColor: '#fb923c', secondaryColor: '#f97316', glowColor: 'rgba(251, 146, 60, 0.3)', waveType: 'jagged', frequency: 0.1, amplitude: 0.4, speed: 1.8 },
  STRESSED: { primaryColor: '#fbbf24', secondaryColor: '#f59e0b', glowColor: 'rgba(251, 191, 36, 0.3)', waveType: 'jagged', frequency: 0.08, amplitude: 0.35, speed: 1.5 },
  FEARFUL: { primaryColor: '#a78bfa', secondaryColor: '#8b5cf6', glowColor: 'rgba(167, 139, 250, 0.3)', waveType: 'noise', frequency: 0.06, amplitude: 0.3, speed: 1.2 },
  BORED: { primaryColor: '#9ca3af', secondaryColor: '#6b7280', glowColor: 'rgba(156, 163, 175, 0.2)', waveType: 'fade', frequency: 0.01, amplitude: 0.1, speed: 0.15 },
  LONELY: { primaryColor: '#c084fc', secondaryColor: '#a855f7', glowColor: 'rgba(192, 132, 252, 0.25)', waveType: 'pulse', frequency: 0.03, amplitude: 0.4, speed: 0.6 },
  TIRED: { primaryColor: '#a78bfa', secondaryColor: '#8b5cf6', glowColor: 'rgba(167, 139, 250, 0.2)', waveType: 'fade', frequency: 0.01, amplitude: 0.15, speed: 0.2 },
  DESPAIR: { primaryColor: '#4b5563', secondaryColor: '#374151', glowColor: 'rgba(75, 85, 99, 0.15)', waveType: 'fade', frequency: 0.005, amplitude: 0.08, speed: 0.1 },
  APATHETIC: { primaryColor: '#6b7280', secondaryColor: '#4b5563', glowColor: 'rgba(107, 114, 128, 0.1)', waveType: 'fade', frequency: 0.003, amplitude: 0.05, speed: 0.05 },
  // NEUTRAL SPECTRUM
  NEUTRAL_COMPANION: { primaryColor: '#2dd4bf', secondaryColor: '#14b8a6', glowColor: 'rgba(45, 212, 191, 0.25)', waveType: 'sine', frequency: 0.03, amplitude: 0.35, speed: 0.8 },
  CURIOUS: { primaryColor: '#22d3ee', secondaryColor: '#06b6d4', glowColor: 'rgba(34, 211, 238, 0.3)', waveType: 'sine', frequency: 0.04, amplitude: 0.4, speed: 1.0 },
  FOCUSED: { primaryColor: '#3b82f6', secondaryColor: '#2563eb', glowColor: 'rgba(59, 130, 246, 0.3)', waveType: 'sine', frequency: 0.05, amplitude: 0.35, speed: 0.9 },
  CONTEMPLATIVE: { primaryColor: '#a5b4fc', secondaryColor: '#818cf8', glowColor: 'rgba(165, 180, 252, 0.25)', waveType: 'sine', frequency: 0.02, amplitude: 0.25, speed: 0.4 },
  CONFIDENT: { primaryColor: '#10b981', secondaryColor: '#059669', glowColor: 'rgba(16, 185, 129, 0.35)', waveType: 'sine', frequency: 0.045, amplitude: 0.45, speed: 1.1 },
  // POSITIVE SPECTRUM
  CALM: { primaryColor: '#67e8f9', secondaryColor: '#22d3ee', glowColor: 'rgba(103, 232, 249, 0.25)', waveType: 'sine', frequency: 0.02, amplitude: 0.25, speed: 0.4 },
  PEACEFUL: { primaryColor: '#a5b4fc', secondaryColor: '#818cf8', glowColor: 'rgba(165, 180, 252, 0.25)', waveType: 'sine', frequency: 0.018, amplitude: 0.22, speed: 0.35 },
  ZEN_CALM: { primaryColor: '#22d3ee', secondaryColor: '#06b6d4', glowColor: 'rgba(34, 211, 238, 0.3)', waveType: 'sine', frequency: 0.02, amplitude: 0.3, speed: 0.5 },
  HOPEFUL: { primaryColor: '#4ade80', secondaryColor: '#22c55e', glowColor: 'rgba(74, 222, 128, 0.3)', waveType: 'sine', frequency: 0.035, amplitude: 0.4, speed: 0.7 },
  LOVING: { primaryColor: '#fb7185', secondaryColor: '#f43f5e', glowColor: 'rgba(251, 113, 133, 0.3)', waveType: 'pulse', frequency: 0.04, amplitude: 0.5, speed: 1.0 },
  GRATEFUL: { primaryColor: '#f472b6', secondaryColor: '#ec4899', glowColor: 'rgba(244, 114, 182, 0.3)', waveType: 'pulse', frequency: 0.035, amplitude: 0.45, speed: 0.8 },
  HAPPY: { primaryColor: '#facc15', secondaryColor: '#eab308', glowColor: 'rgba(250, 204, 21, 0.3)', waveType: 'sine', frequency: 0.05, amplitude: 0.5, speed: 1.2 },
  EXCITED: { primaryColor: '#f97316', secondaryColor: '#ea580c', glowColor: 'rgba(249, 115, 22, 0.35)', waveType: 'noise', frequency: 0.07, amplitude: 0.55, speed: 1.8 },
  ECSTATIC: { primaryColor: '#fbbf24', secondaryColor: '#f59e0b', glowColor: 'rgba(251, 191, 36, 0.3)', waveType: 'noise', frequency: 0.08, amplitude: 0.6, speed: 2.0 },
  AMUSED: { primaryColor: '#fcd34d', secondaryColor: '#fbbf24', glowColor: 'rgba(252, 211, 77, 0.35)', waveType: 'pulse', frequency: 0.06, amplitude: 0.5, speed: 1.3 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SOUL WAVEFORM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const SoulWaveform = memo(function SoulWaveform({
  width = 300,
  height = 100,
  opacity = 0.8,
  className = '',
  showHeartRate = false,
  reducedMotion = false,
}: SoulWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  
  const [kernelState, setKernelState] = useState<BioKernelState | null>(null);
  const bioKernel = getZoeBioKernel();

  // BATTERY OPTIMIZATION: Adaptive FPS (30fps max, 15fps on reduced motion)
  const targetFPS = reducedMotion ? 15 : 30;
  const frameInterval = 1000 / targetFPS;

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIBE TO BIO-KERNEL
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const unsubscribe = bioKernel.subscribe(setKernelState);
    bioKernel.start();
    
    // Get initial state
    setKernelState(bioKernel.getState());
    
    return () => {
      unsubscribe();
    };
  }, [bioKernel]);

  // ═══════════════════════════════════════════════════════════════════════════
  // WAVE DRAWING FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const drawSineWave = useCallback((
    ctx: CanvasRenderingContext2D,
    visual: MoodVisual,
    time: number,
    w: number,
    h: number
  ) => {
    const centerY = h / 2;
    const amp = h * visual.amplitude;

    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let x = 0; x < w; x++) {
      const y = centerY + Math.sin((x * visual.frequency) + (time * visual.speed)) * amp;
      ctx.lineTo(x, y);
    }

    // Create gradient stroke
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, visual.primaryColor);
    gradient.addColorStop(0.5, visual.secondaryColor);
    gradient.addColorStop(1, visual.primaryColor);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = visual.glowColor;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  const drawNoiseWave = useCallback((
    ctx: CanvasRenderingContext2D,
    visual: MoodVisual,
    time: number,
    w: number,
    h: number
  ) => {
    const centerY = h / 2;
    const amp = h * visual.amplitude;

    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let x = 0; x < w; x += 2) {
      const noise = (Math.random() - 0.5) * 2;
      const base = Math.sin((x * visual.frequency) + (time * visual.speed));
      const y = centerY + (base + noise * 0.3) * amp;
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = visual.primaryColor;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = visual.glowColor;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  const drawPulseWave = useCallback((
    ctx: CanvasRenderingContext2D,
    visual: MoodVisual,
    time: number,
    w: number,
    h: number
  ) => {
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) * 0.4;
    const pulse = Math.sin(time * visual.speed) * 0.3 + 0.7;
    const radius = maxRadius * pulse;

    // Radial gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, visual.primaryColor);
    gradient.addColorStop(0.7, visual.secondaryColor);
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Outer ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = visual.glowColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  const drawJaggedWave = useCallback((
    ctx: CanvasRenderingContext2D,
    visual: MoodVisual,
    time: number,
    w: number,
    h: number
  ) => {
    const centerY = h / 2;
    const amp = h * visual.amplitude;

    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let x = 0; x < w; x += 5) {
      const jag = ((x + time * 50) % 20 < 10 ? 1 : -1);
      const base = Math.sin((x * visual.frequency) + (time * visual.speed));
      const y = centerY + (base * amp) + (jag * amp * 0.2);
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = visual.primaryColor;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = visual.glowColor;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  const drawFadeWave = useCallback((
    ctx: CanvasRenderingContext2D,
    visual: MoodVisual,
    time: number,
    w: number,
    h: number
  ) => {
    const centerY = h / 2;
    const amp = h * visual.amplitude;
    const fadeOpacity = 0.3 + Math.sin(time * 0.5) * 0.2;

    ctx.globalAlpha = fadeOpacity;
    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let x = 0; x < w; x++) {
      const y = centerY + Math.sin((x * visual.frequency) + (time * visual.speed)) * amp;
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = visual.primaryColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ANIMATION LOOP (BATTERY OPTIMIZED)
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mood = kernelState?.currentMood || 'NEUTRAL_COMPANION';
    const visual = MOOD_VISUALS[mood];

    const animate = (currentTime: number) => {
      // BATTERY OPTIMIZATION: Throttle frame rate
      const elapsed = currentTime - lastFrameTimeRef.current;
      
      if (elapsed < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      lastFrameTimeRef.current = currentTime - (elapsed % frameInterval);
      timeRef.current += 0.016 * visual.speed; // Normalized time step

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw based on wave type
      switch (visual.waveType) {
        case 'sine':
          drawSineWave(ctx, visual, timeRef.current, width, height);
          break;
        case 'noise':
          drawNoiseWave(ctx, visual, timeRef.current, width, height);
          break;
        case 'pulse':
          drawPulseWave(ctx, visual, timeRef.current, width, height);
          break;
        case 'jagged':
          drawJaggedWave(ctx, visual, timeRef.current, width, height);
          break;
        case 'fade':
          drawFadeWave(ctx, visual, timeRef.current, width, height);
          break;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    kernelState?.currentMood,
    width,
    height,
    frameInterval,
    drawSineWave,
    drawNoiseWave,
    drawPulseWave,
    drawJaggedWave,
    drawFadeWave,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const mood = kernelState?.currentMood || 'NEUTRAL_COMPANION';
  const visual = MOOD_VISUALS[mood];

  return (
    <div 
      className={`relative ${className}`}
      style={{ opacity }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg"
        style={{
          background: 'transparent',
        }}
      />
      
      {showHeartRate && kernelState && (
        <div 
          className="absolute bottom-1 right-2 text-xs font-mono"
          style={{ color: visual.primaryColor }}
        >
          ♥ {kernelState.heartRate} bpm
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// MINI SOUL INDICATOR (Compact version for chat bubbles)
// ═══════════════════════════════════════════════════════════════════════════════

export const MiniSoulIndicator = memo(function MiniSoulIndicator({
  size = 24,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const [mood, setMood] = useState<BioMood>('NEUTRAL_COMPANION');
  const bioKernel = getZoeBioKernel();

  useEffect(() => {
    const unsubscribe = bioKernel.subscribe((state) => {
      setMood(state.currentMood);
    });
    setMood(bioKernel.getMood());
    return unsubscribe;
  }, [bioKernel]);

  const visual = MOOD_VISUALS[mood];

  return (
    <div
      className={`rounded-full animate-pulse ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${visual.primaryColor}, ${visual.secondaryColor})`,
        boxShadow: `0 0 ${size / 2}px ${visual.glowColor}`,
      }}
    />
  );
});

export default SoulWaveform;
