// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIORAL FINGERPRINT PERSISTENCE
// Audit fix (OMNI_GRAPH SEP03 #6/#7): typing-rhythm telemetry was computed and
// discarded, leaving `behavioral_fingerprints` provisioned but dead. This module
// is the single writer: it folds each completed typing round into a rolling
// per-user fingerprint (exponential moving average, α = 0.3).
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

export interface BehavioralFingerprintSample {
  wordsPerMinute: number;
  deletionCount: number;
  pausesBetweenWords: number[];
  totalTypingDuration: number;
  characterCount: number;
  wordCount: number;
  hesitationLevel: string;
  inferredState: string;
  confidenceScore: number;
}

/** Smoothing factor for S(t+1) = αS(t) + (1-α)F(E,Z). */
export const FINGERPRINT_ALPHA = 0.7;

/** A sample is only worth persisting when the user actually typed something. */
export const isMeaningfulSample = (s: BehavioralFingerprintSample): boolean =>
  s.characterCount >= 8 && s.totalTypingDuration >= 1000;

export const blendEma = (previous: number | null | undefined, next: number): number => {
  if (previous === null || previous === undefined || !Number.isFinite(previous)) return next;
  return Number((FINGERPRINT_ALPHA * previous + (1 - FINGERPRINT_ALPHA) * next).toFixed(2));
};

export const averagePause = (pauses: number[]): number =>
  pauses.length ? Math.round(pauses.reduce((a, b) => a + b, 0) / pauses.length) : 0;

export interface PersistResult {
  persisted: boolean;
  reason?: 'anonymous' | 'insignificant' | 'error';
  error?: string;
}

/** Fire-and-forget writer. Never throws — telemetry must never break typing. */
export async function persistBehavioralFingerprint(
  sample: BehavioralFingerprintSample,
): Promise<PersistResult> {
  try {
    if (!isMeaningfulSample(sample)) return { persisted: false, reason: 'insignificant' };

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return { persisted: false, reason: 'anonymous' };

    const { data: existing } = await supabase
      .from('behavioral_fingerprints')
      .select('avg_typing_speed, reaction_time_avg_ms, typing_rhythm_pattern, fingerprint_version')
      .eq('user_id', userId)
      .maybeSingle();

    const avgPause = averagePause(sample.pausesBetweenWords);
    const rhythm = {
      hesitation_level: sample.hesitationLevel,
      inferred_state: sample.inferredState,
      confidence: sample.confidenceScore,
      deletions: sample.deletionCount,
      avg_pause_ms: avgPause,
      words: sample.wordCount,
      characters: sample.characterCount,
      sampled_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('behavioral_fingerprints').upsert(
      {
        user_id: userId,
        avg_typing_speed: blendEma(existing?.avg_typing_speed, sample.wordsPerMinute),
        reaction_time_avg_ms: Math.round(blendEma(existing?.reaction_time_avg_ms, avgPause)),
        typing_rhythm_pattern: rhythm,
        fingerprint_version: (existing?.fingerprint_version ?? 0) + 1,
        last_calibrated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (error) return { persisted: false, reason: 'error', error: error.message };
    return { persisted: true };
  } catch (e) {
    return { persisted: false, reason: 'error', error: e instanceof Error ? e.message : String(e) };
  }
}
