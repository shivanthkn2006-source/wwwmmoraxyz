/**
 * ZOE AUDIO SYSTEM
 * Standalone audio hook for Zoe Infinity - NO external platform connections
 * Provides synthetic sound effects using Web Audio API
 */

import { useRef, useCallback } from 'react';

export const useZoeAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRingtonePlayingRef = useRef<boolean>(false);
  const ringtoneInstanceRef = useRef<number>(0);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((config: {
    frequency: number;
    duration: number;
    type?: OscillatorType;
    volume?: number;
    fadeIn?: number;
    fadeOut?: number;
  }) => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = config.type || 'sine';
      oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);
      
      const volume = config.volume ?? 0.3;
      const fadeIn = config.fadeIn ?? 0.01;
      const fadeOut = config.fadeOut ?? 0.1;
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + fadeIn);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + config.duration - fadeOut);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration);
    } catch (e) {
      console.debug('[ZoeAudio] Sound suppressed or unavailable');
    }
  }, [getAudioContext]);

  const forceStopAllRingtones = useCallback(() => {
    isRingtonePlayingRef.current = false;
    ringtoneInstanceRef.current++;
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);

  const playCallRingtone = useCallback((isIncoming: boolean = true) => {
    if (isRingtonePlayingRef.current) return;
    
    isRingtonePlayingRef.current = true;
    const currentInstance = ++ringtoneInstanceRef.current;
    
    const playRingSequence = () => {
      if (!isRingtonePlayingRef.current || ringtoneInstanceRef.current !== currentInstance) return;
      
      // Play a pleasant ringtone sequence
      const notes = isIncoming ? [523, 659, 784] : [392, 494, 587];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          if (isRingtonePlayingRef.current && ringtoneInstanceRef.current === currentInstance) {
            playTone({ frequency: freq, duration: 0.2, type: 'sine', volume: 0.2 });
          }
        }, i * 150);
      });
    };

    playRingSequence();
    ringtoneIntervalRef.current = setInterval(playRingSequence, 2000);
  }, [playTone]);

  const stopCallRingtone = useCallback(() => {
    forceStopAllRingtones();
  }, [forceStopAllRingtones]);

  const playCallConnect = useCallback(() => {
    playTone({ frequency: 440, duration: 0.1, volume: 0.2 });
    setTimeout(() => playTone({ frequency: 554, duration: 0.1, volume: 0.2 }), 100);
    setTimeout(() => playTone({ frequency: 659, duration: 0.15, volume: 0.25 }), 200);
  }, [playTone]);

  const playCallEnd = useCallback(() => {
    playTone({ frequency: 659, duration: 0.1, volume: 0.2 });
    setTimeout(() => playTone({ frequency: 554, duration: 0.1, volume: 0.2 }), 100);
    setTimeout(() => playTone({ frequency: 440, duration: 0.2, volume: 0.15 }), 200);
  }, [playTone]);

  const playBootChime = useCallback(() => {
    playTone({ frequency: 440, duration: 0.15, volume: 0.15 });
    setTimeout(() => playTone({ frequency: 554, duration: 0.15, volume: 0.15 }), 100);
    setTimeout(() => playTone({ frequency: 659, duration: 0.2, volume: 0.2 }), 200);
  }, [playTone]);

  const playHoverClick = useCallback(() => {
    playTone({ frequency: 800, duration: 0.05, type: 'sine', volume: 0.1 });
  }, [playTone]);

  const playErrorGlitch = useCallback(() => {
    playTone({ frequency: 200, duration: 0.1, type: 'sawtooth', volume: 0.15 });
  }, [playTone]);

  const playConfirm = useCallback(() => {
    playTone({ frequency: 523, duration: 0.1, volume: 0.15 });
    setTimeout(() => playTone({ frequency: 659, duration: 0.15, volume: 0.2 }), 100);
  }, [playTone]);

  return {
    playCallRingtone,
    stopCallRingtone,
    forceStopAllRingtones,
    playCallConnect,
    playCallEnd,
    playBootChime,
    playHoverClick,
    playErrorGlitch,
    playConfirm,
  };
};

export default useZoeAudio;
