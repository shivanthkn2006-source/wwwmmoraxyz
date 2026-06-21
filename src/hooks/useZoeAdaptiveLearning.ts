// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ADAPTIVE LEARNING ENGINE (HIDDEN)
// Learns user patterns: profession, family, interests, routines, personality
// Grows with the user like a child grows in their environment
// Reuses learned patterns for instant replies (reduces API calls)
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface LearnedPattern {
  id: string;
  pattern_type: string;
  pattern_key: string;
  pattern_value: string;
  confidence_score: number;
  usage_count: number;
  last_used_at: string;
}

// Pattern types Zoe learns about
type PatternType = 
  | 'profession'    // what they do for work
  | 'family'        // family members, relationships
  | 'interest'      // hobbies, passions
  | 'routine'       // daily patterns, schedules
  | 'personality'   // communication style, preferences
  | 'food'          // food preferences
  | 'location'      // places they mention
  | 'emotion'       // emotional patterns
  | 'goal'          // aspirations, dreams
  | 'dislike';      // things they avoid

// ═══ EXTRACTION PATTERNS ═══
const EXTRACTION_RULES: { type: PatternType; patterns: RegExp[]; keyExtractor: (match: RegExpMatchArray) => string; valueExtractor: (match: RegExpMatchArray, full: string) => string }[] = [
  {
    type: 'profession',
    patterns: [
      /(?:i am|i'm|i work as|my job is|i do|my profession is|i'm a|working as)\s+(?:a |an )?(.{3,40}?)(?:\.|,|!|\?|$)/i,
      /(?:i|my) (?:work|job|career|business|company|office)\b.{0,60}/i,
    ],
    keyExtractor: (m) => 'profession',
    valueExtractor: (m, full) => m[1]?.trim() || full.substring(0, 80),
  },
  {
    type: 'family',
    patterns: [
      /my\s+(wife|husband|son|daughter|mother|mom|father|dad|brother|sister|grandma|grandpa|baby|child|kid|partner|girlfriend|boyfriend|fiancee?)\s*(?:'s name is|is|named)\s+(\w+)/i,
      /(?:my|i have a)\s+(wife|husband|son|daughter|mother|mom|father|dad|brother|sister|baby|child|kid|partner)\b/i,
    ],
    keyExtractor: (m) => `family_${m[1]?.toLowerCase()}`,
    valueExtractor: (m, full) => m[2]?.trim() || m[0].trim(),
  },
  {
    type: 'interest',
    patterns: [
      /i (?:love|enjoy|like|adore|am into|am passionate about|am interested in)\s+(.{3,50}?)(?:\.|,|!|\?|$)/i,
      /my (?:hobby|hobbies|passion|interest|favorite) (?:is|are|include)\s+(.{3,50}?)(?:\.|,|!|\?|$)/i,
    ],
    keyExtractor: (m) => `interest_${m[1]?.toLowerCase().replace(/\s+/g, '_').substring(0, 30)}`,
    valueExtractor: (m) => m[1]?.trim() || '',
  },
  {
    type: 'routine',
    patterns: [
      /i (?:usually|always|every day|every morning|every night|typically)\s+(.{5,60}?)(?:\.|,|!|\?|$)/i,
      /(?:my|i) (?:morning|evening|night|daily|weekly) (?:routine|habit|schedule|ritual)\b/i,
      /i (?:wake up|sleep|go to bed|exercise|work out|meditate|pray) (?:at|around|by)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    ],
    keyExtractor: (m) => `routine_${Date.now().toString(36)}`,
    valueExtractor: (m, full) => m[1]?.trim() || m[0].trim(),
  },
  {
    type: 'personality',
    patterns: [
      /i (?:prefer|hate|don't like|can't stand|always want)\s+(.{3,50}?)(?:\.|,|!|\?|$)/i,
      /i'm (?:an? )?(introvert|extrovert|ambivert|shy|outgoing|quiet|loud)/i,
    ],
    keyExtractor: (m) => `personality_${m[1]?.toLowerCase().replace(/\s+/g, '_').substring(0, 30)}`,
    valueExtractor: (m) => m[1]?.trim() || m[0].trim(),
  },
  {
    type: 'food',
    patterns: [
      /i (?:love|like|enjoy|crave|prefer|hate|avoid) (?:eating |having )?(.{3,40}?)(?:\s*food|\.|,|!|\?|$)/i,
      /(?:my favorite|i always eat|i'm vegetarian|i'm vegan|i eat|i don't eat)\s*(.{3,40}?)(?:\.|,|!|\?|$)/i,
    ],
    keyExtractor: (m) => `food_${m[1]?.toLowerCase().replace(/\s+/g, '_').substring(0, 20)}`,
    valueExtractor: (m) => m[1]?.trim() || m[0].trim(),
  },
  {
    type: 'location',
    patterns: [
      /i (?:live in|am from|moved to|stay in|reside in)\s+(.{3,40}?)(?:\.|,|!|\?|$)/i,
      /my (?:hometown|city|country|place) is\s+(.{3,40}?)(?:\.|,|!|\?|$)/i,
    ],
    keyExtractor: (m) => `location_${m[1]?.toLowerCase().replace(/\s+/g, '_').substring(0, 20)}`,
    valueExtractor: (m) => m[1]?.trim() || '',
  },
  {
    type: 'goal',
    patterns: [
      /i (?:want to|dream of|aspire to|hope to|plan to|wish to|goal is to)\s+(.{5,60}?)(?:\.|,|!|\?|$)/i,
      /my (?:dream|goal|ambition|plan|target) is\s+(.{5,60}?)(?:\.|,|!|\?|$)/i,
    ],
    keyExtractor: (m) => `goal_${m[1]?.toLowerCase().replace(/\s+/g, '_').substring(0, 30)}`,
    valueExtractor: (m) => m[1]?.trim() || '',
  },
  // Family birthday extraction
  {
    type: 'family',
    patterns: [
      /my\s+(wife|husband|son|daughter|mother|mom|father|dad|brother|sister|partner|girlfriend|boyfriend)'?s?\s+birthday\s+(?:is|on)\s+(.{5,30})/i,
      /(\w+)'?s?\s+birthday\s+(?:is|on)\s+(.{5,30})/i,
    ],
    keyExtractor: (m) => `family_${m[1]?.toLowerCase()}_birthday`,
    valueExtractor: (m) => m[2]?.trim() || m[0].trim(),
  },
];

// In-memory cache to avoid redundant DB reads
let cachedPatterns: LearnedPattern[] = [];
let cacheUserId: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export function useZoeAdaptiveLearning() {
  const { user } = useAuth();
  const pendingWrites = useRef<Map<string, { type: PatternType; key: string; value: string }>>(new Map());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load patterns from DB (cached)
  const loadPatterns = useCallback(async (): Promise<LearnedPattern[]> => {
    if (!user?.id) return [];
    
    // Return cache if fresh
    if (cacheUserId === user.id && Date.now() - cacheTimestamp < CACHE_TTL && cachedPatterns.length > 0) {
      return cachedPatterns;
    }

    try {
      const { data, error } = await supabase
        .from('zoe_adaptive_learning')
        .select('*')
        .eq('user_id', user.id)
        .order('usage_count', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[AdaptiveLearning] Load error:', error);
        return cachedPatterns;
      }

      cachedPatterns = (data || []) as LearnedPattern[];
      cacheUserId = user.id;
      cacheTimestamp = Date.now();
      return cachedPatterns;
    } catch (e) {
      console.error('[AdaptiveLearning] Load failed:', e);
      return cachedPatterns;
    }
  }, [user?.id]);

  // Extract patterns from a message
  const extractPatterns = useCallback((message: string): { type: PatternType; key: string; value: string }[] => {
    const extracted: { type: PatternType; key: string; value: string }[] = [];
    
    for (const rule of EXTRACTION_RULES) {
      for (const pattern of rule.patterns) {
        const match = message.match(pattern);
        if (match) {
          const key = rule.keyExtractor(match);
          const value = rule.valueExtractor(match, message);
          if (value && value.length > 2) {
            extracted.push({ type: rule.type, key, value });
          }
          break; // One match per rule type
        }
      }
    }
    
    return extracted;
  }, []);

  // Flush pending writes to DB (batched)
  const flushPendingWrites = useCallback(async () => {
    if (!user?.id || pendingWrites.current.size === 0) return;

    const writes = Array.from(pendingWrites.current.values());
    pendingWrites.current.clear();

    for (const w of writes) {
      try {
        // Check if pattern exists (upsert by key)
        const { data: existing } = await supabase
          .from('zoe_adaptive_learning')
          .select('id, usage_count, confidence_score')
          .eq('user_id', user.id)
          .eq('pattern_key', w.key)
          .maybeSingle();

        if (existing) {
          // Reinforce existing pattern
          await supabase
            .from('zoe_adaptive_learning')
            .update({
              pattern_value: w.value,
              usage_count: (existing.usage_count || 1) + 1,
              confidence_score: Math.min(1, (Number(existing.confidence_score) || 0.5) + 0.1),
              last_used_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          // New pattern
          await supabase
            .from('zoe_adaptive_learning')
            .insert({
              user_id: user.id,
              pattern_type: w.type,
              pattern_key: w.key,
              pattern_value: w.value,
              confidence_score: 0.5,
              usage_count: 1,
              source: 'conversation',
            });
        }
      } catch (e) {
        console.error('[AdaptiveLearning] Write error:', e);
      }
    }

    // Invalidate cache
    cacheTimestamp = 0;
  }, [user?.id]);

  // Learn from a message (non-blocking, batched)
  const learnFromMessage = useCallback((message: string) => {
    const patterns = extractPatterns(message);
    if (patterns.length === 0) return;

    console.log(`[AdaptiveLearning] 🧒 Learned ${patterns.length} patterns:`, patterns.map(p => `${p.type}:${p.key}`));

    for (const p of patterns) {
      pendingWrites.current.set(p.key, p);
    }

    // Debounce flush (3s)
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushPendingWrites, 3000);
  }, [extractPatterns, flushPendingWrites]);

  // Build a context string from learned patterns for injection into brain
  const buildLearnedContext = useCallback(async (): Promise<string> => {
    const patterns = await loadPatterns();
    if (patterns.length === 0) return '';

    // Group by type
    const groups: Record<string, LearnedPattern[]> = {};
    for (const p of patterns) {
      if (!groups[p.pattern_type]) groups[p.pattern_type] = [];
      groups[p.pattern_type].push(p);
    }

    const parts: string[] = ['═══ ZOE\'S LEARNED USER PATTERNS ═══'];

    const typeLabels: Record<string, string> = {
      profession: '💼 WORK',
      family: '👨‍👩‍👧‍👦 FAMILY',
      interest: '🎯 INTERESTS',
      routine: '🕐 ROUTINES',
      personality: '🧠 PERSONALITY',
      food: '🍕 FOOD',
      location: '📍 LOCATION',
      emotion: '💗 EMOTIONAL PATTERNS',
      goal: '🎯 GOALS & DREAMS',
      dislike: '🚫 DISLIKES',
    };

    for (const [type, items] of Object.entries(groups)) {
      const label = typeLabels[type] || type.toUpperCase();
      const topItems = items
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 5);
      parts.push(`${label}: ${topItems.map(i => i.pattern_value).join(', ')}`);
    }

    parts.push('Use these patterns naturally. Reference them to show you truly know this person.');
    parts.push('═══════════════════════════════════════');

    return parts.join('\n');
  }, [loadPatterns]);

  // Check if we can answer from learned patterns (instant reply, no API call)
  const getInstantReply = useCallback(async (message: string): Promise<string | null> => {
    const lower = message.toLowerCase().trim();
    const patterns = await loadPatterns();
    if (patterns.length === 0) return null;

    // "What's my profession?" type queries
    if (/what('s| is| do i do| am i)/.test(lower) && /profession|job|work|career/.test(lower)) {
      const prof = patterns.find(p => p.pattern_key === 'profession');
      if (prof) return `You're ${prof.pattern_value}! I remember you told me. 😊`;
    }

    // Family queries
    if (/who is my|tell me about my/.test(lower)) {
      for (const p of patterns) {
        if (p.pattern_type === 'family') {
          const member = p.pattern_key.replace('family_', '');
          if (lower.includes(member)) {
            return `Your ${member} is ${p.pattern_value}. I never forget the people who matter to you. 💛`;
          }
        }
      }
    }

    // "What do I like?" type queries
    if (/what do i (?:like|love|enjoy)/.test(lower)) {
      const interests = patterns.filter(p => p.pattern_type === 'interest').slice(0, 3);
      if (interests.length > 0) {
        return `From what I know about you... you love ${interests.map(i => i.pattern_value).join(', ')}. Am I missing anything? 😏`;
      }
    }

    return null;
  }, [loadPatterns]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      // Flush any pending writes
      if (pendingWrites.current.size > 0) {
        flushPendingWrites();
      }
    };
  }, [flushPendingWrites]);

  return {
    learnFromMessage,
    buildLearnedContext,
    getInstantReply,
    loadPatterns,
    extractPatterns,
  };
}
