/**
 * Zoe's biometric-driven recommendations.
 *
 * Calls the `zoe-biometric-recommend` backend under the signed-in member's JWT;
 * the suggestion is derived from that member's real sensor history (heart rate,
 * motion, battery, location) — never from simulated values.
 */
import { supabase } from '@/integrations/supabase/client';

export interface BiometricSignals {
  samples: number;
  heartRate: { latest: number | null; avg: number | null; trend: number | null };
  motion: { latest: number | null; avg: number | null };
  battery: { level: number | null; charging: boolean | null };
  network: string | null;
  movementKm: number | null;
  lastCapturedAt: string | null;
  missing: string[];
}

export interface BiometricRecommendation {
  recommendation: string;
  signals: BiometricSignals;
  model: string;
  id: string | null;
}

export async function requestBiometricRecommendation(
  options: { persist?: boolean } = {},
): Promise<BiometricRecommendation | null> {
  try {
    const { data, error } = await supabase.functions.invoke('zoe-biometric-recommend', {
      body: { persist: options.persist !== false },
    });
    if (error) {
      console.warn('[zoeBiometricRecommend] failed:', error.message);
      return null;
    }
    if (!data?.recommendation) return null;
    return {
      recommendation: String(data.recommendation),
      signals: data.signals as BiometricSignals,
      model: String(data.model ?? 'unknown'),
      id: data.id ?? null,
    };
  } catch (e) {
    console.warn('[zoeBiometricRecommend] threw:', e);
    return null;
  }
}

/** Latest stored biometric recommendations for the signed-in member. */
export async function loadBiometricRecommendations(limit = 5) {
  const { data, error } = await supabase
    .from('zoe_biometric_recommendations')
    .select('id, recommendation, model, sample_count, signals, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[zoeBiometricRecommend] history failed:', error.message);
    return [];
  }
  return data ?? [];
}

export default requestBiometricRecommendation;
