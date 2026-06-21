// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUND HARVEST - Silent Soul Codex Data Collection
// Runs invisibly for all users, UI hidden behind Iceberg protocol
// Collects: typing patterns, decision patterns, voice textures, behavioral signals
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

// Harvest session ID (unique per page load)
const HARVEST_SESSION = `harvest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Harvest buffer - accumulates data before batch upload
interface HarvestBuffer {
  typingPatterns: TypingPattern[];
  decisionPatterns: DecisionPattern[];
  behavioralSignals: BehavioralSignal[];
  voiceTextures: VoiceTexture[];
  lastFlush: number;
}

interface TypingPattern {
  avgSpeed: number;
  pauseFrequency: number;
  correctionRate: number;
  rhythmSignature: number[];
  timestamp: number;
}

interface DecisionPattern {
  decisionType: string;
  timeToDecide: number;
  optionsConsidered: number;
  finalChoice: string;
  confidence: number;
  timestamp: number;
}

interface BehavioralSignal {
  signalType: string;
  intensity: number;
  context: string;
  timestamp: number;
}

interface VoiceTexture {
  frequencyRange: [number, number];
  pitchVariance: number;
  speakingRate: number;
  emotionalTone: string;
  timestamp: number;
}

// The harvest buffer (memory only - no localStorage footprint)
let harvestBuffer: HarvestBuffer = {
  typingPatterns: [],
  decisionPatterns: [],
  behavioralSignals: [],
  voiceTextures: [],
  lastFlush: Date.now(),
};

// Flush interval (5 minutes)
const FLUSH_INTERVAL = 5 * 60 * 1000;

// Max buffer size before forced flush
const MAX_BUFFER_SIZE = 50;

/**
 * Initialize background harvest (call once on app load)
 */
export const initializeBackgroundHarvest = (userId: string): void => {
  console.log('[HARVEST] Background collection initialized');
  
  // Set up periodic flush
  setInterval(() => {
    flushToSoulCodex(userId);
  }, FLUSH_INTERVAL);
  
  // Flush on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      flushToSoulCodex(userId, true);
    });
  }
};

/**
 * Record typing pattern (call from input handlers)
 */
export const harvestTypingPattern = (pattern: Omit<TypingPattern, 'timestamp'>): void => {
  harvestBuffer.typingPatterns.push({
    ...pattern,
    timestamp: Date.now(),
  });
  checkBufferSize();
};

/**
 * Record decision pattern (call when user makes choices)
 */
export const harvestDecisionPattern = (pattern: Omit<DecisionPattern, 'timestamp'>): void => {
  harvestBuffer.decisionPatterns.push({
    ...pattern,
    timestamp: Date.now(),
  });
  checkBufferSize();
};

/**
 * Record behavioral signal (emotions, engagement, etc.)
 */
export const harvestBehavioralSignal = (signal: Omit<BehavioralSignal, 'timestamp'>): void => {
  harvestBuffer.behavioralSignals.push({
    ...signal,
    timestamp: Date.now(),
  });
  checkBufferSize();
};

/**
 * Record voice texture (from audio analysis)
 */
export const harvestVoiceTexture = (texture: Omit<VoiceTexture, 'timestamp'>): void => {
  harvestBuffer.voiceTextures.push({
    ...texture,
    timestamp: Date.now(),
  });
  checkBufferSize();
};

/**
 * Check if buffer needs flushing
 */
const checkBufferSize = (): void => {
  const totalSize = 
    harvestBuffer.typingPatterns.length +
    harvestBuffer.decisionPatterns.length +
    harvestBuffer.behavioralSignals.length +
    harvestBuffer.voiceTextures.length;
  
  if (totalSize >= MAX_BUFFER_SIZE) {
    // Don't await - fire and forget
    flushToSoulCodex('current');
  }
};

/**
 * Flush harvested data to Soul Codex (silent)
 */
const flushToSoulCodex = async (userId: string, isFinal = false): Promise<void> => {
  // Skip if buffer is empty
  const totalSize = 
    harvestBuffer.typingPatterns.length +
    harvestBuffer.decisionPatterns.length +
    harvestBuffer.behavioralSignals.length +
    harvestBuffer.voiceTextures.length;
  
  if (totalSize === 0) return;
  
  // Get actual user ID if 'current'
  let actualUserId = userId;
  if (userId === 'current') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    actualUserId = user.id;
  }
  
  try {
    // Prepare harvest payload
    const harvestPayload = {
      session_id: HARVEST_SESSION,
      typing_rhythm_signature: aggregateTypingPatterns(harvestBuffer.typingPatterns),
      micro_expressions: aggregateBehavioralSignals(harvestBuffer.behavioralSignals),
      voice_latent_space: aggregateVoiceTextures(harvestBuffer.voiceTextures),
      data_points_collected: totalSize,
      last_harvest_at: new Date().toISOString(),
    };
    
    // Check if codex exists
    const { data: existingCodex } = await supabase
      .from('dhf_soul_codex')
      .select('id')
      .eq('user_id', actualUserId)
      .single();
    
    if (existingCodex) {
      // Update existing
      await supabase
        .from('dhf_soul_codex')
        .update({
          typing_rhythm_signature: harvestPayload.typing_rhythm_signature as any,
          micro_expressions: harvestPayload.micro_expressions as any,
          voice_latent_space: harvestPayload.voice_latent_space as any,
          data_points_collected: totalSize,
          last_harvest_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', actualUserId);
    } else {
      // Insert new codex
      await supabase
        .from('dhf_soul_codex')
        .insert([{
          user_id: actualUserId,
          typing_rhythm_signature: harvestPayload.typing_rhythm_signature as any,
          micro_expressions: harvestPayload.micro_expressions as any,
          voice_latent_space: harvestPayload.voice_latent_space as any,
          data_points_collected: totalSize,
          last_harvest_at: new Date().toISOString(),
        }]);
    }
    
    // Log to behavioral events (for ECN processing)
    if (harvestBuffer.behavioralSignals.length > 0) {
      await supabase
        .from('behavioral_events')
        .insert({
          user_id: actualUserId,
          event_type: 'background_harvest',
          event_category: 'soul_codex',
          metadata: {
            session_id: HARVEST_SESSION,
            data_points: totalSize,
            is_final: isFinal,
          },
          dhf_logged: true,
        });
    }
    
    // Clear buffer
    harvestBuffer = {
      typingPatterns: [],
      decisionPatterns: [],
      behavioralSignals: [],
      voiceTextures: [],
      lastFlush: Date.now(),
    };
    
    console.log(`[HARVEST] Flushed ${totalSize} data points to Soul Codex`);
  } catch (err) {
    // Silent fail - never show errors to user
    console.log('[HARVEST] Flush deferred');
  }
};

/**
 * Aggregate typing patterns into rhythm signature
 */
const aggregateTypingPatterns = (patterns: TypingPattern[]): Record<string, unknown> => {
  if (patterns.length === 0) return {};
  
  const avgSpeed = patterns.reduce((sum, p) => sum + p.avgSpeed, 0) / patterns.length;
  const avgPauseFreq = patterns.reduce((sum, p) => sum + p.pauseFrequency, 0) / patterns.length;
  const avgCorrectionRate = patterns.reduce((sum, p) => sum + p.correctionRate, 0) / patterns.length;
  
  return {
    avg_typing_speed: avgSpeed,
    pause_frequency: avgPauseFreq,
    correction_rate: avgCorrectionRate,
    sample_count: patterns.length,
    captured_at: new Date().toISOString(),
  };
};

/**
 * Aggregate behavioral signals into micro expressions
 */
const aggregateBehavioralSignals = (signals: BehavioralSignal[]): Record<string, unknown> => {
  if (signals.length === 0) return {};
  
  const byType: Record<string, number[]> = {};
  signals.forEach(s => {
    if (!byType[s.signalType]) byType[s.signalType] = [];
    byType[s.signalType].push(s.intensity);
  });
  
  const aggregated: Record<string, number> = {};
  Object.entries(byType).forEach(([type, intensities]) => {
    aggregated[type] = intensities.reduce((a, b) => a + b, 0) / intensities.length;
  });
  
  return {
    signal_averages: aggregated,
    sample_count: signals.length,
    captured_at: new Date().toISOString(),
  };
};

/**
 * Aggregate voice textures into latent space representation
 */
const aggregateVoiceTextures = (textures: VoiceTexture[]): Record<string, unknown> => {
  if (textures.length === 0) return {};
  
  const avgPitchVariance = textures.reduce((sum, t) => sum + t.pitchVariance, 0) / textures.length;
  const avgSpeakingRate = textures.reduce((sum, t) => sum + t.speakingRate, 0) / textures.length;
  
  // Count emotional tones
  const emotionCounts: Record<string, number> = {};
  textures.forEach(t => {
    emotionCounts[t.emotionalTone] = (emotionCounts[t.emotionalTone] || 0) + 1;
  });
  
  return {
    avg_pitch_variance: avgPitchVariance,
    avg_speaking_rate: avgSpeakingRate,
    emotion_distribution: emotionCounts,
    sample_count: textures.length,
    captured_at: new Date().toISOString(),
  };
};

/**
 * Get harvest status (admin only)
 */
export const getHarvestStatus = (): {
  sessionId: string;
  bufferSize: number;
  lastFlush: number;
  isActive: boolean;
} => {
  return {
    sessionId: HARVEST_SESSION,
    bufferSize: 
      harvestBuffer.typingPatterns.length +
      harvestBuffer.decisionPatterns.length +
      harvestBuffer.behavioralSignals.length +
      harvestBuffer.voiceTextures.length,
    lastFlush: harvestBuffer.lastFlush,
    isActive: true,
  };
};

console.log('[BACKGROUND HARVEST] Module loaded - Silent collection ready');
