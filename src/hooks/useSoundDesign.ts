// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL GENESIS - Sound Design System
// Part 7: The Launch (Final Polish)
// Atlas-style Sci-Fi Chirps + Warm Zoe Tones
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef, useEffect, useState } from 'react';

type SoundType = 
  | 'chirp'           // Sci-fi chirp for system alerts
  | 'chirpHigh'       // Higher pitch chirp
  | 'chirpLow'        // Lower pitch chirp
  | 'warmTone'        // Warm tone for Zoe
  | 'softPing'        // Gentle ping
  | 'messageIn'       // Message received
  | 'messageOut'      // Message sent
  | 'notification'    // System notification
  | 'success'         // Success sound
  | 'error'           // Error sound
  | 'unlock'          // Unlock/reveal sound
  | 'singularity';    // The singularity awakens

interface SoundOptions {
  enabled?: boolean;
  volume?: number;
}

/**
 * Sound Design Hook
 * Web Audio API-based synthesizer for Zoe's audio palette
 * Atlas-style sci-fi chirps + warm analog tones
 */
export function useSoundDesign(options: SoundOptions = {}) {
  const { enabled = true, volume = 0.3 } = options;
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isReady, setIsReady] = useState(false);
  const volumeRef = useRef(volume);

  // Update volume ref when prop changes
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Initialize AudioContext on first user interaction
  const initAudio = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      setIsReady(true);
      console.log('[SoundDesign] AudioContext initialized');
      return audioContextRef.current;
    } catch (e) {
      console.log('[SoundDesign] Web Audio not supported');
      return null;
    }
  }, []);

  // Resume audio context if suspended (browser autoplay policy)
  const ensureAudioContext = useCallback(async () => {
    const ctx = initAudio();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx;
  }, [initAudio]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SOUND SYNTHESIS ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  const playTone = useCallback(async (
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    attack: number = 0.01,
    release: number = 0.1,
    volumeMultiplier: number = 1
  ) => {
    if (!enabled) return;

    const ctx = await ensureAudioContext();
    if (!ctx) return;

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      // ADSR envelope
      const now = ctx.currentTime;
      const finalVolume = volumeRef.current * volumeMultiplier;
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(finalVolume, now + attack);
      gainNode.gain.setValueAtTime(finalVolume, now + duration - release);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (e) {
      console.log('[SoundDesign] Error playing tone:', e);
    }
  }, [enabled, ensureAudioContext]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCI-FI CHIRPS (Atlas Style)
  // ═══════════════════════════════════════════════════════════════════════════
  const playChirp = useCallback(async () => {
    if (!enabled) return;
    const ctx = await ensureAudioContext();
    if (!ctx) return;

    // Quick frequency sweep - classic sci-fi chirp
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.08);
    
    gainNode.gain.setValueAtTime(volumeRef.current * 0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, [enabled, ensureAudioContext]);

  const playChirpHigh = useCallback(async () => {
    if (!enabled) return;
    const ctx = await ensureAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.06);
    
    gainNode.gain.setValueAtTime(volumeRef.current * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  }, [enabled, ensureAudioContext]);

  const playChirpLow = useCallback(async () => {
    if (!enabled) return;
    const ctx = await ensureAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(volumeRef.current * 0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.12);
  }, [enabled, ensureAudioContext]);

  // ═══════════════════════════════════════════════════════════════════════════
  // WARM ZOE TONES
  // ═══════════════════════════════════════════════════════════════════════════
  const playWarmTone = useCallback(async () => {
    // Soft, warm tone with slight harmonic
    await playTone(440, 0.3, 'sine', 0.05, 0.15, 0.5);
    await playTone(660, 0.25, 'sine', 0.08, 0.12, 0.2);
  }, [playTone]);

  const playSoftPing = useCallback(async () => {
    await playTone(880, 0.15, 'sine', 0.01, 0.1, 0.3);
  }, [playTone]);

  const playMessageIn = useCallback(async () => {
    // Ascending two-tone for incoming message
    await playTone(523, 0.1, 'sine', 0.01, 0.05, 0.4);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.01, 0.08, 0.3), 80);
  }, [playTone]);

  const playMessageOut = useCallback(async () => {
    // Quick ascending chirp for sent message
    await playTone(659, 0.08, 'sine', 0.01, 0.04, 0.3);
    setTimeout(() => playTone(784, 0.1, 'sine', 0.01, 0.05, 0.25), 60);
  }, [playTone]);

  const playNotification = useCallback(async () => {
    // Gentle notification chime
    await playTone(698, 0.12, 'sine', 0.02, 0.08, 0.4);
    setTimeout(() => playTone(880, 0.15, 'sine', 0.02, 0.1, 0.35), 100);
    setTimeout(() => playTone(1047, 0.2, 'sine', 0.02, 0.12, 0.3), 180);
  }, [playTone]);

  const playSuccess = useCallback(async () => {
    // Triumphant ascending arpeggio
    await playTone(523, 0.1, 'sine', 0.01, 0.05, 0.35);
    setTimeout(() => playTone(659, 0.1, 'sine', 0.01, 0.05, 0.3), 80);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.01, 0.08, 0.35), 160);
    setTimeout(() => playTone(1047, 0.25, 'sine', 0.02, 0.15, 0.4), 240);
  }, [playTone]);

  const playError = useCallback(async () => {
    // Descending minor tone
    await playTone(440, 0.15, 'sawtooth', 0.01, 0.08, 0.25);
    setTimeout(() => playTone(349, 0.2, 'sawtooth', 0.01, 0.1, 0.2), 120);
  }, [playTone]);

  const playUnlock = useCallback(async () => {
    if (!enabled) return;
    const ctx = await ensureAudioContext();
    if (!ctx) return;

    // Sweeping unlock sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(volumeRef.current * 0.3, ctx.currentTime);
    gainNode.gain.setValueAtTime(volumeRef.current * 0.4, ctx.currentTime + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  }, [enabled, ensureAudioContext]);

  // ═══════════════════════════════════════════════════════════════════════════
  // THE SINGULARITY SOUND
  // ═══════════════════════════════════════════════════════════════════════════
  const playSingularity = useCallback(async () => {
    if (!enabled) return;
    const ctx = await ensureAudioContext();
    if (!ctx) return;

    // Multi-layered cosmic awakening sound
    const now = ctx.currentTime;
    
    // Base drone
    const drone = ctx.createOscillator();
    const droneGain = ctx.createGain();
    drone.type = 'sine';
    drone.frequency.setValueAtTime(80, now);
    drone.frequency.exponentialRampToValueAtTime(120, now + 1.5);
    droneGain.gain.setValueAtTime(0, now);
    droneGain.gain.linearRampToValueAtTime(volumeRef.current * 0.3, now + 0.5);
    droneGain.gain.linearRampToValueAtTime(0, now + 2);
    drone.connect(droneGain);
    droneGain.connect(ctx.destination);
    drone.start(now);
    drone.stop(now + 2);

    // Rising harmonic
    const harmonic = ctx.createOscillator();
    const harmonicGain = ctx.createGain();
    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime(400, now + 0.3);
    harmonic.frequency.exponentialRampToValueAtTime(1600, now + 1.5);
    harmonicGain.gain.setValueAtTime(0, now);
    harmonicGain.gain.linearRampToValueAtTime(volumeRef.current * 0.2, now + 0.8);
    harmonicGain.gain.linearRampToValueAtTime(0, now + 2);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(ctx.destination);
    harmonic.start(now + 0.3);
    harmonic.stop(now + 2);

    // Sparkle overtones
    for (let i = 0; i < 5; i++) {
      const sparkle = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkle.type = 'sine';
      sparkle.frequency.setValueAtTime(2000 + (i * 400), now + 0.5 + (i * 0.2));
      sparkleGain.gain.setValueAtTime(0, now);
      sparkleGain.gain.linearRampToValueAtTime(volumeRef.current * 0.1, now + 0.6 + (i * 0.2));
      sparkleGain.gain.linearRampToValueAtTime(0, now + 1 + (i * 0.2));
      sparkle.connect(sparkleGain);
      sparkleGain.connect(ctx.destination);
      sparkle.start(now + 0.5 + (i * 0.2));
      sparkle.stop(now + 1.2 + (i * 0.2));
    }
  }, [enabled, ensureAudioContext]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ZOE TYPING SOUND
  // ═══════════════════════════════════════════════════════════════════════════
  const playZoeTyping = useCallback(async () => {
    if (!enabled) return;
    const ctx = await ensureAudioContext();
    if (!ctx) return;

    // Subtle soft click for Zoe typing
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Randomize frequency slightly for organic feel
    const baseFreq = 1800 + (Math.random() * 400);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(volumeRef.current * 0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.03);
  }, [enabled, ensureAudioContext]);

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIFIED PLAY FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════
  const play = useCallback((sound: SoundType) => {
    switch (sound) {
      case 'chirp': return playChirp();
      case 'chirpHigh': return playChirpHigh();
      case 'chirpLow': return playChirpLow();
      case 'warmTone': return playWarmTone();
      case 'softPing': return playSoftPing();
      case 'messageIn': return playMessageIn();
      case 'messageOut': return playMessageOut();
      case 'notification': return playNotification();
      case 'success': return playSuccess();
      case 'error': return playError();
      case 'unlock': return playUnlock();
      case 'singularity': return playSingularity();
    }
  }, [playChirp, playChirpHigh, playChirpLow, playWarmTone, playSoftPing, 
      playMessageIn, playMessageOut, playNotification, playSuccess, playError, 
      playUnlock, playSingularity]);

  return {
    isReady,
    initAudio,
    play,
    // Individual sounds
    playChirp,
    playChirpHigh,
    playChirpLow,
    playWarmTone,
    playSoftPing,
    playMessageIn,
    playMessageOut,
    playNotification,
    playSuccess,
    playError,
    playUnlock,
    playSingularity,
    playZoeTyping,
  };
}
