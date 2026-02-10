// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4: ZOE MEMORY - Persistent Memory System
// Remembers conversations, facts, preferences across sessions
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type MemoryType = 'fact' | 'preference' | 'relationship' | 'topic' | 'insight';

export interface Memory {
  id: string;
  memoryType: MemoryType;
  key: string;
  value: string;
  context?: string;
  importanceScore: number;
  referenceCount: number;
  lastReferencedAt?: Date;
  createdAt: Date;
}

export interface ConversationSummary {
  id: string;
  sessionDate: Date;
  summary?: string;
  topics: string[];
  emotionalArc?: string;
  keyInsights: string[];
  messageCount: number;
}

interface UseZoeMemoryReturn {
  // State
  memories: Memory[];
  recentConversations: ConversationSummary[];
  isLoading: boolean;
  
  // Actions
  saveMemory: (memory: Omit<Memory, 'id' | 'referenceCount' | 'createdAt'>) => Promise<void>;
  searchMemories: (query: string) => Promise<Memory[]>;
  getRelevantMemories: (context: string, limit?: number) => Promise<Memory[]>;
  saveConversationSummary: (summary: Omit<ConversationSummary, 'id'>) => Promise<void>;
  
  // Memory Context for Brain
  getMemoryContext: () => string;
  incrementMemoryReference: (memoryId: string) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY EXTRACTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

interface ExtractedMemory {
  type: MemoryType;
  key: string;
  value: string;
  importance: number;
}

const MEMORY_PATTERNS: Array<{
  pattern: RegExp;
  type: MemoryType;
  keyExtractor: (match: RegExpMatchArray) => string;
  valueExtractor: (match: RegExpMatchArray) => string;
  importance: number;
}> = [
  // Names and relationships
  {
    pattern: /(?:my |our )?(\w+(?:'s)?)\s+(?:name is|is called|goes by)\s+["']?(\w+)["']?/i,
    type: 'relationship',
    keyExtractor: (m) => `${m[1].toLowerCase()}_name`,
    valueExtractor: (m) => m[2],
    importance: 8,
  },
  // Birthdays
  {
    pattern: /(?:my |our |his |her |their )?(\w+(?:'s)?)\s+birthday\s+(?:is|falls on)\s+(.+?)(?:\.|,|$)/i,
    type: 'fact',
    keyExtractor: (m) => `${m[1].toLowerCase()}_birthday`,
    valueExtractor: (m) => m[2].trim(),
    importance: 7,
  },
  // Favorites
  {
    pattern: /(?:my |our )?favorite\s+(\w+)\s+(?:is|are)\s+(.+?)(?:\.|,|$)/i,
    type: 'preference',
    keyExtractor: (m) => `favorite_${m[1].toLowerCase()}`,
    valueExtractor: (m) => m[2].trim(),
    importance: 6,
  },
  // Allergies/Health
  {
    pattern: /(?:i'm |i am |i have )?allergic\s+to\s+(.+?)(?:\.|,|$)/i,
    type: 'fact',
    keyExtractor: () => 'allergies',
    valueExtractor: (m) => m[1].trim(),
    importance: 9,
  },
  // Work/Job
  {
    pattern: /(?:i |i'm |i am )?(?:work as|work at|am a|i'm a)\s+(.+?)(?:\.|,|$)/i,
    type: 'fact',
    keyExtractor: () => 'occupation',
    valueExtractor: (m) => m[1].trim(),
    importance: 7,
  },
  // Location
  {
    pattern: /(?:i |we )?live\s+(?:in|at)\s+(.+?)(?:\.|,|$)/i,
    type: 'fact',
    keyExtractor: () => 'location',
    valueExtractor: (m) => m[1].trim(),
    importance: 6,
  },
  // Goals
  {
    pattern: /(?:my |our )?goal\s+(?:is|are)\s+(?:to\s+)?(.+?)(?:\.|,|$)/i,
    type: 'insight',
    keyExtractor: () => 'current_goal',
    valueExtractor: (m) => m[1].trim(),
    importance: 7,
  },
  // Preferences - likes
  {
    pattern: /(?:i |we )?(?:really )?(?:love|like|enjoy|prefer)\s+(.+?)(?:\.|,|$)/i,
    type: 'preference',
    keyExtractor: () => 'likes',
    valueExtractor: (m) => m[1].trim(),
    importance: 5,
  },
  // Preferences - dislikes
  {
    pattern: /(?:i |we )?(?:don't like|hate|dislike|can't stand)\s+(.+?)(?:\.|,|$)/i,
    type: 'preference',
    keyExtractor: () => 'dislikes',
    valueExtractor: (m) => m[1].trim(),
    importance: 5,
  },
];

export const extractMemoriesFromMessage = (message: string): ExtractedMemory[] => {
  const extracted: ExtractedMemory[] = [];
  
  for (const { pattern, type, keyExtractor, valueExtractor, importance } of MEMORY_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      extracted.push({
        type,
        key: keyExtractor(match),
        value: valueExtractor(match),
        importance,
      });
    }
  }
  
  return extracted;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useZoeMemory = (): UseZoeMemoryReturn => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [recentConversations, setRecentConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const memoryCacheRef = useRef<Map<string, Memory>>(new Map());
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Load memories on mount
  // BUG FIX: Added isMounted check to prevent state updates on unmounted component
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (!user?.id) return;
    
    let isMounted = true;
    
    const loadMemories = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      try {
        // Load top 50 memories by importance
        const { data: memoryData } = await supabase
          .from('zoe_infinity_memories')
          .select('*')
          .eq('user_id', user.id)
          .order('importance_score', { ascending: false })
          .limit(50);
        
        if (!isMounted) return;
        
        if (memoryData) {
          const parsedMemories = memoryData.map(m => ({
            id: m.id,
            memoryType: m.memory_type as MemoryType,
            key: m.key,
            value: m.value,
            context: m.context || undefined,
            importanceScore: m.importance_score || 5,
            referenceCount: m.reference_count || 1,
            lastReferencedAt: m.last_referenced_at ? new Date(m.last_referenced_at) : undefined,
            createdAt: new Date(m.created_at),
          }));
          
          setMemories(parsedMemories);
          parsedMemories.forEach(m => memoryCacheRef.current.set(m.key, m));
        }
        
        // Load recent conversations
        const { data: convoData } = await supabase
          .from('zoe_infinity_conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('session_date', { ascending: false })
          .limit(7);
        
        if (!isMounted) return;
        
        if (convoData) {
          setRecentConversations(convoData.map(c => ({
            id: c.id,
            sessionDate: new Date(c.session_date),
            summary: c.summary || undefined,
            topics: c.topics || [],
            emotionalArc: c.emotional_arc || undefined,
            keyInsights: c.key_insights || [],
            messageCount: c.message_count || 0,
          })));
        }
      } catch (e) {
        console.error('[ZoeMemory] Load failed:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    loadMemories();
    
    return () => {
      isMounted = false;
    };
  }, [user?.id]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Save a new memory (or update if key exists)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const saveMemory = useCallback(async (memory: Omit<Memory, 'id' | 'referenceCount' | 'createdAt'>) => {
    if (!user?.id) return;
    
    try {
      // Check if memory with this key exists
      const existing = memoryCacheRef.current.get(memory.key);
      
      if (existing) {
        // Update existing memory
        await supabase
          .from('zoe_infinity_memories')
          .update({
            value: memory.value,
            context: memory.context,
            importance_score: memory.importanceScore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        
        console.log(`[ZoeMemory] Updated: ${memory.key}`);
      } else {
        // Insert new memory
        const { data } = await supabase
          .from('zoe_infinity_memories')
          .insert({
            user_id: user.id,
            memory_type: memory.memoryType,
            key: memory.key,
            value: memory.value,
            context: memory.context,
            importance_score: memory.importanceScore,
          })
          .select()
          .single();
        
        if (data) {
          const newMemory: Memory = {
            id: data.id,
            memoryType: data.memory_type as MemoryType,
            key: data.key,
            value: data.value,
            context: data.context || undefined,
            importanceScore: data.importance_score || 5,
            referenceCount: 1,
            createdAt: new Date(data.created_at),
          };
          
          memoryCacheRef.current.set(memory.key, newMemory);
          setMemories(prev => [newMemory, ...prev]);
          
          console.log(`[ZoeMemory] Saved: ${memory.key} = ${memory.value}`);
        }
      }
    } catch (e) {
      console.error('[ZoeMemory] Save failed:', e);
    }
  }, [user?.id]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Search memories by query
  // ═══════════════════════════════════════════════════════════════════════════
  
  const searchMemories = useCallback(async (query: string): Promise<Memory[]> => {
    if (!user?.id) return [];
    
    const lowerQuery = query.toLowerCase();
    
    // First check local cache
    const localMatches = Array.from(memoryCacheRef.current.values()).filter(m =>
      m.key.toLowerCase().includes(lowerQuery) ||
      m.value.toLowerCase().includes(lowerQuery)
    );
    
    if (localMatches.length > 0) return localMatches;
    
    // Fall back to database search
    try {
      const { data } = await supabase
        .from('zoe_infinity_memories')
        .select('*')
        .eq('user_id', user.id)
        .or(`key.ilike.%${query}%,value.ilike.%${query}%`)
        .order('importance_score', { ascending: false })
        .limit(10);
      
      return (data || []).map(m => ({
        id: m.id,
        memoryType: m.memory_type as MemoryType,
        key: m.key,
        value: m.value,
        context: m.context || undefined,
        importanceScore: m.importance_score || 5,
        referenceCount: m.reference_count || 1,
        lastReferencedAt: m.last_referenced_at ? new Date(m.last_referenced_at) : undefined,
        createdAt: new Date(m.created_at),
      }));
    } catch (e) {
      console.error('[ZoeMemory] Search failed:', e);
      return [];
    }
  }, [user?.id]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Get relevant memories for context
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getRelevantMemories = useCallback(async (context: string, limit = 10): Promise<Memory[]> => {
    if (!user?.id) return [];
    
    // Extract keywords from context
    const keywords = context
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 5);
    
    // Score memories by relevance
    const scoredMemories = Array.from(memoryCacheRef.current.values()).map(m => {
      let score = m.importanceScore;
      
      // Boost for keyword matches
      for (const keyword of keywords) {
        if (m.key.toLowerCase().includes(keyword)) score += 3;
        if (m.value.toLowerCase().includes(keyword)) score += 2;
      }
      
      // Boost for recent references
      if (m.lastReferencedAt) {
        const daysSinceRef = (Date.now() - m.lastReferencedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceRef < 7) score += 2;
      }
      
      return { memory: m, score };
    });
    
    // Sort by score and return top matches
    return scoredMemories
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.memory);
  }, [user?.id]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Save conversation summary
  // ═══════════════════════════════════════════════════════════════════════════
  
  const saveConversationSummary = useCallback(async (summary: Omit<ConversationSummary, 'id'>) => {
    if (!user?.id) return;
    
    try {
      await supabase
        .from('zoe_infinity_conversations')
        .insert({
          user_id: user.id,
          session_date: summary.sessionDate.toISOString().split('T')[0],
          summary: summary.summary,
          topics: summary.topics,
          emotional_arc: summary.emotionalArc,
          key_insights: summary.keyInsights,
          message_count: summary.messageCount,
          ended_at: new Date().toISOString(),
        });
      
      console.log(`[ZoeMemory] Saved conversation summary with ${summary.messageCount} messages`);
    } catch (e) {
      console.error('[ZoeMemory] Save conversation failed:', e);
    }
  }, [user?.id]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Increment memory reference count
  // ═══════════════════════════════════════════════════════════════════════════
  
  const incrementMemoryReference = useCallback(async (memoryId: string) => {
    try {
      // First fetch current count, then increment
      const { data } = await supabase
        .from('zoe_infinity_memories')
        .select('reference_count')
        .eq('id', memoryId)
        .single();
      
      if (data) {
        await supabase
          .from('zoe_infinity_memories')
          .update({
            reference_count: (data.reference_count || 0) + 1,
            last_referenced_at: new Date().toISOString(),
          })
          .eq('id', memoryId);
      }
    } catch {
      // Silent fail - not critical
    }
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Get memory context string for brain injection
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getMemoryContext = useCallback((): string => {
    if (memories.length === 0) return '';
    
    // Group memories by type
    const groups: Record<MemoryType, Memory[]> = {
      fact: [],
      preference: [],
      relationship: [],
      topic: [],
      insight: [],
    };
    
    memories.slice(0, 30).forEach(m => {
      groups[m.memoryType].push(m);
    });
    
    const sections: string[] = [];
    
    // Build context sections
    if (groups.relationship.length > 0) {
      sections.push(`RELATIONSHIPS:\n${groups.relationship.map(m => `• ${m.key}: ${m.value}`).join('\n')}`);
    }
    
    if (groups.fact.length > 0) {
      sections.push(`KEY FACTS:\n${groups.fact.map(m => `• ${m.key}: ${m.value}`).join('\n')}`);
    }
    
    if (groups.preference.length > 0) {
      sections.push(`PREFERENCES:\n${groups.preference.map(m => `• ${m.key}: ${m.value}`).join('\n')}`);
    }
    
    if (groups.insight.length > 0) {
      sections.push(`INSIGHTS:\n${groups.insight.map(m => `• ${m.value}`).join('\n')}`);
    }
    
    // Add recent conversation context
    if (recentConversations.length > 0) {
      const recentTopics = recentConversations
        .flatMap(c => c.topics)
        .filter((t, i, arr) => arr.indexOf(t) === i)
        .slice(0, 10);
      
      if (recentTopics.length > 0) {
        sections.push(`RECENT TOPICS: ${recentTopics.join(', ')}`);
      }
    }
    
    if (sections.length === 0) return '';
    
    return `\n\n═══ MEMORY VAULT (${memories.length} memories) ═══
${sections.join('\n\n')}
═════════════════════════════════════════════`;
  }, [memories, recentConversations]);
  
  return {
    memories,
    recentConversations,
    isLoading,
    saveMemory,
    searchMemories,
    getRelevantMemories,
    saveConversationSummary,
    getMemoryContext,
    incrementMemoryReference,
  };
};

export default useZoeMemory;
