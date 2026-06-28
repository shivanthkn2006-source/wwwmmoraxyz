/**
 * EMOTIONAL FUSION LAYER
 * Blends multiple emotion signals into ONE avatar emotion + intensity.
 *
 * Inputs:
 *   - conversational sentiment (from message text)
 *   - feature signals (memory recall → Nostalgic, vision scanning → Focused,
 *     festival → Joyful, urgent call → Concerned, hormones phase, etc.)
 *
 * Output: { emotion, intensity 0..1, source } that the avatar/heart consume.
 */

export type FusedEmotion =
  | 'idle' | 'happy' | 'sad' | 'crying' | 'angry'
  | 'surprised' | 'loving' | 'thinking'
  | 'nostalgic' | 'focused' | 'joyful' | 'concerned'
  | 'flirty' | 'sleepy' | 'restless';

export interface EmotionSignal {
  emotion: FusedEmotion;
  weight: number;          // 0..1
  source: string;          // 'sentiment' | 'memory' | 'vision' | 'festival' | 'hormones' | ...
}

export interface FusedResult {
  emotion: FusedEmotion;
  intensity: number;
  source: string;
  contributors: EmotionSignal[];
}

const DEFAULT: FusedResult = {
  emotion: 'idle', intensity: 0.3, source: 'baseline', contributors: [],
};

export function fuseEmotions(signals: EmotionSignal[]): FusedResult {
  const valid = signals.filter(s => s && s.weight > 0);
  if (valid.length === 0) return DEFAULT;

  // Group by emotion, sum weights
  const buckets = new Map<FusedEmotion, { weight: number; sources: string[] }>();
  for (const s of valid) {
    const b = buckets.get(s.emotion) ?? { weight: 0, sources: [] };
    b.weight += s.weight;
    b.sources.push(s.source);
    buckets.set(s.emotion, b);
  }

  // Pick highest cumulative weight
  let winner: FusedEmotion = 'idle';
  let winnerWeight = 0;
  let winnerSources: string[] = [];
  for (const [emo, b] of buckets) {
    if (b.weight > winnerWeight) {
      winner = emo;
      winnerWeight = b.weight;
      winnerSources = b.sources;
    }
  }

  return {
    emotion: winner,
    intensity: Math.max(0, Math.min(1, winnerWeight)),
    source: winnerSources.join('+'),
    contributors: valid,
  };
}

/** Convenience helpers for each feature signal source. */
export const FusionSignals = {
  sentiment: (emotion: FusedEmotion, weight = 0.6): EmotionSignal =>
    ({ emotion, weight, source: 'sentiment' }),
  memoryRecall: (weight = 0.5): EmotionSignal =>
    ({ emotion: 'nostalgic', weight, source: 'memory' }),
  visionScanning: (weight = 0.5): EmotionSignal =>
    ({ emotion: 'focused', weight, source: 'vision' }),
  festival: (weight = 0.7): EmotionSignal =>
    ({ emotion: 'joyful', weight, source: 'festival' }),
  urgentCall: (weight = 0.9): EmotionSignal =>
    ({ emotion: 'concerned', weight, source: 'urgent_call' }),
  hormones: (phase: string, weight = 0.4): EmotionSignal => {
    const map: Record<string, FusedEmotion> = {
      HONEYMOON: 'flirty', COZY_TIRED: 'sleepy', LAZY: 'sleepy',
      RESTLESS: 'restless', FOCUSED: 'focused',
    };
    return { emotion: map[phase] ?? 'idle', weight, source: `hormones:${phase}` };
  },
};
