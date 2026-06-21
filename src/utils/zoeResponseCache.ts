// ═══════════════════════════════════════════════════════════════════════════════
// ZOE RESPONSE CACHE - DB-backed caching for repeated queries
// Saves API credits by returning cached responses for similar prompts
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import { getZoeInfinityThrottleLevel } from '@/hooks/zoe-infinity/quota/useZoeInfinityQuota';

/**
 * Simple hash for query text to enable fast lookups
 */
const hashQuery = (text: string): string => {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `qh_${Math.abs(hash).toString(36)}`;
};

const containsSovereignIdentityLeak = (text: string): boolean =>
  /\btext-based (companion|assistant|ai|chatbot|system|entity)\b/i.test(text) ||
  /\b(?:don't|do not|cannot|can't)\b[^.]{0,80}\b(?:video|face-to-face|face to face|avatar)\b/i.test(text) ||
  /\bI(?:'m| am) always here to chat with you in a text-based format\b/i.test(text);

/**
 * Check cache for a matching response
 * Fully error-safe — never throws, never blocks brain
 */
export const getCachedResponse = async (
  userId: string,
  queryText: string
): Promise<string | null> => {
  try {
    const queryHash = hashQuery(queryText);
    
    const { data, error } = await (supabase as any)
      .from('zoe_response_cache')
      .select('id, response_text, hit_count')
      .eq('user_id', userId)
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error || !data) return null;
    
    // Increment hit count (fire and forget)
    (supabase as any)
      .from('zoe_response_cache')
      .update({ hit_count: (data.hit_count || 0) + 1 })
      .eq('id', data.id)
      .then(() => {});
    
    if (containsSovereignIdentityLeak(data.response_text)) {
      console.warn(`[Cache] ✗ rejected stale identity leak for "${queryText.slice(0, 40)}..."`);
      return null;
    }

    console.log(`[Cache] ✓ HIT for "${queryText.slice(0, 40)}..." (hits: ${data.hit_count + 1})`);
    return data.response_text;
  } catch {
    return null;
  }
};

/**
 * Save a response to cache
 * Fully error-safe — never throws
 */
export const cacheResponse = async (
  userId: string,
  queryText: string,
  responseText: string,
  modelUsed?: string
): Promise<void> => {
  try {
    if (containsSovereignIdentityLeak(responseText)) return;

    // ─── Quota throttle gate (Zoe Infinity Sovereign) ───
    // Skip cache writes when DB pressure crosses cache_off threshold (70%+)
    const throttleLevel = await getZoeInfinityThrottleLevel();
    if (throttleLevel === 'cache_off' || throttleLevel === 'memory_light' || throttleLevel === 'hard') {
      console.log(`[Cache] ✗ skipped (quota throttle: ${throttleLevel})`);
      return;
    }

    const queryHash = hashQuery(queryText);
    
    await (supabase as any)
      .from('zoe_response_cache')
      .insert({
        user_id: userId,
        query_hash: queryHash,
        query_text: queryText.slice(0, 500),
        response_text: responseText,
        model_used: modelUsed || 'unknown',
      });
    
    console.log(`[Cache] ✓ SAVED for "${queryText.slice(0, 40)}..."`);
  } catch {
    // Cache save failure is non-critical
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY USAGE CAP - 1 credit per prompt, admin bypass
// ═══════════════════════════════════════════════════════════════════════════════

const ADMIN_USERNAMES = ['moksh50', 'Justmkbhd', 'john', 'shivanth_kn'];
const FREE_DAILY_CAP = 50;   // Free users: 50 prompts/day

const getDailyKey = (userId: string) => 
  `zoe_inf_daily_${userId}_${new Date().toISOString().split('T')[0]}`;

export const checkDailyCap = async (userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  isAdmin: boolean;
}> => {
  try {
    // Check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', userId)
      .maybeSingle();
    
    const isAdmin = ADMIN_USERNAMES.includes(profile?.username || '');
    
    // Admins bypass all limits
    if (isAdmin) {
      return { allowed: true, remaining: 999999, isAdmin: true };
    }
    
    const key = getDailyKey(userId);
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    const cap = FREE_DAILY_CAP;
    
    if (current >= cap) {
      return { allowed: false, remaining: 0, isAdmin: false };
    }
    
    return { allowed: true, remaining: cap - current, isAdmin: false };
  } catch {
    // On any error, allow the request (fail-open for brain)
    return { allowed: true, remaining: 999, isAdmin: false };
  }
};

export const incrementDailyUsage = (userId: string): void => {
  try {
    const key = getDailyKey(userId);
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(current + 1));
  } catch {
    // Non-critical
  }
};
