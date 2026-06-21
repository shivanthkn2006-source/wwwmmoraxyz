// ═══════════════════════════════════════════════════════════════════════════════
// CONTINUOUS DHF/ECN DATA STREAM - Real-Time Behavioral Stream Producer
// 360-Degree Conversational Foundation for Zero-Friction Adaptive Learning
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// 27 ECN Emotion States from the VETO framework
export type ECNEmotionState = 
  | 'admiration' | 'amusement' | 'anger' | 'annoyance' | 'anxiety' | 'approval'
  | 'awe' | 'caring' | 'confusion' | 'curiosity' | 'desire'
  | 'disappointment' | 'disapproval' | 'disgust' | 'embarrassment' | 'empathic_pain'
  | 'excitement' | 'fear' | 'frustration' | 'gratitude' | 'grief' | 'joy'
  | 'love' | 'nervousness' | 'nostalgia' | 'optimism' | 'pride'
  | 'realization' | 'relief' | 'remorse' | 'sadness' | 'surprise'
  | 'neutral';

// Voice characteristics for DHF fingerprinting
interface VoiceCharacteristics {
  pitch?: 'low' | 'medium' | 'high';
  pace?: 'slow' | 'normal' | 'fast';
  volume?: number;
  confidence?: number;
}

// Comprehensive behavioral event with all 27 ECN states
interface ComprehensiveBehavioralEvent {
  event_type: string;
  event_category: string;
  context_snippet?: string;
  metadata?: Record<string, any>;
  sentiment_score?: number;
  
  // Enhanced ECN data
  ecn_emotion?: ECNEmotionState;
  ecn_valence?: number; // -1 to 1
  ecn_arousal?: number; // 0 to 1
  ecn_action_tendency?: 'seeking_information' | 'taking_action' | 'avoiding' | 'approaching';
  
  // Voice characteristics
  voice_characteristics?: VoiceCharacteristics;
  
  // Face reaction data (from analyze-face-emotion)
  face_emotion?: string;
  face_confidence?: number;
  
  // Interaction timing
  response_latency_ms?: number;
  interaction_duration_ms?: number;
}

// Stream configuration
interface StreamConfig {
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
  enableECNProcessing: boolean;
  model: 'gemini-2.5-flash-lite' | 'gemini-2.5-flash';
}

const DEFAULT_CONFIG: StreamConfig = {
  batchSize: 10,
  flushIntervalMs: 5000,
  maxQueueSize: 100,
  enableECNProcessing: true,
  model: 'gemini-2.5-flash-lite', // Cost-effective for continuous processing
};

