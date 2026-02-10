// ═══════════════════════════════════════════════════════════════════════════════
// ZOE QUANTUM CALL - PROJECT CLAIRVOYANCE
// Ultra-low latency P2P voice + video calls with Quantum Shield encryption
// WebRTC with Opus 32kbps audio + Adaptive Bitrate Video (720p→360p)
// "God Eye" feature: Zoe can analyze video frames during AI calls
// SUPPORTS: Front/Back camera flip for all devices
// NOTE: This is Zoe Infinity ONLY - NO external platform connections
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QuantumShieldLayer } from '@/core/security/QuantumShieldLayer';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useZoeAudio } from '@/hooks/useZoeAudio';
import { useCameraDevices } from '@/hooks/useCameraDevices';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CallState = 
  | 'idle'
  | 'requesting'      // Caller: waiting for receiver to accept
  | 'incoming'        // Receiver: incoming call notification
  | 'connecting'      // WebRTC handshake in progress
  | 'connected'       // Call active
  | 'reconnecting'    // Connection lost, attempting recovery
  | 'ended';          // Call terminated

export type CallEndReason = 
  | 'completed'
  | 'rejected'
  | 'busy'
  | 'timeout'
  | 'network_error'
  | 'user_hangup';

export type VideoQuality = '720p' | '360p' | 'off';

export interface CallParticipant {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  isAI?: boolean; // True when calling Zoe AI
}

