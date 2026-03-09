/**
 * ZOE CHAT MEMORY - Persistent 500-message conversation memory
 * Saves/loads from database with local cache fallback
 * Provides context window for AI conversations
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const MAX_MEMORY = 500;
const LOCAL_KEY = 'zoe_chat_memory_v2';

export interface MemoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  emotion?: string;
  importance?: number; // 1-10
  topics?: string[];
  metacognitive?: {
    intent?: string;
    sentiment?: number; // -1 to 1
    complexity?: number; // 0-1
    needsFollowUp?: boolean;
  };
}

export interface MemorySummary {
  totalMessages: number;
  userMessageCount: number;
  zoeMessageCount: number;
  topTopics: string[];
  avgSentiment: number;
  conversationMood: string;
  lastInteraction: string;
}

export const useZoeChatMemory = () => {
  const { user } = useAuth();
  const [memory, setMemory] = useState<MemoryMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRef = useRef<MemoryMessage[]>([]);

  // ═══════════════════════════════════════════════════════════════
  // LOAD: Pull last 500 messages from DB, fallback to localStorage
  // ═══════════════════════════════════════════════════════════════
  const loadMemory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_infinity_messages')
        .select('id, content, role, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(MAX_MEMORY);

      if (error) {
        console.warn('[ChatMemory] DB load failed, using localStorage:', error.message);
        const local = localStorage.getItem(`${LOCAL_KEY}_${user.id}`);
        if (local) {
          setMemory(JSON.parse(local));
        }
        setIsLoaded(true);
        return;
      }

      const loaded: MemoryMessage[] = (data || []).map((m: any) => ({
        id: m.id,
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || '',
        timestamp: m.created_at,
      }));

      setMemory(loaded);
      // Cache locally
      localStorage.setItem(`${LOCAL_KEY}_${user.id}`, JSON.stringify(loaded.slice(-100)));
      console.log(`[ChatMemory] Loaded ${loaded.length} messages`);
    } catch (err) {
      console.error('[ChatMemory] Load error:', err);
    } finally {
      setIsLoaded(true);
    }
  }, [user]);

  // ═══════════════════════════════════════════════════════════════
  // SAVE: Persist a message to DB + update local state
  // ═══════════════════════════════════════════════════════════════
  const saveMessage = useCallback(async (msg: Omit<MemoryMessage, 'id' | 'timestamp'>): Promise<MemoryMessage | null> => {
    if (!user) return null;

    const newMsg: MemoryMessage = {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    // Update local state immediately (trim to 500)
    setMemory(prev => {
      const updated = [...prev, newMsg];
      if (updated.length > MAX_MEMORY) {
        return updated.slice(-MAX_MEMORY);
      }
      return updated;
    });

    // Debounced DB save
    pendingRef.current.push(newMsg);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const batch = [...pendingRef.current];
      pendingRef.current = [];
      if (batch.length === 0) return;

      setIsSaving(true);
      try {
        for (const m of batch) {
          await supabase.from('zoe_infinity_messages').insert({
            user_id: user.id,
            role: m.role,
            content: m.content,
          });
        }
      } catch (err) {
        console.error('[ChatMemory] Save error:', err);
      } finally {
        setIsSaving(false);
      }
    }, 500);

    return newMsg;
  }, [user]);

  // ═══════════════════════════════════════════════════════════════
  // CONTEXT: Get last N messages for AI context window
  // ═══════════════════════════════════════════════════════════════
  const getContextWindow = useCallback((count: number = 30): Array<{ role: string; content: string }> => {
    return memory.slice(-count).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
  }, [memory]);

  // ═══════════════════════════════════════════════════════════════
  // SEARCH: Find relevant past messages by keyword
  // ═══════════════════════════════════════════════════════════════
  const searchMemory = useCallback((query: string, limit = 10): MemoryMessage[] => {
    const q = query.toLowerCase();
    return memory
      .filter(m => m.content.toLowerCase().includes(q))
      .slice(-limit);
  }, [memory]);

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY: Generate conversation statistics
  // ═══════════════════════════════════════════════════════════════
  const getMemorySummary = useCallback((): MemorySummary => {
    const userMsgs = memory.filter(m => m.role === 'user');
    const zoeMsgs = memory.filter(m => m.role === 'assistant');

    // Extract topics from recent messages
    const recentText = memory.slice(-50).map(m => m.content).join(' ').toLowerCase();
    const topicKeywords = ['work', 'health', 'family', 'love', 'money', 'travel', 'food', 'music', 'art', 'tech', 'sports', 'education', 'weather', 'news'];
    const topTopics = topicKeywords.filter(t => recentText.includes(t)).slice(0, 5);

    // Approximate sentiment from recent messages
    const positiveWords = ['happy', 'great', 'love', 'thanks', 'good', 'amazing', 'wonderful', 'excited', 'yes', 'perfect'];
    const negativeWords = ['sad', 'bad', 'hate', 'angry', 'terrible', 'awful', 'no', 'frustrated', 'disappointed', 'worried'];
    let sentiment = 0;
    const recentWords = recentText.split(/\s+/);
    recentWords.forEach(w => {
      if (positiveWords.includes(w)) sentiment += 0.1;
      if (negativeWords.includes(w)) sentiment -= 0.1;
    });
    sentiment = Math.max(-1, Math.min(1, sentiment));

    const mood = sentiment > 0.3 ? 'positive' : sentiment < -0.3 ? 'negative' : 'neutral';

    return {
      totalMessages: memory.length,
      userMessageCount: userMsgs.length,
      zoeMessageCount: zoeMsgs.length,
      topTopics,
      avgSentiment: parseFloat(sentiment.toFixed(2)),
      conversationMood: mood,
      lastInteraction: memory.length > 0 ? memory[memory.length - 1].timestamp : '',
    };
  }, [memory]);

  // Load on mount
  useEffect(() => {
    if (user && !isLoaded) {
      loadMemory();
    }
  }, [user, isLoaded, loadMemory]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return {
    memory,
    isLoaded,
    isSaving,
    saveMessage,
    loadMemory,
    getContextWindow,
    searchMemory,
    getMemorySummary,
    messageCount: memory.length,
    maxMemory: MAX_MEMORY,
  };
};