export const useContinuousDHFStream = (config: Partial<StreamConfig> = {}) => {
  const { user } = useAuth();
  const [isStreaming, setIsStreaming] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [lastFlushTime, setLastFlushTime] = useState<Date | null>(null);
  const [streamHealth, setStreamHealth] = useState<'healthy' | 'degraded' | 'disconnected'>('disconnected');
  
  const eventQueue = useRef<ComprehensiveBehavioralEvent[]>([]);
  const flushInterval = useRef<NodeJS.Timeout | null>(null);
  const sessionId = useRef<string>(crypto.randomUUID());
  const streamConfig = useRef<StreamConfig>({ ...DEFAULT_CONFIG, ...config });
  
  // Track cumulative stats
  const statsRef = useRef({
    totalEventsSent: 0,
    failedAttempts: 0,
    avgLatencyMs: 0,
    ecnEventsProcessed: 0,
  });

  // Flush events to backend (background upload)
  const flushEvents = useCallback(async () => {
    if (!user || eventQueue.current.length === 0) return;

    const eventsToSend = eventQueue.current.splice(0, streamConfig.current.batchSize);
    
    try {
      const startTime = performance.now();
      
      const { data, error } = await supabase.functions.invoke('behavioral-event-stream', {
        body: {
          events: eventsToSend.map(e => ({
            event_type: e.event_type,
            event_category: e.event_category,
            context_snippet: e.context_snippet?.substring(0, 50),
            metadata: {
              ...e.metadata,
              ecn_emotion: e.ecn_emotion,
              ecn_valence: e.ecn_valence,
              ecn_arousal: e.ecn_arousal,
              ecn_action_tendency: e.ecn_action_tendency,
              voice_characteristics: e.voice_characteristics,
              face_emotion: e.face_emotion,
              face_confidence: e.face_confidence,
              response_latency_ms: e.response_latency_ms,
              interaction_duration_ms: e.interaction_duration_ms,
            },
            session_id: sessionId.current,
            sentiment_score: e.sentiment_score,
          })),
          process_ecn: streamConfig.current.enableECNProcessing && eventsToSend.length >= 5,
          model: streamConfig.current.model,
        },
      });

      const latencyMs = performance.now() - startTime;
      
      if (error) {
        console.error('[DHF Stream] Flush error:', error);
        // Re-queue failed events
        eventQueue.current.unshift(...eventsToSend);
        statsRef.current.failedAttempts++;
        setStreamHealth('degraded');
      } else {
        statsRef.current.totalEventsSent += eventsToSend.length;
        statsRef.current.avgLatencyMs = (statsRef.current.avgLatencyMs + latencyMs) / 2;
        setLastFlushTime(new Date());
        setStreamHealth('healthy');
        
        // Track ECN processing
        if (data?.ecn_processed) {
          statsRef.current.ecnEventsProcessed += eventsToSend.length;
        }
      }
    } catch (err) {
      console.error('[DHF Stream] Flush failed:', err);
      eventQueue.current.unshift(...eventsToSend);
      statsRef.current.failedAttempts++;
      setStreamHealth('degraded');
    }
  }, [user]);

  // Start continuous streaming
  const startStream = useCallback(() => {
    if (isStreaming) return;
    
    setIsStreaming(true);
    setStreamHealth('healthy');
    
    // Set up interval for continuous flushing
    flushInterval.current = setInterval(() => {
      flushEvents();
    }, streamConfig.current.flushIntervalMs);
    
    console.log('[DHF Stream] Started continuous streaming');
  }, [isStreaming, flushEvents]);

  // Stop streaming
  const stopStream = useCallback(() => {
    if (flushInterval.current) {
      clearInterval(flushInterval.current);
      flushInterval.current = null;
    }
    
    // Flush remaining events
    if (eventQueue.current.length > 0) {
      flushEvents();
    }
    
    setIsStreaming(false);
    setStreamHealth('disconnected');
    console.log('[DHF Stream] Stopped streaming');
  }, [flushEvents]);

  // Queue a comprehensive behavioral event
  const queueEvent = useCallback((event: ComprehensiveBehavioralEvent) => {
    if (!user) return;
    
    // Enforce max queue size
    if (eventQueue.current.length >= streamConfig.current.maxQueueSize) {
      eventQueue.current.shift(); // Remove oldest
    }
    
    eventQueue.current.push({
      ...event,
      metadata: {
        ...event.metadata,
        queued_at: new Date().toISOString(),
        session_id: sessionId.current,
      },
    });
    
    setEventCount(prev => prev + 1);
    
    // Immediate flush if batch size reached
    if (eventQueue.current.length >= streamConfig.current.batchSize) {
      flushEvents();
    }
  }, [user, flushEvents]);

  // Track voice command with characteristics
  const trackVoiceCommand = useCallback((
    command: string,
    characteristics?: VoiceCharacteristics,
    ecnState?: ECNEmotionState,
    latencyMs?: number
  ) => {
    queueEvent({
      event_type: 'voice_command',
      event_category: 'voice_interaction',
      context_snippet: command,
      voice_characteristics: characteristics,
      ecn_emotion: ecnState || 'neutral',
      response_latency_ms: latencyMs,
      sentiment_score: characteristics?.confidence || 0.7,
    });
  }, [queueEvent]);

  // Track face emotion from camera analysis
  const trackFaceEmotion = useCallback((
    emotion: string,
    confidence: number,
    context?: string
  ) => {
    queueEvent({
      event_type: 'face_emotion',
      event_category: 'biometric_input',
      context_snippet: context || `Detected: ${emotion}`,
      face_emotion: emotion,
      face_confidence: confidence,
      ecn_emotion: mapFaceToECN(emotion),
      sentiment_score: emotionToSentiment(emotion),
    });
  }, [queueEvent]);

  // Track ECN state change (any of 27 states)
  const trackECNState = useCallback((
    emotion: ECNEmotionState,
    valence: number,
    arousal: number,
    actionTendency: 'seeking_information' | 'taking_action' | 'avoiding' | 'approaching',
    context?: string
  ) => {
    queueEvent({
      event_type: 'ecn_state_change',
      event_category: 'emotional_computation',
      context_snippet: context || `ECN: ${emotion}`,
      ecn_emotion: emotion,
      ecn_valence: valence,
      ecn_arousal: arousal,
      ecn_action_tendency: actionTendency,
      sentiment_score: (valence + 1) / 2, // Convert -1,1 to 0,1
    });
  }, [queueEvent]);

  // Track Zoe interaction with response timing
  const trackZoeInteraction = useCallback((
    interactionType: 'wake_word' | 'command' | 'response' | 'follow_up',
    content: string,
    durationMs?: number,
    ecnState?: ECNEmotionState
  ) => {
    queueEvent({
      event_type: 'zoe_interaction',
      event_category: interactionType,
      context_snippet: content,
      interaction_duration_ms: durationMs,
      ecn_emotion: ecnState || 'neutral',
      metadata: {
        interaction_type: interactionType,
        timestamp: new Date().toISOString(),
      },
    });
  }, [queueEvent]);

  // Auto-start streaming when user is available
  useEffect(() => {
    if (user && !isStreaming) {
      startStream();
    }
    
    return () => {
      stopStream();
    };
  }, [user]);

  // Get stream statistics
  const getStats = useCallback(() => ({
    ...statsRef.current,
    queuedEvents: eventQueue.current.length,
    isStreaming,
    streamHealth,
    lastFlushTime,
    sessionId: sessionId.current,
  }), [isStreaming, streamHealth, lastFlushTime]);

  return {
    // Stream control
    startStream,
    stopStream,
    isStreaming,
    streamHealth,
    
    // Event tracking
    queueEvent,
    trackVoiceCommand,
    trackFaceEmotion,
    trackECNState,
    trackZoeInteraction,
    
    // Stats
    eventCount,
    lastFlushTime,
    getStats,
    
    // Manual flush
    flushEvents,
  };
};

// Helper: Map face emotions to ECN states
function mapFaceToECN(faceEmotion: string): ECNEmotionState {
  const mapping: Record<string, ECNEmotionState> = {
    happy: 'joy',
    sad: 'sadness',
    angry: 'anger',
    fearful: 'fear',
    disgusted: 'disgust',
    surprised: 'surprise',
    neutral: 'neutral',
    contempt: 'disapproval',
  };
  return mapping[faceEmotion.toLowerCase()] || 'neutral';
}

// Helper: Convert emotion to sentiment score
function emotionToSentiment(emotion: string): number {
  const positive = ['happy', 'joy', 'amusement', 'excitement', 'love', 'gratitude', 'pride', 'relief'];
  const negative = ['sad', 'angry', 'fear', 'disgust', 'grief', 'remorse', 'disappointment'];
  
  const emotionLower = emotion.toLowerCase();
  if (positive.some(e => emotionLower.includes(e))) return 0.8;
  if (negative.some(e => emotionLower.includes(e))) return 0.2;
  return 0.5;
}

export default useContinuousDHFStream;