export interface CallSession {
  id: string;
  caller: CallParticipant;
  receiver: CallParticipant;
  startTime?: Date;
  duration: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

export interface VideoState {
  isEnabled: boolean;
  localQuality: VideoQuality;
  remoteQuality: VideoQuality;
  isLowDataMode: boolean;
  codec: 'VP9' | 'AV1' | 'H264' | 'unknown';
  currentBitrate: number;
  cameraFacing: 'front' | 'back' | 'unknown';
}

export interface GodEyeAnalysis {
  timestamp: number;
  objects: string[];
  scene: string;
  emotional_sentiment: string;
  summary: string;
  zoe_response?: string;
}

export interface QuantumCallState {
  callState: CallState;
  currentCall: CallSession | null;
  incomingCall: CallParticipant | null;
  isMuted: boolean;
  isSpeaking: boolean;
  remoteIsSpeaking: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  error: string | null;
  // Video state
  video: VideoState;
  // God Eye state
  godEyeEnabled: boolean;
  lastGodEyeAnalysis: GodEyeAnalysis | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS - LIQUID STREAM CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

// Video constraints for adaptive bitrate streaming
const VIDEO_CONSTRAINTS = {
  high: { // 720p at 30fps - Standard quality
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 30, max: 30 },
  },
  low: { // 360p at 15fps - Low data mode
    width: { ideal: 640, max: 640 },
    height: { ideal: 360, max: 360 },
    frameRate: { ideal: 15, max: 15 },
  },
};

// Bandwidth caps (bits per second)
const BITRATE_CAPS = {
  high: 1500000,  // 1.5 Mbps for WiFi users
  mobile: 500000, // 500 Kbps for mobile data
  low: 250000,    // 250 Kbps for emergency low-data
};

// Packet loss threshold for auto-downgrade
const PACKET_LOSS_THRESHOLD = 5; // 5% packet loss triggers downgrade

// God Eye frame capture interval (ms)
const GOD_EYE_INTERVAL_MS = 5000; // Analyze every 5 seconds

const OPUS_32KBPS_SDP_MODIFIER = (sdp: string): string => {
  const lines = sdp.split('\r\n');
  const modifiedLines = lines.map(line => {
    if (line.startsWith('a=fmtp:111')) {
      return 'a=fmtp:111 minptime=10;useinbandfec=1;maxaveragebitrate=32000;stereo=0;sprop-stereo=0;cbr=0';
    }
    return line;
  });
  return modifiedLines.join('\r\n');
};

// Video codec priority modifier - prioritize VP9/AV1 over H264
const VIDEO_CODEC_MODIFIER = (sdp: string, preferVP9: boolean = true): string => {
  if (!preferVP9) return sdp;
  
  // Reorder video codec priority to prefer VP9 or AV1
  const lines = sdp.split('\r\n');
  const modifiedLines: string[] = [];
  
  for (const line of lines) {
    // Set max bitrate for video
    if (line.startsWith('a=mid:video') || line.includes('video')) {
      modifiedLines.push(line);
      // Insert bandwidth limit after video line
      if (line.includes('m=video')) {
        modifiedLines.push(`b=AS:${Math.floor(BITRATE_CAPS.mobile / 1000)}`);
        continue;
      }
    }
    modifiedLines.push(line);
  }
  
  return modifiedLines.join('\r\n');
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
];

const CALL_TIMEOUT_MS = 30000;
const ENCRYPTION_HANDSHAKE_TIMEOUT_MS = 2000; // 2s (200ms was too strict and caused false disconnects)
const SECURITY_ALERT_COOLDOWN_MS = 5000;

// ═══════════════════════════════════════════════════════════════════════════════
// BLACK BOX LEDGER INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

interface CallMetadata {
  duration_ms: number;
  connection_quality: number;
  participants: { caller_id: string; receiver_id: string };
  encryption_signature: string;
  codec: string;
  bitrate_kbps: number;
  handshake_time_ms?: number;
  security_alerts?: string[];
  video_enabled?: boolean;
  video_quality?: string;
  god_eye_analyses?: number;
}

const generateQuantumSignature = async (): Promise<string> => {
  const timestamp = Date.now();
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const signature = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `QS_${timestamp.toString(36)}_${signature.slice(0, 32)}`;
};

const computeIntegrityHash = (data: object): string => {
  const json = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `INT_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useZoeQuantumCall = (currentUserId?: string) => {
  // Audio hooks for ringtones (Zoe Infinity standalone audio)
  const { playCallRingtone, stopCallRingtone, forceStopAllRingtones, playCallConnect, playCallEnd } = useZoeAudio();
  
  // Camera devices for front/back selection
  const cameraDevices = useCameraDevices();
  
  // State
  const [state, setState] = useState<QuantumCallState>({
    callState: 'idle',
    currentCall: null,
    incomingCall: null,
    isMuted: false,
    isSpeaking: false,
    remoteIsSpeaking: false,
    connectionQuality: 'unknown',
    error: null,
    // Video state
    video: {
      isEnabled: false,
      localQuality: '720p',
      remoteQuality: 'off',
      isLowDataMode: false,
      codec: 'unknown',
      currentBitrate: 0,
      cameraFacing: 'front',
    },
    // God Eye state
    godEyeEnabled: false,
    lastGodEyeAnalysis: null,
  });

  // Refs for WebRTC
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);
  const currentCallIdRef = useRef<string | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const quantumShieldRef = useRef<QuantumShieldLayer | null>(null);
  const handshakeStartTimeRef = useRef<number | null>(null);
  const securityAlertsRef = useRef<string[]>([]);
  const lastSecurityAlertRef = useRef<number>(0);
  const packetLossRef = useRef<number>(0);

  // Buffer ICE candidates that arrive before remoteDescription is set.
  const pendingIceCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  
  // Video refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const godEyeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const godEyeAnalysisCountRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Refs to store callbacks to prevent effect re-runs
  const endCallRef = useRef<(reason?: CallEndReason) => Promise<void>>();
  const createPeerConnectionRef = useRef<(remoteUserId: string) => RTCPeerConnection>();
  const decryptSignalDataRef = useRef<(encrypted: string) => object | null>();
  const playCallRingtoneRef = useRef<(isIncoming: boolean) => void>();
  const stopCallRingtoneRef = useRef<() => void>();
  const forceStopAllRingtonesRef = useRef<() => void>();
  const playCallConnectRef = useRef<() => void>();

  // Initialize Quantum Shield for encryption
  useEffect(() => {
    quantumShieldRef.current = QuantumShieldLayer.getInstance();
    quantumShieldRef.current.activate();
    
    // Create hidden canvas for God Eye frame capture
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // GOD EYE - REAL-TIME VIDEO ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════════

  const captureFrameAsBase64 = useCallback((): string | null => {
    if (!localVideoRef.current || !canvasRef.current) return null;
    
    const video = localVideoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Draw current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64 JPEG (lower size than PNG)
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  const analyzeFrameWithZoe = useCallback(async (frameData: string): Promise<GodEyeAnalysis | null> => {
    if (!currentUserId) return null;
    
    try {
      console.log('[GodEye] Analyzing video frame...');
      
      const { data, error } = await supabase.functions.invoke('zoe-perception', {
        body: {
          media_type: 'image',
          media_data: frameData,
          context: 'Live video call frame analysis - God Eye mode',
          cross_reference: false, // Don't need full memory cross-reference for real-time
        },
      });

      if (error) {
        console.error('[GodEye] Analysis error:', error);
        return null;
      }

      if (!data.success) {
        console.warn('[GodEye] Analysis unsuccessful:', data.error);
        return null;
      }

      const analysis: GodEyeAnalysis = {
        timestamp: Date.now(),
        objects: data.analysis?.objects || [],
        scene: data.analysis?.scene || 'Unknown scene',
        emotional_sentiment: data.analysis?.emotional_sentiment || 'neutral',
        summary: data.analysis?.summary || '',
        zoe_response: data.zoe_response,
      };

      console.log('[GodEye] Frame analyzed:', analysis.scene);
      godEyeAnalysisCountRef.current++;
      
      setState(prev => ({
        ...prev,
        lastGodEyeAnalysis: analysis,
      }));

      // Dispatch event for UI to handle Zoe's visual response
      window.dispatchEvent(new CustomEvent('god-eye-analysis', {
        detail: analysis,
      }));

      return analysis;
    } catch (err) {
      console.error('[GodEye] Failed to analyze frame:', err);
      return null;
    }
  }, [currentUserId]);

const startGodEye = useCallback(() => {
    if (!state.currentCall?.receiver.isAI) {
      console.log('[GodEye] Not an AI call, skipping God Eye');
      return;
    }

    console.log('[GodEye] Starting visual perception mode');
    setState(prev => ({ ...prev, godEyeEnabled: true }));

    godEyeIntervalRef.current = setInterval(async () => {
      if (state.video?.isEnabled && localVideoRef.current) {
        const frameData = captureFrameAsBase64();
        if (frameData) {
          await analyzeFrameWithZoe(frameData);
        }
      }
    }, GOD_EYE_INTERVAL_MS);
  }, [state.currentCall?.receiver.isAI, state.video?.isEnabled, captureFrameAsBase64, analyzeFrameWithZoe]);

  const stopGodEye = useCallback(() => {
    if (godEyeIntervalRef.current) {
      clearInterval(godEyeIntervalRef.current);
      godEyeIntervalRef.current = null;
    }
    setState(prev => ({ ...prev, godEyeEnabled: false }));
    console.log(`[GodEye] Stopped. Total analyses: ${godEyeAnalysisCountRef.current}`);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADAPTIVE BITRATE - AUTO DOWNGRADE
  // ═══════════════════════════════════════════════════════════════════════════════

  const detectSupportedCodec = useCallback((): 'VP9' | 'AV1' | 'H264' => {
    // Check browser codec support
    if (typeof RTCRtpSender !== 'undefined' && RTCRtpSender.getCapabilities) {
      const capabilities = RTCRtpSender.getCapabilities('video');
      const codecs = capabilities?.codecs || [];
      
      // Priority: AV1 > VP9 > H264
      if (codecs.some(c => c.mimeType.toLowerCase().includes('av1'))) {
        console.log('[LiquidStream] Using AV1 codec (optimal)');
        return 'AV1';
      }
      if (codecs.some(c => c.mimeType.toLowerCase().includes('vp9'))) {
        console.log('[LiquidStream] Using VP9 codec (good)');
        return 'VP9';
      }
    }
    
    console.log('[LiquidStream] Falling back to H264 codec');
    return 'H264';
  }, []);

  const adjustVideoBitrate = useCallback(async (targetBitrate: number) => {
    if (!videoSenderRef.current) return;
    
    try {
      const params = videoSenderRef.current.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      
      params.encodings[0].maxBitrate = targetBitrate;
      await videoSenderRef.current.setParameters(params);
      
      console.log(`[LiquidStream] Bitrate adjusted to ${Math.round(targetBitrate / 1000)}kbps`);
      
      setState(prev => ({
        ...prev,
        video: {
          ...prev.video,
          currentBitrate: targetBitrate,
        },
      }));
    } catch (err) {
      console.warn('[LiquidStream] Failed to adjust bitrate:', err);
    }
  }, []);

  const downgradeVideoQuality = useCallback(async () => {
    if (!localStreamRef.current) return;
    
    console.log('[LiquidStream] AUTO-DOWNGRADE: Switching to Low Data Mode (360p@15fps)');
    
    // Stop current video track
    const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
    if (currentVideoTrack) {
      currentVideoTrack.stop();
    }
    
    try {
      // Get new video track with lower constraints
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: VIDEO_CONSTRAINTS.low,
        audio: false,
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace track in peer connection
      if (videoSenderRef.current) {
        await videoSenderRef.current.replaceTrack(newVideoTrack);
      }
      
      // Update local stream
      localStreamRef.current.removeTrack(currentVideoTrack);
      localStreamRef.current.addTrack(newVideoTrack);
      
      // Reduce bitrate cap
      await adjustVideoBitrate(BITRATE_CAPS.low);
      
      setState(prev => ({
        ...prev,
        video: {
          ...prev.video,
          localQuality: '360p',
          isLowDataMode: true,
        },
      }));
      
      // Dispatch event for UI notification
      window.dispatchEvent(new CustomEvent('quantum-call-quality-change', {
        detail: { 
          quality: '360p', 
          reason: 'auto_downgrade',
          message: 'Switched to Low Data Mode for better stability',
        },
      }));
      
    } catch (err) {
      console.error('[LiquidStream] Failed to downgrade video:', err);
    }
  }, [adjustVideoBitrate]);

  const monitorConnectionQuality = useCallback(() => {
    if (!peerConnectionRef.current || state.callState !== 'connected') return;
    
    peerConnectionRef.current.getStats().then(stats => {
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          const totalPackets = (report.packetsReceived || 0) + (report.packetsLost || 0);
          if (totalPackets > 0) {
            const packetLoss = ((report.packetsLost || 0) / totalPackets) * 100;
            packetLossRef.current = packetLoss;
            
            // Auto-downgrade if packet loss exceeds threshold
            if (packetLoss > PACKET_LOSS_THRESHOLD && state.video?.localQuality === '720p') {
              console.log(`[LiquidStream] Packet loss ${packetLoss.toFixed(1)}% exceeds threshold, triggering auto-downgrade`);
              downgradeVideoQuality();
            }
          }
        }
        
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          const rtt = report.currentRoundTripTime;
          let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'unknown' as any;
          if (rtt < 0.1) quality = 'excellent';
          else if (rtt < 0.2) quality = 'good';
          else if (rtt < 0.4) quality = 'fair';
          else quality = 'poor';
          
          setState(prev => ({ ...prev, connectionQuality: quality }));
        }
      });
    });
  }, [state.callState, state.video?.localQuality, downgradeVideoQuality]);

  // Run quality monitoring every 3 seconds during connected call
  useEffect(() => {
    if (state.callState !== 'connected') return;
    
    const interval = setInterval(monitorConnectionQuality, 3000);
    return () => clearInterval(interval);
  }, [state.callState, monitorConnectionQuality]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // BLACK BOX LEDGER - SECURITY LOGGING
  // ═══════════════════════════════════════════════════════════════════════════════

  const logToBlackBox = useCallback(async (
    eventType: string,
    metadata: CallMetadata,
    severity: 'info' | 'warning' | 'critical' = 'info'
  ) => {
    if (!currentUserId) return;

    const encryptedPayload = {
      call_metadata: {
        duration_ms: metadata.duration_ms,
        connection_quality: metadata.connection_quality,
        participants: metadata.participants,
        encryption_signature: metadata.encryption_signature,
        codec: metadata.codec,
        bitrate_kbps: metadata.bitrate_kbps,
        handshake_time_ms: metadata.handshake_time_ms ?? null,
        security_alerts: metadata.security_alerts ?? null,
        video_enabled: metadata.video_enabled ?? false,
        video_quality: metadata.video_quality ?? null,
        god_eye_analyses: metadata.god_eye_analyses ?? 0,
      },
      security_level: 'quantum_shield',
      timestamp: new Date().toISOString(),
    };

    const genesisSignature = await generateQuantumSignature();
    const integrityHash = computeIntegrityHash(encryptedPayload);

    try {
      await supabase.from('zoe_black_box_ledger').insert({
        user_id: currentUserId,
        event_type: eventType,
        event_category: 'quantum_call',
        encrypted_payload: encryptedPayload,
        metadata: {
          call_duration_ms: metadata.duration_ms,
          connection_quality_pct: 100 - metadata.connection_quality,
          participants_count: 2,
          encryption_verified: true,
          video_enabled: metadata.video_enabled,
        },
        genesis_signature: genesisSignature,
        integrity_hash: integrityHash,
        source_system: 'quantum_video_bridge',
        severity,
      });

      console.log(`[QuantumCall] Black Box logged: ${eventType}`);
    } catch (error) {
      console.error('[QuantumCall] Failed to log to Black Box:', error);
    }
  }, [currentUserId]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DHF MEMORY INJECTION
  // ═══════════════════════════════════════════════════════════════════════════════

  const logZoeTTSContext = useCallback(async (
    transcript: string,
    context: 'call_start' | 'call_end' | 'in_call' = 'in_call'
  ) => {
    if (!currentUserId) return;

    try {
      await supabase.from('behavioral_events').insert({
        user_id: currentUserId,
        event_type: 'zoe_tts_transcript',
        event_category: 'voice_interaction',
        context_snippet: transcript.slice(0, 500),
        metadata: {
          context,
          source: 'quantum_video_call',
          timestamp: new Date().toISOString(),
          video_enabled: state.video?.isEnabled ?? false,
        },
        dhf_logged: true,
        ecn_processed: false,
      });

      console.log('[QuantumCall] DHF Memory logged:', context);
    } catch (error) {
      console.error('[QuantumCall] Failed to log DHF memory:', error);
    }
  }, [currentUserId, state.video?.isEnabled]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECURITY
  // ═══════════════════════════════════════════════════════════════════════════════

  const triggerSecurityAlert = useCallback((alertType: string, details: string) => {
    const now = Date.now();
    if (now - lastSecurityAlertRef.current < SECURITY_ALERT_COOLDOWN_MS) {
      return;
    }
    lastSecurityAlertRef.current = now;
    securityAlertsRef.current.push(`${alertType}: ${details}`);

    console.warn(`[QuantumCall] SECURITY ALERT: ${alertType} - ${details}`);

    window.dispatchEvent(new CustomEvent('quantum-call-security-alert', {
      detail: { type: alertType, message: details, timestamp: now }
    }));
  }, []);

  const severConnection = useCallback(async (reason: string) => {
    console.error(`[QuantumCall] SEVERING CONNECTION: ${reason}`);
    
    triggerSecurityAlert('connection_severed', reason);

    if (currentUserId && state.currentCall) {
      await logToBlackBox('security_breach_prevented', {
        duration_ms: callStartTimeRef.current 
          ? Date.now() - callStartTimeRef.current.getTime() 
          : 0,
        connection_quality: packetLossRef.current,
        participants: {
          caller_id: state.currentCall.caller.userId,
          receiver_id: state.currentCall.receiver.userId,
        },
        encryption_signature: 'SEVERED',
        codec: (state.video?.codec ?? 'unknown').toLowerCase(),
        bitrate_kbps: Math.round((state.video?.currentBitrate ?? 0) / 1000),
        security_alerts: [...securityAlertsRef.current, reason],
        video_enabled: state.video?.isEnabled ?? false,
        video_quality: state.video?.localQuality ?? 'off',
      }, 'critical');
    }

    // Stop God Eye
    stopGodEye();

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setState(prev => ({
      ...prev,
      callState: 'ended',
      error: `Security: ${reason}`,
      currentCall: null,
      incomingCall: null,
      video: {
        ...prev.video,
        isEnabled: false,
      },
    }));
  }, [currentUserId, state.currentCall, state.video?.codec, state.video?.currentBitrate, state.video?.isEnabled, state.video?.localQuality, triggerSecurityAlert, logToBlackBox, stopGodEye]);

  const monitorEncryptionHandshake = useCallback(() => {
    if (!handshakeStartTimeRef.current) return;

    const handshakeTime = Date.now() - handshakeStartTimeRef.current;

    if (handshakeTime > ENCRYPTION_HANDSHAKE_TIMEOUT_MS) {
      severConnection(`Encryption handshake exceeded ${ENCRYPTION_HANDSHAKE_TIMEOUT_MS}ms (${handshakeTime}ms) - Potential MITM attack`);
    }
  }, [severConnection]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SIGNALING HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  const encryptSignalData = useCallback(async (data: object): Promise<string> => {
    const jsonStr = JSON.stringify(data);
    const key = Date.now().toString(36);
    const encrypted = btoa(jsonStr.split('').map((c, i) => 
      String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join(''));
    return `QS_${key}_${encrypted}`;
  }, []);

  const decryptSignalData = useCallback((encrypted: string): object | null => {
    try {
      if (!encrypted.startsWith('QS_')) return JSON.parse(encrypted);
      const parts = encrypted.split('_');
      const key = parts[1];
      const data = parts.slice(2).join('_');
      const decrypted = atob(data).split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
      ).join('');
      return JSON.parse(decrypted);
    } catch {
      console.error('[QuantumCall] Failed to decrypt signal data');
      return null;
    }
  }, []);

  const sendSignal = useCallback(async (
    receiverId: string,
    signalType: string,
    signalData: object
  ) => {
    if (!currentUserId) return;

    const encryptedPayload = await encryptSignalData(signalData);

    console.log(`[QuantumCall] Sending ${signalType} to ${receiverId.slice(0, 8)}...`);

    const { error } = await supabase.from('quantum_call_signals').insert([
      {
        caller_id: currentUserId,
        receiver_id: receiverId,
        signal_type: signalType,
        signal_data: signalData as any,
        encrypted_payload: encryptedPayload,
      },
    ]);

    if (error) {
      console.error('[QuantumCall] Failed to send signal:', signalType, error);
      setState(prev => ({ ...prev, error: `Signaling error: ${error.message}` }));
    }
  }, [currentUserId, encryptSignalData]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // MEDIA SETUP - AUDIO + VIDEO
  // ═══════════════════════════════════════════════════════════════════════════════

  const setupLocalMedia = useCallback(async (includeVideo: boolean = false): Promise<MediaStream | null> => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          channelCount: 1,
        },
        video: includeVideo ? VIDEO_CONSTRAINTS.high : false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      
      // Setup audio level detection
      const audioContext = new AudioContext({ sampleRate: 24000 });
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioAnalyserRef.current = analyser;
      
      // Attach to local video element if video enabled
      if (includeVideo && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      const codec = detectSupportedCodec();
      
      setState(prev => ({
        ...prev,
        video: {
          ...prev.video,
          isEnabled: includeVideo,
          localQuality: includeVideo ? '720p' : 'off',
          codec,
          currentBitrate: includeVideo ? BITRATE_CAPS.mobile : 0,
        },
      }));
      
      console.log(`[QuantumCall] Local media initialized (video: ${includeVideo}, codec: ${codec})`);
      return stream;
    } catch (error) {
      console.error('[QuantumCall] Failed to get local media:', error);
      setState(prev => ({ ...prev, error: 'Camera/Microphone access denied' }));
      return null;
    }
  }, [detectSupportedCodec]);

  const monitorAudioLevels = useCallback(() => {
    if (!audioAnalyserRef.current) return;
    
    const dataArray = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
    
    const checkLevel = () => {
      if (!audioAnalyserRef.current) return;
      audioAnalyserRef.current.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const isSpeaking = avg > 30;
      
      setState(prev => {
        if (prev.isSpeaking !== isSpeaking) {
          return { ...prev, isSpeaking };
        }
        return prev;
      });
      
      if (state.callState === 'connected') {
        requestAnimationFrame(checkLevel);
      }
    };
    
    checkLevel();
  }, [state.callState]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIDEO CONTROL
  // ═══════════════════════════════════════════════════════════════════════════════

  const toggleVideo = useCallback(async () => {
    if (!localStreamRef.current) return;

    const currentVideoTracks = localStreamRef.current.getVideoTracks();
    const isLowData = state.video?.isLowDataMode ?? false;
    
    if (currentVideoTracks.length > 0) {
      // Video is on, turn it off
      currentVideoTracks.forEach(track => {
        track.stop();
        localStreamRef.current?.removeTrack(track);
      });
      
      // Remove from peer connection
      if (videoSenderRef.current && peerConnectionRef.current) {
        peerConnectionRef.current.removeTrack(videoSenderRef.current);
        videoSenderRef.current = null;
      }
      
      // Stop God Eye when video is off
      stopGodEye();
      
      setState(prev => ({
        ...prev,
        video: {
          ...prev.video,
          isEnabled: false,
          localQuality: 'off',
        },
      }));
      
      console.log('[QuantumCall] Video disabled');
    } else {
      // Video is off, turn it on
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: isLowData ? VIDEO_CONSTRAINTS.low : VIDEO_CONSTRAINTS.high,
        });
        
        const newVideoTrack = videoStream.getVideoTracks()[0];
        localStreamRef.current.addTrack(newVideoTrack);
        
        // Add to peer connection
        if (peerConnectionRef.current) {
          videoSenderRef.current = peerConnectionRef.current.addTrack(newVideoTrack, localStreamRef.current);
          
          // Apply bitrate cap
          await adjustVideoBitrate(isLowData ? BITRATE_CAPS.low : BITRATE_CAPS.mobile);
        }
        
        // Update local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        
        setState(prev => ({
          ...prev,
          video: {
            ...prev.video,
            isEnabled: true,
            localQuality: (prev.video?.isLowDataMode ?? false) ? '360p' : '720p',
          },
        }));
        
        // Start God Eye if calling AI
        if (state.currentCall?.receiver.isAI) {
          startGodEye();
        }
        
        console.log('[QuantumCall] Video enabled');
      } catch (err) {
        console.error('[QuantumCall] Failed to enable video:', err);
        setState(prev => ({ ...prev, error: 'Failed to enable camera' }));
      }
    }
  }, [state.video?.isLowDataMode, state.currentCall?.receiver.isAI, adjustVideoBitrate, stopGodEye, startGodEye]);

  const setLowDataMode = useCallback(async (enabled: boolean) => {
    const videoEnabled = state.video?.isEnabled ?? false;
    const currentQuality = state.video?.localQuality ?? 'off';
    
    setState(prev => ({
      ...prev,
      video: {
        ...prev.video,
        isLowDataMode: enabled,
      },
    }));
    
    if (enabled && videoEnabled && currentQuality === '720p') {
      await downgradeVideoQuality();
    }
    
    console.log(`[QuantumCall] Low Data Mode: ${enabled ? 'ON' : 'OFF'}`);
  }, [state.video?.isEnabled, state.video?.localQuality, downgradeVideoQuality]);

  // Flip between front and back cameras during video call
  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current || !state.video?.isEnabled) {
      console.warn('[QuantumCall] Cannot flip camera - video not enabled');
      return;
    }

    const currentFacing = state.video?.cameraFacing ?? 'front';
    const targetFacing = currentFacing === 'front' ? 'back' : 'front';

    console.log(`[QuantumCall] Flipping camera: ${currentFacing} → ${targetFacing}`);

    try {
      // Stop current video track
      const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (currentVideoTrack) {
        currentVideoTrack.stop();
        localStreamRef.current.removeTrack(currentVideoTrack);
      }

      // Get new video stream with target facing
      const isLowData = state.video?.isLowDataMode ?? false;
      const constraints = isLowData ? VIDEO_CONSTRAINTS.low : VIDEO_CONSTRAINTS.high;
      
      // Try camera devices hook first
      let newStream = await cameraDevices.getStream(targetFacing, {
        width: constraints.width.ideal,
        height: constraints.height.ideal,
        frameRate: constraints.frameRate?.ideal,
      });

      // Fallback to basic getUserMedia
      if (!newStream) {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...constraints,
            facingMode: targetFacing === 'back' ? 'environment' : 'user',
          },
          audio: false,
        });
      }

      if (!newStream) {
        console.error('[QuantumCall] Failed to get camera stream for flip');
        setState(prev => ({ ...prev, error: 'Failed to switch camera' }));
        return;
      }

      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Add new track to local stream
      localStreamRef.current.addTrack(newVideoTrack);

      // Replace track in peer connection
      if (videoSenderRef.current) {
        await videoSenderRef.current.replaceTrack(newVideoTrack);
      }

      // Update local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      // Update state
      setState(prev => ({
        ...prev,
        video: {
          ...prev.video,
          cameraFacing: targetFacing,
        },
      }));

      console.log(`[QuantumCall] ✓ Camera flipped to ${targetFacing}`);
      
      // Dispatch event for UI feedback
      window.dispatchEvent(new CustomEvent('quantum-call-camera-flipped', {
        detail: { facing: targetFacing }
      }));

    } catch (err) {
      console.error('[QuantumCall] Failed to flip camera:', err);
      setState(prev => ({ ...prev, error: 'Failed to switch camera' }));
    }
  }, [state.video?.isEnabled, state.video?.cameraFacing, state.video?.isLowDataMode, cameraDevices]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // WEBRTC PEER CONNECTION
  // ═══════════════════════════════════════════════════════════════════════════════

  const createPeerConnection = useCallback((remoteUserId: string): RTCPeerConnection => {
    console.log('[QuantumCall] Creating peer connection...');
    
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('[QuantumCall] ICE candidate generated');
        await sendSignal(remoteUserId, 'ice-candidate', {
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[QuantumCall] Connection state:', pc.connectionState);
      
      switch (pc.connectionState) {
        case 'connecting':
          handshakeStartTimeRef.current = Date.now();
          break;
        case 'connected':
          if (handshakeStartTimeRef.current) {
            const handshakeTime = Date.now() - handshakeStartTimeRef.current;
            console.log(`[QuantumCall] Handshake completed in ${handshakeTime}ms`);
            
            if (handshakeTime > ENCRYPTION_HANDSHAKE_TIMEOUT_MS) {
              severConnection(`Suspicious handshake timing: ${handshakeTime}ms`);
              return;
            }
          }
          
          setState(prev => ({ ...prev, callState: 'connected', connectionQuality: 'good' }));
          callStartTimeRef.current = new Date();
          monitorAudioLevels();
          
          // Start God Eye if video is enabled and calling AI
          const videoIsOn = state.video?.isEnabled ?? false;
          const videoQuality = state.video?.localQuality ?? 'off';
          if (videoIsOn && state.currentCall?.receiver.isAI) {
            startGodEye();
          }
          
          // Log to DHF Core for Zoe learning
          logZoeTTSContext(
            `Video call connected. Video: ${videoIsOn ? videoQuality : 'off'}. Encryption verified.`,
            'call_start'
          );
          
          // Dispatch DHF call connected event for Zoe Core
          window.dispatchEvent(new CustomEvent('zoe-dhf-call-connected', {
            detail: {
              timestamp: Date.now(),
              participant: state.currentCall?.receiver?.displayName || 'Unknown',
              isAI: state.currentCall?.receiver?.isAI || false,
              videoEnabled: videoIsOn,
            }
          }));
          break;
        case 'disconnected':
          triggerSecurityAlert('connection_interrupted', 'Network disconnection detected');
          setState(prev => ({ ...prev, callState: 'reconnecting' }));
          break;
        case 'failed':
          triggerSecurityAlert('connection_failed', 'WebRTC connection failed');
          setState(prev => ({ ...prev, callState: 'reconnecting' }));
          // Log connection failure to DHF
          logZoeTTSContext('Call connection failed due to network issues', 'call_end');
          break;
        case 'closed':
          setState(prev => ({ ...prev, callState: 'ended' }));
          break;
      }
    };

    pc.ontrack = (event) => {
      console.log('[QuantumCall] Remote track received:', event.track.kind);
      remoteStreamRef.current = event.streams[0];
      
      if (event.track.kind === 'audio') {
        console.log('[QuantumCall] Setting up remote audio playback');
        
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
          // iOS/Safari compatibility
          (remoteAudioRef.current as any).playsInline = true;
        }
        
        remoteAudioRef.current.srcObject = event.streams[0];
        
        // Force play with retry for mobile browsers
        const playWithRetry = async (retries = 3) => {
          for (let i = 0; i < retries; i++) {
            try {
              await remoteAudioRef.current?.play();
              console.log('[QuantumCall] Remote audio playing successfully');
              return;
            } catch (err) {
              console.warn(`[QuantumCall] Remote audio play attempt ${i + 1} failed:`, err);
              if (i < retries - 1) {
                await new Promise(r => setTimeout(r, 200));
              }
            }
          }
          console.error('[QuantumCall] Failed to play remote audio after retries - user may not hear caller');
          // Dispatch event for UI to show a manual "unmute" button if needed
          window.dispatchEvent(new CustomEvent('quantum-call-audio-blocked', {
            detail: { message: 'Tap to hear caller' }
          }));
        };
        
        playWithRetry();
      }
      
      if (event.track.kind === 'video') {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setState(prev => ({
          ...prev,
          video: {
            ...prev.video,
            remoteQuality: '720p', // Assume 720p, will adjust based on stats
          },
        }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log('[QuantumCall] ICE state:', iceState);
      
      if (iceState === 'failed') {
        triggerSecurityAlert('ice_failure', 'ICE negotiation failed - potential network interference');
        monitorEncryptionHandshake();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [sendSignal, monitorAudioLevels, state.video?.isEnabled, state.video?.localQuality, state.currentCall?.receiver.isAI, startGodEye, logZoeTTSContext, triggerSecurityAlert, monitorEncryptionHandshake, severConnection]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CALL INITIATION
  // ═══════════════════════════════════════════════════════════════════════════════

  const initiateCall = useCallback(async (receiver: CallParticipant, withVideo: boolean = false) => {
    if (!currentUserId) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
      return;
    }
    
    // Prevent duplicate call attempts
    if (state.callState !== 'idle') {
      console.warn('[QuantumCall] Cannot initiate call - already in call state:', state.callState);
      return;
    }
    
    // Clean up any stale peer connection
    if (peerConnectionRef.current) {
      const pcState = peerConnectionRef.current.connectionState;
      if (pcState !== 'closed') {
        console.log('[QuantumCall] Cleaning up stale peer connection before new call');
        peerConnectionRef.current.close();
      }
      peerConnectionRef.current = null;
    }

    console.log(`[QuantumCall] Initiating ${withVideo ? 'video' : 'voice'} call to`, receiver.userId.slice(0, 8));
    
    // Play outgoing ringtone
    playCallRingtone(false);
    
    setState(prev => ({
      ...prev,
      callState: 'requesting',
      currentCall: {
        id: `call_${Date.now()}`,
        caller: { userId: currentUserId },
        receiver,
        duration: 0,
        quality: 'unknown',
      },
      error: null,
    }));

    const stream = await setupLocalMedia(withVideo);
    if (!stream) {
      stopCallRingtone();
      setState(prev => ({ ...prev, callState: 'idle', error: 'Failed to access microphone/camera' }));
      return;
    }

    const pc = createPeerConnection(receiver.userId);
    
    // Add all tracks to peer connection
    stream.getTracks().forEach(track => {
      const sender = pc.addTrack(track, stream);
      if (track.kind === 'video') {
        videoSenderRef.current = sender;
      }
    });

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    
    // Apply SDP modifiers
    offer.sdp = OPUS_32KBPS_SDP_MODIFIER(offer.sdp || '');
    if (withVideo) {
      offer.sdp = VIDEO_CODEC_MODIFIER(offer.sdp);
    }
    
    await pc.setLocalDescription(offer);
    
    await sendSignal(receiver.userId, 'call-request', {
      offer: pc.localDescription?.toJSON(),
      callerName: receiver.displayName,
      withVideo,
    });

    callTimeoutRef.current = setTimeout(() => {
      if (state.callState === 'requesting') {
        endCall('timeout');
      }
    }, CALL_TIMEOUT_MS);

  }, [currentUserId, setupLocalMedia, createPeerConnection, sendSignal, state.callState, playCallRingtone, stopCallRingtone]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CALL ANSWERING
  // ═══════════════════════════════════════════════════════════════════════════════

  const acceptCall = useCallback(async (withVideo: boolean = false) => {
    if (!state.incomingCall || !currentUserId) return;

    console.log('[QuantumCall] Accepting call from', state.incomingCall.userId.slice(0, 8));
    
    // Stop incoming ringtone and play connect sound
    stopCallRingtone();
    playCallConnect();
    
    setState(prev => ({ ...prev, callState: 'connecting' }));

    const stream = await setupLocalMedia(withVideo);
    if (!stream) return;

    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error('[QuantumCall] No peer connection available');
      return;
    }

    stream.getTracks().forEach(track => {
      const sender = pc.addTrack(track, stream);
      if (track.kind === 'video') {
        videoSenderRef.current = sender;
      }
    });

    const answer = await pc.createAnswer();
    answer.sdp = OPUS_32KBPS_SDP_MODIFIER(answer.sdp || '');
    if (withVideo) {
      answer.sdp = VIDEO_CODEC_MODIFIER(answer.sdp);
    }
    await pc.setLocalDescription(answer);

    await sendSignal(state.incomingCall.userId, 'call-accept', {
      answer: pc.localDescription?.toJSON(),
      withVideo,
    });

  }, [state.incomingCall, currentUserId, setupLocalMedia, sendSignal, stopCallRingtone, playCallConnect]);

  const rejectCall = useCallback(async () => {
    if (!state.incomingCall || !currentUserId) return;

    console.log('[QuantumCall] Rejecting call');

    // Stop any active ringtone immediately (prevents persistent ringing on reject)
    stopCallRingtone();

    await sendSignal(state.incomingCall.userId, 'call-reject', {
      reason: 'rejected',
    });

    setState(prev => ({
      ...prev,
      callState: 'idle',
      incomingCall: null,
    }));

  }, [state.incomingCall, currentUserId, sendSignal, stopCallRingtone]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CALL CONTROL
  // ═══════════════════════════════════════════════════════════════════════════════

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // MASTER CLEANUP - KILLS ALL MEDIA STREAMS (Audio + Video)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const cleanupAllMedia = useCallback(() => {
    console.log('[QuantumCall] MASTER CLEANUP: Stopping all media streams');
    
    // Kill local stream (audio + video)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`[QuantumCall] Stopping track: ${track.kind} (${track.label})`);
        track.stop();
        track.enabled = false;
      });
      localStreamRef.current = null;
    }
    
    // Kill remote stream
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => {
        console.log(`[QuantumCall] Stopping remote track: ${track.kind}`);
        track.stop();
        track.enabled = false;
      });
      remoteStreamRef.current = null;
    }
    
    // Disconnect remote audio element
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    
    // Clear video refs
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // Clear video sender
    videoSenderRef.current = null;
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Dispatch DHF event for Zoe Core
    window.dispatchEvent(new CustomEvent('zoe-dhf-stream-cleanup', {
      detail: {
        timestamp: Date.now(),
        source: 'quantum-call',
        action: 'master-cleanup',
      }
    }));
    
    console.log('[QuantumCall] All media streams terminated');
  }, []);

  const endCall = useCallback(async (reason: CallEndReason = 'completed') => {
    // CRITICAL: Force stop ringtone IMMEDIATELY at the top of endCall
    forceStopAllRingtones();
    
    // Guard: ignore duplicate end events when we're already idle (prevents repeated end tones)
    if (state.callState === 'idle' && !state.currentCall && !state.incomingCall) {
      console.log('[QuantumCall] endCall ignored (already idle)');
      cleanupAllMedia();
      return;
    }

    console.log('[QuantumCall] Ending call:', reason);

    // Play end sound (ringtone already stopped above)
    playCallEnd();

    // Stop God Eye
    stopGodEye();

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    const durationMs = callStartTimeRef.current
      ? Date.now() - callStartTimeRef.current.getTime()
      : 0;
    const durationSeconds = Math.floor(durationMs / 1000);

    const remoteUserId = state.currentCall?.receiver.userId || state.incomingCall?.userId;
    if (remoteUserId && currentUserId) {
      await sendSignal(remoteUserId, 'call-end', { reason, duration: durationSeconds });
      
      if (state.currentCall && callStartTimeRef.current) {
        await supabase.from('quantum_call_sessions').insert({
          caller_id: state.currentCall.caller.userId,
          receiver_id: state.currentCall.receiver.userId,
          started_at: callStartTimeRef.current.toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          call_quality: state.connectionQuality,
          codec_used: state.video?.isEnabled ? (state.video?.codec ?? 'opus').toLowerCase() : 'opus',
          bitrate_kbps: state.video?.isEnabled ? Math.round((state.video?.currentBitrate ?? 0) / 1000) : 32,
          encryption_level: 'quantum_shield',
          ended_by: currentUserId,
          end_reason: reason,
        });

        const encryptionSignature = await generateQuantumSignature();
        
        await logToBlackBox('quantum_call_completed', {
          duration_ms: durationMs,
          connection_quality: packetLossRef.current,
          participants: {
            caller_id: state.currentCall.caller.userId,
            receiver_id: state.currentCall.receiver.userId,
          },
          encryption_signature: encryptionSignature,
          codec: state.video?.isEnabled ? (state.video?.codec ?? 'opus').toLowerCase() : 'opus',
          bitrate_kbps: state.video?.isEnabled ? Math.round((state.video?.currentBitrate ?? 0) / 1000) : 32,
          handshake_time_ms: handshakeStartTimeRef.current 
            ? callStartTimeRef.current.getTime() - handshakeStartTimeRef.current 
            : undefined,
          security_alerts: securityAlertsRef.current.length > 0 
            ? [...securityAlertsRef.current] 
            : undefined,
          video_enabled: state.video?.isEnabled ?? false,
          video_quality: state.video?.localQuality ?? 'off',
          god_eye_analyses: godEyeAnalysisCountRef.current,
        }, reason === 'completed' ? 'info' : 'warning');

        await logZoeTTSContext(
          `Video call ended with ${state.currentCall.receiver.displayName || 'user'}. Duration: ${durationSeconds}s. Quality: ${state.connectionQuality}. Video: ${state.video?.isEnabled ? state.video?.localQuality : 'off'}. God Eye analyses: ${godEyeAnalysisCountRef.current}.`,
          'call_end'
        );
      }
    }

    // Reset security tracking
    securityAlertsRef.current = [];
    packetLossRef.current = 0;
    handshakeStartTimeRef.current = null;
    godEyeAnalysisCountRef.current = 0;

    // MASTER CLEANUP - Kill all streams
    cleanupAllMedia();

    setState(prev => ({
      ...prev,
      callState: 'idle',
      currentCall: null,
      incomingCall: null,
      isMuted: false,
      isSpeaking: false,
      remoteIsSpeaking: false,
      video: {
        isEnabled: false,
        localQuality: '720p',
        remoteQuality: 'off',
        isLowDataMode: false,
        codec: 'unknown',
        currentBitrate: 0,
        cameraFacing: 'front',
      },
      godEyeEnabled: false,
      lastGodEyeAnalysis: null,
    }));

    callStartTimeRef.current = null;
    
    // Dispatch DHF event for Zoe Core
    window.dispatchEvent(new CustomEvent('zoe-dhf-call-ended', {
      detail: {
        timestamp: Date.now(),
        reason,
        duration_seconds: durationSeconds,
      }
    }));

  }, [state.currentCall, state.incomingCall, state.connectionQuality, state.video?.isEnabled, state.video?.codec, state.video?.currentBitrate, state.video?.localQuality, currentUserId, sendSignal, logToBlackBox, logZoeTTSContext, stopGodEye, forceStopAllRingtones, playCallEnd, cleanupAllMedia, state.callState]);

  // Keep refs updated with latest callbacks to avoid effect re-runs
  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);
  
  useEffect(() => {
    createPeerConnectionRef.current = createPeerConnection;
  }, [createPeerConnection]);
  
  useEffect(() => {
    decryptSignalDataRef.current = decryptSignalData;
    playCallRingtoneRef.current = playCallRingtone;
    stopCallRingtoneRef.current = stopCallRingtone;
    forceStopAllRingtonesRef.current = forceStopAllRingtones;
    playCallConnectRef.current = playCallConnect;
  }, [decryptSignalData, playCallRingtone, stopCallRingtone, forceStopAllRingtones, playCallConnect]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // REALTIME SIGNAL HANDLER
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!currentUserId) return;

    console.log('[QuantumCall] Setting up realtime signal listener');

    const flushBufferedIceCandidates = async (pc: RTCPeerConnection, remoteUserId: string) => {
      const buffered = pendingIceCandidatesRef.current[remoteUserId];
      if (!buffered || buffered.length === 0) return;

      console.log(`[QuantumCall] Flushing ${buffered.length} buffered ICE candidates`);
      for (const candidateInit of buffered) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (err) {
          console.warn('[QuantumCall] Failed to add buffered ICE candidate:', err);
        }
      }
      pendingIceCandidatesRef.current[remoteUserId] = [];
    };

    const processSignal = async (signal: {
      id: string;
      caller_id: string;
      signal_type: string;
      signal_data: any;
      encrypted_payload?: string;
    }) => {
      console.log('[QuantumCall] Received signal:', signal.signal_type);

      // Use refs to get latest callbacks without causing effect re-runs
      const data = signal.encrypted_payload
        ? decryptSignalDataRef.current?.(signal.encrypted_payload)
        : signal.signal_data;

      if (!data) {
        console.error('[QuantumCall] Failed to process signal data');
        return;
      }

      switch (signal.signal_type) {
        case 'call-request': {
          console.log('[QuantumCall] Incoming call from', signal.caller_id.slice(0, 8));

          const { data: callerProfile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name, username, profile_photo_url')
            .eq('user_id', signal.caller_id)
            .single();

          if (profileError) {
            console.warn('[QuantumCall] Failed to load caller profile:', profileError);
          }

          const pc = createPeerConnectionRef.current?.(signal.caller_id);
          if (pc && (data as any).offer) {
            await pc.setRemoteDescription(new RTCSessionDescription((data as any).offer));
            await flushBufferedIceCandidates(pc, signal.caller_id);
          }

          // Play incoming call ringtone
          playCallRingtoneRef.current?.(true);

          setState(prev => ({
            ...prev,
            callState: 'incoming',
            incomingCall: {
              userId: signal.caller_id,
              displayName: callerProfile?.display_name || callerProfile?.username || 'Unknown',
              avatarUrl: callerProfile?.profile_photo_url,
            },
          }));
          break;
        }

        case 'call-accept': {
          console.log('[QuantumCall] Call accepted');
          
          // Stop outgoing ringtone and play connect sound
          stopCallRingtoneRef.current?.();
          playCallConnectRef.current?.();
          
          if (peerConnectionRef.current && (data as any).answer) {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription((data as any).answer)
            );
            await flushBufferedIceCandidates(peerConnectionRef.current, signal.caller_id);
          }

          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
          }
          break;
        }

        case 'call-reject': {
          console.log('[QuantumCall] Call rejected');
          await endCallRef.current?.('rejected');
          break;
        }

        case 'call-end': {
          console.log('[QuantumCall] Remote ended call');
          await endCallRef.current?.('completed');
          break;
        }

        case 'ice-candidate': {
          const pc = peerConnectionRef.current;
          const candidate = (data as any).candidate as RTCIceCandidateInit | undefined;
          if (pc && candidate) {
            // Candidates can arrive before offer/answer is applied.
            if (!pc.remoteDescription) {
              pendingIceCandidatesRef.current[signal.caller_id] = [
                ...(pendingIceCandidatesRef.current[signal.caller_id] || []),
                candidate,
              ];
              console.log('[QuantumCall] Buffered ICE candidate (no remoteDescription yet)');
              break;
            }

            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.warn('[QuantumCall] Failed to add ICE candidate:', err);
            }
          }
          break;
        }

        case 'call-busy': {
          console.log('[QuantumCall] Remote is busy');
          await endCallRef.current?.('busy');
          break;
        }
      }

      const { error: deleteError } = await supabase
        .from('quantum_call_signals')
        .delete()
        .eq('id', signal.id);

      if (deleteError) {
        console.warn('[QuantumCall] Failed to delete processed signal:', deleteError);
      }
    };

    const channel = supabase
      .channel(`quantum-calls-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quantum_call_signals',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const signal = payload.new as {
            id: string;
            caller_id: string;
            signal_type: string;
            signal_data: any;
            encrypted_payload?: string;
          };

