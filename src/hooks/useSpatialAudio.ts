// ═══════════════════════════════════════════════════════════════════════════════
// SPATIAL AUDIO HOOK - Enterprise Proximity Voice System
// 3D positional audio with distance-based volume falloff
// WebRTC peer connections for voice chat
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef, useCallback } from 'react';
import type { PlayerPresence } from './useMultiplayerPresence';

interface SpatialAudioConfig {
  maxDistance: number;      // Distance at which volume = 0 (default: 20m)
  nearDistance: number;     // Distance at which volume = 100% (default: 5m)
  rolloffFactor: number;    // How quickly volume falls off (default: 1)
}

interface AudioPeer {
  userId: string;
  audioContext: AudioContext;
  gainNode: GainNode;
  pannerNode: PannerNode;
  mediaStream?: MediaStream;
  audioElement?: HTMLAudioElement;
}

const DEFAULT_CONFIG: SpatialAudioConfig = {
  maxDistance: 20,
  nearDistance: 5,
  rolloffFactor: 1,
};

export const useSpatialAudio = (
  config: Partial<SpatialAudioConfig> = {},
  enabled: boolean = true
) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const peersRef = useRef<Map<string, AudioPeer>>(new Map());
  const myPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const animationFrameRef = useRef<number>();

  // Initialize audio context
  const initAudioContext = useCallback(async () => {
    if (audioContextRef.current) return audioContextRef.current;
    
    try {
      const ctx = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = ctx;
      
      // Create listener (represents local player)
      ctx.listener.positionX.setValueAtTime(0, ctx.currentTime);
      ctx.listener.positionY.setValueAtTime(0, ctx.currentTime);
      ctx.listener.positionZ.setValueAtTime(0, ctx.currentTime);
      
      setIsAudioEnabled(true);
      console.log('[SpatialAudio] Audio context initialized');
      return ctx;
    } catch (err) {
      setError('Failed to initialize audio');
      console.error('[SpatialAudio] Init error:', err);
      return null;
    }
  }, []);

  // Request microphone access
  const enableMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      
      localStreamRef.current = stream;
      
      // Create analyser for volume detection
      const ctx = await initAudioContext();
      if (ctx) {
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        // Start volume monitoring
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setMicVolume(avg / 255);
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      }
      
      setIsMicEnabled(true);
      console.log('[SpatialAudio] Microphone enabled');
      return stream;
    } catch (err) {
      setError('Microphone access denied');
      console.error('[SpatialAudio] Mic error:', err);
      return null;
    }
  }, [initAudioContext]);

  // Disable microphone
  const disableMicrophone = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsMicEnabled(false);
    setMicVolume(0);
    console.log('[SpatialAudio] Microphone disabled');
  }, []);

  // Calculate volume based on distance
  const calculateVolume = useCallback((
    playerPos: { x: number; y: number; z: number }
  ): number => {
    const dx = playerPos.x - myPositionRef.current.x;
    const dy = playerPos.y - myPositionRef.current.y;
    const dz = playerPos.z - myPositionRef.current.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Linear falloff between nearDistance and maxDistance
    if (distance <= fullConfig.nearDistance) return 1;
    if (distance >= fullConfig.maxDistance) return 0;
    
    const range = fullConfig.maxDistance - fullConfig.nearDistance;
    const normalized = (distance - fullConfig.nearDistance) / range;
    return Math.pow(1 - normalized, fullConfig.rolloffFactor);
  }, [fullConfig]);

  // Update listener position (local player)
  const updateListenerPosition = useCallback((position: { x: number; y: number; z: number }) => {
    myPositionRef.current = position;
    
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    const t = ctx.currentTime;
    ctx.listener.positionX.setValueAtTime(position.x, t);
    ctx.listener.positionY.setValueAtTime(position.y, t);
    ctx.listener.positionZ.setValueAtTime(position.z, t);
  }, []);

  // Update player audio positions and volumes
  const updatePlayerAudio = useCallback((players: PlayerPresence[]) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    players.forEach(player => {
      const peer = peersRef.current.get(player.user_id);
      if (!peer) return;
      
      const t = ctx.currentTime;
      
      // Update panner position
      peer.pannerNode.positionX.setValueAtTime(player.position.x, t);
      peer.pannerNode.positionY.setValueAtTime(player.position.y, t);
      peer.pannerNode.positionZ.setValueAtTime(player.position.z, t);
      
      // Update volume based on distance
      const volume = calculateVolume(player.position);
      peer.gainNode.gain.setTargetAtTime(volume, t, 0.1);
    });
  }, [calculateVolume]);

  // Add a player's audio stream
  const addPlayerAudio = useCallback(async (
    userId: string, 
    audioStream: MediaStream
  ) => {
    const ctx = await initAudioContext();
    if (!ctx) return;
    
    // Create audio nodes for spatial positioning
    const gainNode = ctx.createGain();
    const pannerNode = ctx.createPanner();
    
    pannerNode.panningModel = 'HRTF';
    pannerNode.distanceModel = 'inverse';
    pannerNode.refDistance = fullConfig.nearDistance;
    pannerNode.maxDistance = fullConfig.maxDistance;
    pannerNode.rolloffFactor = fullConfig.rolloffFactor;
    pannerNode.coneInnerAngle = 360;
    pannerNode.coneOuterAngle = 360;
    pannerNode.coneOuterGain = 1;
    
    // Create audio element for playback
    const audio = new Audio();
    audio.srcObject = audioStream;
    audio.autoplay = true;
    
    // Connect nodes
    const source = ctx.createMediaStreamSource(audioStream);
    source.connect(pannerNode);
    pannerNode.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Store peer
    peersRef.current.set(userId, {
      userId,
      audioContext: ctx,
      gainNode,
      pannerNode,
      mediaStream: audioStream,
      audioElement: audio,
    });
    
    console.log('[SpatialAudio] Added player audio:', userId);
  }, [initAudioContext, fullConfig]);

  // Remove a player's audio stream
  const removePlayerAudio = useCallback((userId: string) => {
    const peer = peersRef.current.get(userId);
    if (!peer) return;
    
    peer.gainNode.disconnect();
    peer.pannerNode.disconnect();
    if (peer.audioElement) {
      peer.audioElement.pause();
      peer.audioElement.srcObject = null;
    }
    
    peersRef.current.delete(userId);
    console.log('[SpatialAudio] Removed player audio:', userId);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disableMicrophone();
      
      peersRef.current.forEach((_, userId) => {
        removePlayerAudio(userId);
      });
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [disableMicrophone, removePlayerAudio]);

  // Get volume for a specific player (for visual feedback)
  const getPlayerVolume = useCallback((position: { x: number; y: number; z: number }): number => {
    return calculateVolume(position);
  }, [calculateVolume]);

  // Check if user is speaking (based on mic volume threshold)
  const isSpeaking = micVolume > 0.1;

  return {
    // State
    isAudioEnabled,
    isMicEnabled,
    isSpeaking,
    micVolume,
    error,
    
    // Controls
    initAudioContext,
    enableMicrophone,
    disableMicrophone,
    updateListenerPosition,
    updatePlayerAudio,
    addPlayerAudio,
    removePlayerAudio,
    getPlayerVolume,
    
    // Config
    config: fullConfig,
    localStream: localStreamRef.current,
  };
};

export default useSpatialAudio;
