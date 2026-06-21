import { useCallback, useRef } from 'react';
import { isSoundSuppressed } from '@/lib/platformPurge';
// Audio file URLs (using Web Audio API for synthetic sounds)
const AUDIO_CONFIG = {
  bootChime: { frequency: 440, duration: 0.8, type: 'sine' as OscillatorType },
  hoverClick: { frequency: 1200, duration: 0.05, type: 'square' as OscillatorType },
  errorGlitch: { frequency: 150, duration: 0.2, type: 'sawtooth' as OscillatorType },
  confirm: { frequency: 880, duration: 0.15, type: 'sine' as OscillatorType },
  shardOpen: { frequency: 600, duration: 0.1, type: 'triangle' as OscillatorType },
  // Call ringtone frequencies for melodic ring
  callRing: { frequency: 440, duration: 0.3, type: 'sine' as OscillatorType },
  callRingHigh: { frequency: 554, duration: 0.3, type: 'sine' as OscillatorType },
  callEnd: { frequency: 330, duration: 0.4, type: 'sine' as OscillatorType },
  callConnect: { frequency: 660, duration: 0.2, type: 'sine' as OscillatorType },
};

export function useMmoraAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback((): AudioContext | null => {
    if (audioContextRef.current) return audioContextRef.current;

    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;

    try {
      audioContextRef.current = new Ctx();
      return audioContextRef.current;
    } catch (err) {
      console.warn('AudioContext init failed:', err);
      return null;
    }
  }, []);

  const playTone = useCallback(
    (config: { frequency: number; duration: number; type: OscillatorType }) => {
      // Check sound suppression first
      if (isSoundSuppressed()) {
        console.debug('[ZoeAudio] Sounds suppressed after platform purge');
        return;
      }
      
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        // Some browsers require user gesture before audio; resume is safe to call.
        if (ctx.state === 'suspended') {
          void ctx.resume().catch(() => undefined);
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = config.type;
        oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);

        // Fade in/out for smoother sound
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + config.duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + config.duration);
      } catch (err) {
        console.warn('Audio playback failed:', err);
      }
    },
    [getAudioContext]
  );

  const playBootChime = useCallback(() => {
    // Play a sequence of tones for boot chime
    const frequencies = [440, 554, 659, 880];

    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        playTone({ frequency: freq, duration: 0.3, type: 'sine' });
      }, i * 150);
    });
  }, [playTone]);

  const playHoverClick = useCallback(() => {
    playTone(AUDIO_CONFIG.hoverClick);
  }, [playTone]);

  const playErrorGlitch = useCallback(() => {
    playTone(AUDIO_CONFIG.errorGlitch);
  }, [playTone]);

  const playConfirm = useCallback(() => {
    playTone(AUDIO_CONFIG.confirm);
  }, [playTone]);

  const playShardOpen = useCallback(() => {
    playTone(AUDIO_CONFIG.shardOpen);
  }, [playTone]);

  // Play ringtone for incoming/outgoing calls - repeating melodic pattern
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRingtonePlayingRef = useRef<boolean>(false);
  // Track the ringtone instance to forcibly kill stale ones
  const ringtoneInstanceRef = useRef<number>(0);
  
  // CRITICAL: Force-stop any ringtone - call this on ALL call end paths
  const forceStopAllRingtones = useCallback(() => {
    console.log('[ZoeAudio] FORCE STOP: Killing all ringtone intervals');
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    isRingtonePlayingRef.current = false;
    ringtoneInstanceRef.current++;
  }, []);
  
  const playCallRingtone = useCallback((isIncoming: boolean = true) => {
    // Prevent double-playing if already ringing
    if (isRingtonePlayingRef.current) {
      console.log('[ZoeAudio] Ringtone already playing, skipping');
      return;
    }
    
    // Clear any existing ringtone first
    forceStopAllRingtones();
    
    console.log(`[ZoeAudio] Starting ${isIncoming ? 'incoming' : 'outgoing'} ringtone`);
    isRingtonePlayingRef.current = true;
    const currentInstance = ++ringtoneInstanceRef.current;
    
    const playRingSequence = () => {
      // Check if this ringtone instance is still valid (prevents stale intervals from playing)
      if (ringtoneInstanceRef.current !== currentInstance) {
        console.log('[ZoeAudio] Stale ringtone instance detected, stopping');
        return;
      }
      // Play alternating tones for pleasant ringtone
      playTone({ frequency: 440, duration: 0.2, type: 'sine' });
      setTimeout(() => playTone({ frequency: 554, duration: 0.2, type: 'sine' }), 250);
      setTimeout(() => playTone({ frequency: 659, duration: 0.2, type: 'sine' }), 500);
      if (isIncoming) {
        setTimeout(() => playTone({ frequency: 554, duration: 0.2, type: 'sine' }), 750);
      }
    };
    
    // Play immediately
    playRingSequence();
    
    // Repeat every 2 seconds
    ringtoneIntervalRef.current = setInterval(playRingSequence, 2000);
  }, [playTone, forceStopAllRingtones]);
  
  const stopCallRingtone = useCallback(() => {
    console.log('[ZoeAudio] stopCallRingtone called');
    forceStopAllRingtones();
  }, [forceStopAllRingtones]);
  
  const playCallConnect = useCallback(() => {
    stopCallRingtone();
    // Pleasant connection sound
    playTone({ frequency: 523, duration: 0.15, type: 'sine' });
    setTimeout(() => playTone({ frequency: 659, duration: 0.15, type: 'sine' }), 150);
    setTimeout(() => playTone({ frequency: 784, duration: 0.2, type: 'sine' }), 300);
  }, [playTone, stopCallRingtone]);
  
  const playCallEnd = useCallback(() => {
    stopCallRingtone();
    // Descending end tone
    playTone({ frequency: 440, duration: 0.15, type: 'sine' });
    setTimeout(() => playTone({ frequency: 349, duration: 0.15, type: 'sine' }), 150);
    setTimeout(() => playTone({ frequency: 262, duration: 0.25, type: 'sine' }), 300);
  }, [playTone, stopCallRingtone]);

  return {
    playBootChime,
    playHoverClick,
    playErrorGlitch,
    playConfirm,
    playShardOpen,
    // Call sounds
    playCallRingtone,
    stopCallRingtone,
    forceStopAllRingtones, // CRITICAL: Use this on all call end paths
    playCallConnect,
    playCallEnd,
  };
}