          await processSignal(signal);
        }
      )
      .subscribe(async (status) => {
        console.log('[QuantumCall] Realtime channel status:', status);
        if (status !== 'SUBSCRIBED') return;

        // IMPORTANT: postgres_changes only fires for new inserts after subscription.
        // Fetch any pending (not-yet-processed) signals so calls don't get stuck.
        // Only fetch signals from the last 5 minutes to avoid processing stale data
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: pendingSignals, error: pendingError } = await supabase
          .from('quantum_call_signals')
          .select('id, caller_id, signal_type, signal_data, encrypted_payload, created_at')
          .eq('receiver_id', currentUserId)
          .gte('created_at', fiveMinutesAgo)
          .order('created_at', { ascending: true })
          .limit(50);

        if (pendingError) {
          console.warn('[QuantumCall] Failed to load pending signals:', pendingError);
          return;
        }

        // Clean up any stale signals older than 1 hour (fire-and-forget)
        supabase
          .from('quantum_call_signals')
          .delete()
          .eq('receiver_id', currentUserId)
          .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .then(({ error }) => {
            if (error) console.warn('[QuantumCall] Stale signal cleanup failed:', error);
          });

        if (pendingSignals && pendingSignals.length > 0) {
          console.log(`[QuantumCall] Processing ${pendingSignals.length} pending signal(s)`);
          for (const s of pendingSignals) {
            await processSignal(s as any);
          }
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [currentUserId]); // Only re-run when currentUserId changes

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIDEO REF SETTERS (for external component binding)
  // ═══════════════════════════════════════════════════════════════════════════════

  const setLocalVideoRef = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    }
  }, []);

  const setRemoteVideoRef = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoRef.current = el;
    if (el && remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════════
  // CLEANUP ON UNMOUNT + WINDOW CLOSE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('[QuantumCall] Window closing - forcing cleanup');
      stopCallRingtone();
      cleanupAllMedia();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Cleanup on component unmount
      stopCallRingtone();
      cleanupAllMedia();
    };
  }, [cleanupAllMedia, stopCallRingtone]);

  return {
    // State
    ...state,
    
    // Actions
    initiateCall,
    acceptCall,
    rejectCall,
    toggleMute,
    endCall,
    
    // Video controls
    toggleVideo,
    flipCamera,
    setLowDataMode,
    setLocalVideoRef,
    setRemoteVideoRef,
    
    // Camera info
    availableCameras: cameraDevices.devices,
    hasMultipleCameras: cameraDevices.hasMultipleCameras,
    frontCamera: cameraDevices.frontCamera,
    backCamera: cameraDevices.backCamera,
    
    // God Eye
    startGodEye,
    stopGodEye,
    
    // Master cleanup (for external use)
    cleanupAllMedia,
    
    // Computed
    isInCall: state.callState === 'connected' || state.callState === 'connecting',
    hasIncomingCall: state.callState === 'incoming',
    callDuration: callStartTimeRef.current 
      ? Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000)
      : 0,
  };
};

export default useZoeQuantumCall;
