/**
 * GROWTH ENGINE FEATURE FLAGS
 *
 * Pure, dependency-free evaluation so it can be unit tested and reused by the
 * edge worker. A flag is on for a member when:
 *   - the flag row exists and `enabled` is true, AND
 *   - the member is not in `block_user_ids`, AND
 *   - the member is in `allow_user_ids`, OR their stable bucket (0-99, derived
 *     from a hash of flagKey + userId) is below `rollout_percent`.
 *
 * Unknown flags default to the caller-supplied fallback (false unless stated),
 * so a missing row can never crash a screen — it just keeps the feature off.
 * Flipping `enabled` to false is an instant, global rollback.
 */

export interface GrowthFlag {
  flag_key: string;
  enabled: boolean;
  rollout_percent: number;
  allow_user_ids: string[] | null;
  block_user_ids: string[] | null;
  description?: string | null;
}

/** Deterministic 32-bit FNV-1a hash — same result in every runtime. */
export function stableHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Stable 0-99 bucket for a member on a given flag. */
export function bucketFor(flagKey: string, userId: string): number {
  return stableHash(`${flagKey}:${userId}`) % 100;
}

export function evaluateFlag(
  flag: GrowthFlag | undefined | null,
  userId: string | null | undefined,
  fallback = false,
): boolean {
  if (!flag) return fallback;
  if (!flag.enabled) return false;
  if (!userId) return flag.rollout_percent >= 100;
  if (flag.block_user_ids?.includes(userId)) return false;
  if (flag.allow_user_ids?.includes(userId)) return true;
  const percent = Math.max(0, Math.min(100, Number(flag.rollout_percent ?? 0)));
  if (percent <= 0) return false;
  if (percent >= 100) return true;
  return bucketFor(flag.flag_key, userId) < percent;
}

export const GROWTH_FLAGS = {
  engine: 'growth_engine',
  alerts: 'growth_card_alerts',
  push: 'growth_push_notifications',
  email: 'growth_email_notifications',
  export: 'growth_export',
  /** Shows the YouTube-style "New" badge on unseen posts/loops. */
  newBadge: 'new_content_badge',
  /** When on, feed videos repeat; when off (default) they play once. */
  loopsAutoplayLoop: 'loops_autoplay_loop',
  /** Gates the first-sign-in Growth onboarding modal. */
  onboardingGating: 'growth_onboarding_gating',
} as const;


export type GrowthFlagKey = (typeof GROWTH_FLAGS)[keyof typeof GROWTH_FLAGS];

/**
 * Reading time for an insight, used as the alert's on-screen lifetime.
 * ~200 words per minute (comfortable normal reading), clamped so a one-liner
 * still stays long enough to notice and a long card never blocks the UI.
 */
export const ALERT_MIN_MS = 6_000;
export const ALERT_MAX_MS = 20_000;

export function readingTimeMs(...parts: Array<string | null | undefined>): number {
  const words = parts
    .filter(Boolean)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const raw = 1_800 + (words / 200) * 60_000;
  return Math.round(Math.min(ALERT_MAX_MS, Math.max(ALERT_MIN_MS, raw)));
}
