/**
 * EMOTION PARTICLES - Animated reactions that appear during emotional moments
 * Hearts, sparkles, blush effects, tear drops based on current emotion state
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type AvatarEmotionState, getCoreEmotion } from '@/utils/avatarEmotionClassifier';

interface EmotionParticlesProps {
  emotion: AvatarEmotionState;
  isSpeaking?: boolean;
}

type ParticleType = 'heart' | 'sparkle' | 'tear' | 'fire' | 'star' | 'blush' | 'snowflake' | 'lightning' | 'flower' | 'bubble';

interface ParticleConfig {
  type: ParticleType;
  count: number;
  emoji: string;
  color: string;
  size: [number, number]; // min, max
  speed: [number, number]; // min, max duration
  spread: number; // horizontal spread %
  opacity: [number, number];
  direction: 'up' | 'down' | 'float' | 'radial';
}

const EMOTION_PARTICLES: Partial<Record<AvatarEmotionState, ParticleConfig>> = {
  // Loving family
  loving:     { type: 'heart', count: 8, emoji: '💗', color: '#ff69b4', size: [14, 22], speed: [3, 5], spread: 80, opacity: [0.5, 0.9], direction: 'up' },
  romantic:   { type: 'heart', count: 12, emoji: '💕', color: '#ff1493', size: [12, 24], speed: [2.5, 4.5], spread: 90, opacity: [0.6, 1], direction: 'up' },
  caring:     { type: 'heart', count: 5, emoji: '🤗', color: '#ffb6c1', size: [16, 20], speed: [4, 6], spread: 60, opacity: [0.4, 0.7], direction: 'float' },
  flirty:     { type: 'sparkle', count: 10, emoji: '✨', color: '#ff69b4', size: [10, 18], speed: [2, 4], spread: 100, opacity: [0.6, 1], direction: 'radial' },
  tender:     { type: 'flower', count: 6, emoji: '🌸', color: '#ffb7c5', size: [14, 20], speed: [4, 7], spread: 70, opacity: [0.5, 0.8], direction: 'down' },
  shy:        { type: 'blush', count: 3, emoji: '💫', color: '#ffb6c1', size: [8, 12], speed: [5, 8], spread: 30, opacity: [0.3, 0.5], direction: 'float' },
  sympathetic:{ type: 'heart', count: 4, emoji: '💛', color: '#ffd700', size: [12, 16], speed: [4, 6], spread: 50, opacity: [0.4, 0.7], direction: 'up' },

  // Happy family
  happy:      { type: 'sparkle', count: 8, emoji: '✨', color: '#ffd700', size: [10, 16], speed: [2.5, 4], spread: 80, opacity: [0.5, 0.9], direction: 'radial' },
  joyful:     { type: 'star', count: 10, emoji: '⭐', color: '#ffdf00', size: [12, 20], speed: [2, 3.5], spread: 100, opacity: [0.6, 1], direction: 'radial' },
  excited:    { type: 'fire', count: 12, emoji: '🔥', color: '#ff6347', size: [14, 22], speed: [1.5, 3], spread: 90, opacity: [0.7, 1], direction: 'up' },
  playful:    { type: 'bubble', count: 8, emoji: '🫧', color: '#87ceeb', size: [10, 18], speed: [3, 5], spread: 80, opacity: [0.4, 0.7], direction: 'up' },
  proud:      { type: 'star', count: 6, emoji: '🌟', color: '#ffd700', size: [16, 24], speed: [3, 5], spread: 60, opacity: [0.6, 0.9], direction: 'up' },
  grateful:   { type: 'sparkle', count: 6, emoji: '🙏', color: '#ffd700', size: [14, 18], speed: [4, 6], spread: 50, opacity: [0.5, 0.8], direction: 'float' },
  confident:  { type: 'star', count: 5, emoji: '💪', color: '#ffa500', size: [14, 20], speed: [3, 5], spread: 50, opacity: [0.5, 0.8], direction: 'up' },
  inspired:   { type: 'sparkle', count: 8, emoji: '💡', color: '#fffacd', size: [12, 18], speed: [2.5, 4], spread: 70, opacity: [0.6, 0.9], direction: 'up' },

  // Sad family
  sad:        { type: 'tear', count: 4, emoji: '💧', color: '#4169e1', size: [8, 12], speed: [3, 5], spread: 30, opacity: [0.3, 0.6], direction: 'down' },
  crying:     { type: 'tear', count: 8, emoji: '😢', color: '#4682b4', size: [10, 14], speed: [2, 4], spread: 40, opacity: [0.5, 0.8], direction: 'down' },
  heartbroken:{ type: 'heart', count: 6, emoji: '💔', color: '#8b0000', size: [12, 18], speed: [3, 5], spread: 60, opacity: [0.4, 0.7], direction: 'down' },
  lonely:     { type: 'snowflake', count: 5, emoji: '❄️', color: '#b0c4de', size: [10, 16], speed: [5, 8], spread: 80, opacity: [0.2, 0.5], direction: 'down' },

  // Angry family
  angry:      { type: 'fire', count: 8, emoji: '🔥', color: '#ff4500', size: [14, 22], speed: [1.5, 3], spread: 70, opacity: [0.6, 0.9], direction: 'up' },
  frustrated: { type: 'lightning', count: 5, emoji: '⚡', color: '#ff6347', size: [14, 20], speed: [1, 2.5], spread: 60, opacity: [0.6, 0.9], direction: 'radial' },

  // Surprised family
  amazed:     { type: 'sparkle', count: 12, emoji: '🤯', color: '#ff69b4', size: [12, 20], speed: [2, 4], spread: 100, opacity: [0.6, 1], direction: 'radial' },
  surprised:  { type: 'star', count: 6, emoji: '❗', color: '#ffd700', size: [12, 18], speed: [2, 3.5], spread: 80, opacity: [0.5, 0.9], direction: 'radial' },

  // Peaceful/content
  peaceful:   { type: 'flower', count: 5, emoji: '🌿', color: '#90ee90', size: [12, 18], speed: [5, 8], spread: 70, opacity: [0.3, 0.6], direction: 'float' },
  content:    { type: 'sparkle', count: 4, emoji: '☀️', color: '#ffd700', size: [10, 14], speed: [5, 7], spread: 50, opacity: [0.3, 0.5], direction: 'float' },
};

function generateParticle(config: ParticleConfig, index: number) {
  const { size, speed, spread, opacity, direction } = config;
  const pSize = size[0] + Math.random() * (size[1] - size[0]);
  const pSpeed = speed[0] + Math.random() * (speed[1] - speed[0]);
  const pOpacity = opacity[0] + Math.random() * (opacity[1] - opacity[0]);
  const xStart = 50 + (Math.random() - 0.5) * spread;
  const delay = Math.random() * 2;

  let yStart: number, yEnd: number, xEnd: number;
  switch (direction) {
    case 'up':
      yStart = 80 + Math.random() * 20;
      yEnd = -10 - Math.random() * 20;
      xEnd = xStart + (Math.random() - 0.5) * 30;
      break;
    case 'down':
      yStart = 10 + Math.random() * 20;
      yEnd = 100 + Math.random() * 10;
      xEnd = xStart + (Math.random() - 0.5) * 15;
      break;
    case 'float':
      yStart = 30 + Math.random() * 40;
      yEnd = yStart + (Math.random() - 0.5) * 20;
      xEnd = xStart + (Math.random() - 0.5) * 20;
      break;
    case 'radial':
    default:
      yStart = 50;
      yEnd = 50 + (Math.random() - 0.5) * 80;
      xEnd = 50 + (Math.random() - 0.5) * 80;
      break;
  }

  return { index, pSize, pSpeed, pOpacity, xStart, yStart, xEnd, yEnd, delay };
}

export default function EmotionParticles({ emotion, isSpeaking = false }: EmotionParticlesProps) {
  const config = EMOTION_PARTICLES[emotion];
  
  const particles = useMemo(() => {
    if (!config) return [];
    const count = isSpeaking ? Math.min(config.count + 4, 16) : config.count;
    return Array.from({ length: count }, (_, i) => generateParticle(config, i));
  }, [emotion, isSpeaking, config]);

  if (!config || particles.length === 0) return null;

  return (
    <div className="absolute inset-0 z-[17] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={`${emotion}-${p.index}`}
            className="absolute select-none"
            style={{ fontSize: p.pSize, left: `${p.xStart}%`, top: `${p.yStart}%` }}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{
              opacity: [0, p.pOpacity, p.pOpacity, 0],
              scale: [0.3, 1, 1.1, 0.5],
              x: `${p.xEnd - p.xStart}%`,
              y: `${p.yEnd - p.yStart}%`,
              rotate: [0, (Math.random() - 0.5) * 40],
            }}
            transition={{
              duration: p.pSpeed,
              delay: p.delay,
              repeat: Infinity,
              repeatDelay: Math.random() * 1.5,
              ease: 'easeInOut',
            }}
          >
            {config.emoji}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Blush overlay for shy/embarrassed/romantic */}
      {(emotion === 'shy' || emotion === 'embarrassed' || emotion === 'romantic' || emotion === 'flirty') && (
        <motion.div
          className="absolute z-[18] pointer-events-none"
          style={{
            left: '25%', right: '25%', top: '35%', height: '12%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,100,130,0.18) 0%, transparent 70%)',
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}
