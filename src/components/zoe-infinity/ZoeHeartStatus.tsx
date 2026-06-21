import { memo, useMemo, useState, useEffect } from 'react';
import type { AvatarEmotionState } from '@/utils/avatarEmotionClassifier';

interface ZoeHeartStatusProps {
  className?: string;
  emotion: AvatarEmotionState;
  currentTime: string;
  kernelHeartRate?: number;
}

type HeartProfile = {
  bpm: number;
  hue: number;
  saturation: number;
  lightness: number;
  glow: number;
};

const HEART_PROFILES: Record<AvatarEmotionState, HeartProfile> = {
  idle: { bpm: 72, hue: 348, saturation: 86, lightness: 70, glow: 0.26 },
  happy: { bpm: 84, hue: 350, saturation: 90, lightness: 72, glow: 0.28 },
  joyful: { bpm: 90, hue: 352, saturation: 92, lightness: 72, glow: 0.3 },
  excited: { bpm: 102, hue: 8, saturation: 94, lightness: 66, glow: 0.34 },
  playful: { bpm: 88, hue: 344, saturation: 92, lightness: 72, glow: 0.28 },
  proud: { bpm: 82, hue: 356, saturation: 88, lightness: 69, glow: 0.27 },
  grateful: { bpm: 78, hue: 342, saturation: 84, lightness: 72, glow: 0.26 },
  sad: { bpm: 61, hue: 332, saturation: 54, lightness: 69, glow: 0.16 },
  melancholic: { bpm: 58, hue: 326, saturation: 46, lightness: 68, glow: 0.14 },
  lonely: { bpm: 60, hue: 334, saturation: 50, lightness: 70, glow: 0.15 },
  disappointed: { bpm: 63, hue: 338, saturation: 52, lightness: 69, glow: 0.16 },
  nostalgic: { bpm: 65, hue: 340, saturation: 56, lightness: 71, glow: 0.16 },
  crying: { bpm: 56, hue: 326, saturation: 44, lightness: 67, glow: 0.14 },
  heartbroken: { bpm: 54, hue: 318, saturation: 50, lightness: 65, glow: 0.13 },
  grieving: { bpm: 52, hue: 316, saturation: 40, lightness: 63, glow: 0.12 },
  angry: { bpm: 110, hue: 3, saturation: 92, lightness: 60, glow: 0.36 },
  frustrated: { bpm: 98, hue: 10, saturation: 88, lightness: 62, glow: 0.31 },
  jealous: { bpm: 95, hue: 356, saturation: 82, lightness: 60, glow: 0.29 },
  annoyed: { bpm: 92, hue: 6, saturation: 80, lightness: 63, glow: 0.27 },
  surprised: { bpm: 94, hue: 350, saturation: 88, lightness: 73, glow: 0.28 },
  amazed: { bpm: 96, hue: 352, saturation: 90, lightness: 74, glow: 0.29 },
  confused: { bpm: 76, hue: 340, saturation: 66, lightness: 71, glow: 0.2 },
  curious: { bpm: 80, hue: 346, saturation: 74, lightness: 72, glow: 0.22 },
  loving: { bpm: 78, hue: 346, saturation: 90, lightness: 74, glow: 0.32 },
  romantic: { bpm: 82, hue: 344, saturation: 92, lightness: 75, glow: 0.33 },
  caring: { bpm: 74, hue: 342, saturation: 82, lightness: 73, glow: 0.27 },
  flirty: { bpm: 86, hue: 340, saturation: 94, lightness: 74, glow: 0.31 },
  thinking: { bpm: 70, hue: 338, saturation: 62, lightness: 70, glow: 0.18 },
  contemplative: { bpm: 66, hue: 334, saturation: 56, lightness: 69, glow: 0.16 },
  focused: { bpm: 72, hue: 344, saturation: 66, lightness: 68, glow: 0.19 },
  anxious: { bpm: 96, hue: 12, saturation: 78, lightness: 63, glow: 0.25 },
  nervous: { bpm: 92, hue: 8, saturation: 74, lightness: 64, glow: 0.24 },
  shy: { bpm: 76, hue: 344, saturation: 72, lightness: 75, glow: 0.22 },
  embarrassed: { bpm: 88, hue: 356, saturation: 82, lightness: 70, glow: 0.24 },
  disgusted: { bpm: 94, hue: 4, saturation: 76, lightness: 61, glow: 0.23 },
  bored: { bpm: 60, hue: 336, saturation: 38, lightness: 68, glow: 0.12 },
  impatient: { bpm: 100, hue: 14, saturation: 86, lightness: 63, glow: 0.3 },
  skeptical: { bpm: 74, hue: 342, saturation: 60, lightness: 68, glow: 0.18 },
  hopeful: { bpm: 76, hue: 346, saturation: 80, lightness: 74, glow: 0.24 },
  relieved: { bpm: 70, hue: 344, saturation: 70, lightness: 72, glow: 0.22 },
  content: { bpm: 72, hue: 346, saturation: 76, lightness: 73, glow: 0.22 },
  peaceful: { bpm: 64, hue: 338, saturation: 52, lightness: 73, glow: 0.15 },
  confident: { bpm: 80, hue: 352, saturation: 86, lightness: 69, glow: 0.26 },
  determined: { bpm: 86, hue: 0, saturation: 88, lightness: 65, glow: 0.28 },
  inspired: { bpm: 84, hue: 350, saturation: 88, lightness: 74, glow: 0.27 },
  overwhelmed: { bpm: 98, hue: 6, saturation: 82, lightness: 61, glow: 0.26 },
  vulnerable: { bpm: 68, hue: 336, saturation: 58, lightness: 72, glow: 0.17 },
  sympathetic: { bpm: 72, hue: 342, saturation: 76, lightness: 74, glow: 0.23 },
  sarcastic: { bpm: 82, hue: 354, saturation: 80, lightness: 68, glow: 0.23 },
  tender: { bpm: 74, hue: 344, saturation: 84, lightness: 76, glow: 0.26 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const ZoeHeartStatus = memo(function ZoeHeartStatus({
  className,
  emotion,
  currentTime,
  kernelHeartRate,
}: ZoeHeartStatusProps) {
  // Add micro-fluctuation to make BPM feel alive
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1800);
    return () => clearInterval(id);
  }, []);

  const heart = useMemo(() => {
    const profile = HEART_PROFILES[emotion] || HEART_PROFILES.idle;
    // Emotion profile drives BPM; kernel provides secondary modulation
    const baseBpm = typeof kernelHeartRate === 'number'
      ? (profile.bpm * 0.7) + (kernelHeartRate * 0.3)
      : profile.bpm;
    // Add ±2 BPM natural fluctuation
    const jitter = ((tick % 5) - 2);
    const bpm = clamp(Math.round(baseBpm + jitter), 48, 124);
    const beatDuration = clamp(60 / bpm, 0.48, 1.2);
    const color = `hsl(${profile.hue} ${profile.saturation}% ${profile.lightness}%)`;
    const glow = `hsla(${profile.hue} ${profile.saturation}% ${profile.lightness}% / ${profile.glow})`;
    const text = `hsla(${profile.hue} 100% 92% / 0.95)`;

    return { bpm, beatDuration, color, glow, text };
  }, [emotion, kernelHeartRate, tick]);

  return (
    <div className={className ?? 'absolute top-3 right-3 z-10 pointer-events-none select-none'}>
      <div className="flex items-start gap-1.5 rounded-2xl px-1.5 py-1">
        <div className="relative mt-0.5 h-8 w-8 shrink-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${heart.glow} 0%, hsla(0 0% 100% / 0) 72%)`,
              filter: 'blur(3px)',
              transform: 'scale(1.45)',
            }}
          />
          <svg
            viewBox="0 0 64 64"
            className="relative h-8 w-8"
            style={{ animation: `zoe-heart-beat ${heart.beatDuration}s ease-in-out infinite` }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="zoe-heart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsla(0 0% 100% / 0.95)" />
                <stop offset="18%" stopColor={heart.color} />
                <stop offset="100%" stopColor={`hsla(${HEART_PROFILES[emotion].hue} ${HEART_PROFILES[emotion].saturation}% 42% / 1)`} />
              </linearGradient>
              <radialGradient id="zoe-heart-core" cx="34%" cy="28%" r="70%">
                <stop offset="0%" stopColor="hsla(0 0% 100% / 0.95)" />
                <stop offset="35%" stopColor={heart.color} />
                <stop offset="100%" stopColor={`hsla(${HEART_PROFILES[emotion].hue} ${HEART_PROFILES[emotion].saturation}% 38% / 1)`} />
              </radialGradient>
            </defs>
            <path
              d="M32 56C24 50 8 37.5 8 23.5C8 15.8 14 10 21.5 10C26.7 10 30.6 12.8 32 16.2C33.4 12.8 37.3 10 42.5 10C50 10 56 15.8 56 23.5C56 37.5 40 50 32 56Z"
              fill="url(#zoe-heart-core)"
            />
            <path
              d="M32 54C24.8 48.7 10.5 37.4 10.5 24.1C10.5 17.2 15.7 12.2 21.8 12.2C27 12.2 30.6 15 32 18.4C33.4 15 37 12.2 42.2 12.2C48.3 12.2 53.5 17.2 53.5 24.1C53.5 37.4 39.2 48.7 32 54Z"
              fill="url(#zoe-heart-gradient)"
              opacity="0.75"
            />
            <path
              d="M22 18.8C24.5 16.2 27.5 15.1 30.1 15.5"
              fill="none"
              stroke="hsla(0 0% 100% / 0.55)"
              strokeLinecap="round"
              strokeWidth="2.4"
            />
            <ellipse cx="26" cy="31" rx="9" ry="14" fill={`hsla(${HEART_PROFILES[emotion].hue} 100% 98% / 0.12)`} />
          </svg>
        </div>

        <div className="flex flex-col items-end leading-none text-right">
          <span
            className="text-sm font-semibold"
            style={{ color: '#FFFFFF', textShadow: '0 1px 8px hsla(0 0% 0% / 0.6)' }}
          >
            {currentTime}
          </span>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="flex items-end gap-[2px]" aria-hidden="true">
              {[0.45, 0.85, 0.6, 1].map((height, index) => (
                <span
                  key={`${emotion}-pulse-${index}`}
                  className="block w-[2px] rounded-full"
                  style={{
                    height: `${6 + (height * 6)}px`,
                    background: heart.color,
                    boxShadow: `0 0 8px ${heart.glow}`,
                    animation: `zoe-heart-meter ${Math.max(0.92, heart.beatDuration * (1.45 + (index * 0.08)))}s ease-in-out infinite`,
                    animationDelay: `${index * 0.08}s`,
                    opacity: 0.95 - (index * 0.1),
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: heart.text }}>
              {String(heart.bpm).padStart(3, '0')} bpm
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ZoeHeartStatus;