/**
 * AVATAR EMOTION AUDIO - Synthesized emotion sounds using Web Audio API
 * Generates laughing, crying, sighing etc. sounds when emotions change.
 * Works fully offline with no external files needed.
 */

import { type AvatarCoreEmotion } from './avatarEmotionClassifier';

let audioCtx: AudioContext | null = null;
let lastPlayedEmotion: AvatarCoreEmotion | null = null;
let lastPlayedAt = 0;
let hasBoundUnlockListeners = false;

function bindUnlockListeners(ctx: AudioContext) {
  if (hasBoundUnlockListeners || typeof window === 'undefined') return;
  hasBoundUnlockListeners = true;

  const unlock = () => {
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

function getAudioCtx(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      bindUnlockListeners(audioCtx);
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playCoreEmotionCue(ctx: AudioContext, emotion: AvatarCoreEmotion) {
  switch (emotion) {
    case 'happy':
      playHappySound(ctx);
      break;
    case 'sad':
      playSadSound(ctx);
      break;
    case 'crying':
      playCryingSound(ctx);
      break;
    case 'angry':
      playAngrySound(ctx);
      break;
    case 'surprised':
      playSurprisedSound(ctx);
      break;
    case 'loving':
      playLovingSound(ctx);
      break;
    case 'thinking':
      playThinkingSound(ctx);
      break;
  }
}

/** Play a short synthesized audio cue for an emotion transition */
export function playEmotionAudioCue(emotion: AvatarCoreEmotion): void {
  // Debounce - don't replay same emotion within 3s
  const now = Date.now();
  if (emotion === lastPlayedEmotion && now - lastPlayedAt < 3000) return;
  if (emotion === 'idle') return;

  const ctx = getAudioCtx();
  if (!ctx) return;

  lastPlayedEmotion = emotion;
  lastPlayedAt = now;

  try {
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => playCoreEmotionCue(ctx, emotion)).catch(() => {});
      return;
    }
    playCoreEmotionCue(ctx, emotion);
  } catch (e) {
    console.warn('[EmotionAudio] Failed to play cue:', e);
  }
}

// Gentle rising chime - like a soft laugh
function playHappySound(ctx: AudioContext) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, t);
  osc.frequency.exponentialRampToValueAtTime(784, t + 0.15);
  osc.frequency.exponentialRampToValueAtTime(1047, t + 0.3);
  gain.gain.setValueAtTime(0.16, t);
  gain.gain.exponentialRampToValueAtTime(0.02, t + 0.5);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.5);
}

// Descending minor tone - melancholic sigh
function playSadSound(ctx: AudioContext) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, t);
  osc.frequency.exponentialRampToValueAtTime(330, t + 0.4);
  osc.frequency.exponentialRampToValueAtTime(262, t + 0.8);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.02, t + 0.8);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.8);
}

// Wobbling tone - sobbing effect
function playCryingSound(ctx: AudioContext) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const gain = ctx.createGain();

  lfo.type = 'sine';
  lfo.frequency.value = 6;
  lfoGain.gain.value = 30;
  lfo.connect(lfoGain).connect(osc.frequency);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(392, t);
  osc.frequency.exponentialRampToValueAtTime(294, t + 1);
  gain.gain.setValueAtTime(0.14, t);
  gain.gain.exponentialRampToValueAtTime(0.02, t + 1);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + 1);
  lfo.stop(t + 1);
}

// Sharp dissonant hit
function playAngrySound(ctx: AudioContext) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.3);
  gain.gain.setValueAtTime(0.13, t);
  gain.gain.exponentialRampToValueAtTime(0.02, t + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}

// Quick ascending arpeggio - gasp
function playSurprisedSound(ctx: AudioContext) {
  const t = ctx.currentTime;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, t + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.02, t + i * 0.06 + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.06);
    osc.stop(t + i * 0.06 + 0.15);
  });
}

// Warm pad - heartbeat-like
function playLovingSound(ctx: AudioContext) {
  const t = ctx.currentTime;
  [262, 330, 392].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.02, t + 0.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.8);
  });
}

// Soft click-hum
function playThinkingSound(ctx: AudioContext) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.02, t + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}
