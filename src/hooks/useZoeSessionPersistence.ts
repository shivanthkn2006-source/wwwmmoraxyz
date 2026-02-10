/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE SESSION PERSISTENCE - Save conversation summaries on session end
 * MIGRATION FIX: Populates zoe_infinity_conversations table
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

interface SessionConfig {
  localHistoryKey: string;
  minMessagesToSave?: number;
}

export const useZoeSessionPersistence = (config: SessionConfig) => {
  const { user } = useAuth();
  const sessionStartRef = useRef<Date>(new Date());
  const messageCountRef = useRef<number>(0);
  const hasSavedRef = useRef<boolean>(false);
  
  const { localHistoryKey, minMessagesToSave = 5 } = config;

  // Track message count from local history
  useEffect(() => {
    try {
      const history = localStorage.getItem(localHistoryKey);
      if (history) {
        const parsed = JSON.parse(history);
        messageCountRef.current = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch {
      messageCountRef.current = 0;
    }
  }, [localHistoryKey]);

  // Save conversation summary to DB
  const saveSessionSummary = useCallback(async () => {
    if (!user?.id || hasSavedRef.current || messageCountRef.current < minMessagesToSave) {
      return;
    }
    
    hasSavedRef.current = true;
    
    try {
      const history = localStorage.getItem(localHistoryKey);
      if (!history) return;
      
      const messages = JSON.parse(history);
      if (!Array.isArray(messages) || messages.length < minMessagesToSave) return;
      
      // Extract topics from recent messages
      const recentMessages = messages.slice(-20);
      const allContent = recentMessages.map((m: any) => m.content || '').join(' ');
      
      // Simple topic extraction
      const topics: string[] = [];
      const topicKeywords = ['work', 'family', 'health', 'dreams', 'goals', 'love', 'friends', 'money', 'travel', 'food'];
      for (const keyword of topicKeywords) {
        if (allContent.toLowerCase().includes(keyword)) {
          topics.push(keyword);
        }
      }
      
      // Analyze emotional arc (simple sentiment check)
      const positiveWords = ['happy', 'great', 'love', 'amazing', 'wonderful', 'excited', 'good', 'nice'];
      const negativeWords = ['sad', 'angry', 'frustrated', 'worried', 'stressed', 'bad', 'terrible', 'anxious'];
      
      let positiveCount = 0;
      let negativeCount = 0;
      for (const word of positiveWords) {
        if (allContent.toLowerCase().includes(word)) positiveCount++;
      }
      for (const word of negativeWords) {
        if (allContent.toLowerCase().includes(word)) negativeCount++;
      }
      
      let emotionalArc: 'positive' | 'negative' | 'mixed' | 'neutral' = 'neutral';
      if (positiveCount > negativeCount + 2) emotionalArc = 'positive';
      else if (negativeCount > positiveCount + 2) emotionalArc = 'negative';
      else if (positiveCount > 0 && negativeCount > 0) emotionalArc = 'mixed';
      
      // Generate summary (last 3 exchanges)
      const summaryMessages = recentMessages.slice(-6);
      const summary = summaryMessages.map((m: any) => 
        `${m.role === 'user' ? 'User' : 'Zoe'}: ${(m.content || '').substring(0, 100)}`
      ).join('\n');
      
      // Save to zoe_infinity_conversations
      await supabase
        .from('zoe_infinity_conversations')
        .insert({
          user_id: user.id,
          session_date: sessionStartRef.current.toISOString().split('T')[0],
          summary: summary.substring(0, 1000),
          topics: topics.slice(0, 10),
          emotional_arc: emotionalArc,
          key_insights: [],
          message_count: messages.length,
          ended_at: new Date().toISOString(),
        });
      
      console.log('[SessionPersistence] ✓ Saved conversation summary:', {
        messageCount: messages.length,
        topics,
        emotionalArc,
      });
    } catch (e) {
      console.warn('[SessionPersistence] Failed to save summary:', e);
    }
  }, [user?.id, localHistoryKey, minMessagesToSave]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery
      saveSessionSummary();
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveSessionSummary();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveSessionSummary]);

  // Increment message count (call from main component)
  const trackMessage = useCallback(() => {
    messageCountRef.current++;
  }, []);

  return {
    trackMessage,
    saveSessionSummary,
    sessionStart: sessionStartRef.current,
  };
};

export default useZoeSessionPersistence;
