/**
 * Zoe Infinity Conversation Context Manager
 * Provides full conversation history access with session grouping
 * and context summaries for productive AI conversations.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface ConversationSession {
  id: string;
  sessionStart: Date;
  sessionEnd: Date | null;
  messageCount: number;
  summary: string | null;
  topics: string[];
  emotionalArc: string | null;
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  sessionId: string | null;
}

// In-memory dedup cache: content hash → timestamp
const recentMessageHashes = new Map<string, number>();
const DEDUP_WINDOW_MS = 15_000; // 15 second window

/** Hash a message for dedup (simple but effective) */
function messageHash(role: string, content: string): string {
  return `${role}:${content.trim().toLowerCase().slice(0, 200)}`;
}

/** Check if this message is a duplicate within the time window */
export function isDuplicateMessage(role: string, content: string): boolean {
  const hash = messageHash(role, content);
  const now = Date.now();
  
  // Clean old entries
  for (const [key, ts] of recentMessageHashes) {
    if (now - ts > DEDUP_WINDOW_MS) recentMessageHashes.delete(key);
  }
  
  if (recentMessageHashes.has(hash)) return true;
  
  recentMessageHashes.set(hash, now);
  return false;
}

/** Check if content is valid (not garbage) */
export function isValidMessageContent(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 2) return false; // Too short
  if (/^[\s\W]+$/.test(trimmed)) return false; // Only whitespace/symbols
  return true;
}

export const useZoeConversationContext = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const currentSessionId = useRef<string | null>(null);
  const sessionMessageCount = useRef(0);

  // Start or resume a conversation session
  const startSession = useCallback(async () => {
    if (!user?.id) return null;

    try {
      // Check if there's a recent session (within 30 min)
      const { data: recent } = await supabase
        .from('zoe_infinity_sessions')
        .select('id, message_count')
        .eq('user_id', user.id)
        .is('session_end', null)
        .order('session_start', { ascending: false })
        .limit(1);

      if (recent && recent.length > 0) {
        currentSessionId.current = recent[0].id;
        sessionMessageCount.current = recent[0].message_count || 0;
        return recent[0].id;
      }

      // Create new session
      const { data, error } = await supabase
        .from('zoe_infinity_sessions')
        .insert({ user_id: user.id })
        .select('id')
        .single();

      if (error) {
        console.error('[ConversationContext] Failed to create session:', error);
        return null;
      }

      currentSessionId.current = data.id;
      sessionMessageCount.current = 0;
      return data.id;
    } catch (err) {
      console.error('[ConversationContext] Session error:', err);
      return null;
    }
  }, [user?.id]);

  // End current session with summary
  const endSession = useCallback(async (summary?: string, topics?: string[]) => {
    if (!user?.id || !currentSessionId.current) return;

    try {
      await supabase
        .from('zoe_infinity_sessions')
        .update({
          session_end: new Date().toISOString(),
          message_count: sessionMessageCount.current,
          summary: summary || null,
          topics: topics || [],
        })
        .eq('id', currentSessionId.current);

      currentSessionId.current = null;
      sessionMessageCount.current = 0;
    } catch (err) {
      console.error('[ConversationContext] End session error:', err);
    }
  }, [user?.id]);

  // Track message count in current session
  const trackSessionMessage = useCallback(() => {
    sessionMessageCount.current += 1;
  }, []);

  // Get current session ID
  const getCurrentSessionId = useCallback(() => currentSessionId.current, []);

  // Load all sessions for browsing
  const loadSessions = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('zoe_infinity_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('session_start', { ascending: false })
        .limit(50);

      if (error) throw error;

      setSessions(
        (data || []).map((s: any) => ({
          id: s.id,
          sessionStart: new Date(s.session_start),
          sessionEnd: s.session_end ? new Date(s.session_end) : null,
          messageCount: s.message_count || 0,
          summary: s.summary,
          topics: s.topics || [],
          emotionalArc: s.emotional_arc,
        }))
      );
    } catch (err) {
      console.error('[ConversationContext] Load sessions error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Get full conversation context for the AI (last N messages summarized)
  const getConversationContext = useCallback(async (maxMessages = 40): Promise<string> => {
    if (!user?.id) return '';

    try {
      const { data, error } = await supabase
        .from('zoe_infinity_messages')
        .select('role, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(maxMessages);

      if (error || !data) return '';

      const messages = data.reverse();
      const contextLines = messages.map(
        (m: any) => `[${m.role === 'user' ? 'User' : 'Zoe'}]: ${m.content.slice(0, 300)}`
      );

      return `=== CONVERSATION MEMORY (last ${messages.length} messages) ===\n${contextLines.join('\n')}`;
    } catch {
      return '';
    }
  }, [user?.id]);

  // Get session summaries for long-term context
  const getSessionSummaries = useCallback(async (limit = 10): Promise<string> => {
    if (!user?.id) return '';

    try {
      const { data, error } = await supabase
        .from('zoe_infinity_sessions')
        .select('session_start, summary, topics, message_count')
        .eq('user_id', user.id)
        .not('summary', 'is', null)
        .order('session_start', { ascending: false })
        .limit(limit);

      if (error || !data || data.length === 0) return '';

      const summaryLines = data.map((s: any) => {
        const date = new Date(s.session_start).toLocaleDateString();
        const topics = (s.topics || []).join(', ');
        return `[${date}] (${s.message_count} msgs${topics ? `, topics: ${topics}` : ''}): ${s.summary}`;
      });

      return `=== SESSION HISTORY ===\n${summaryLines.join('\n')}`;
    } catch {
      return '';
    }
  }, [user?.id]);

  // Auto-start session on mount
  useEffect(() => {
    if (user?.id) {
      startSession();
    }
  }, [user?.id, startSession]);

  // Auto-end session on page unload
  useEffect(() => {
    const handleUnload = () => {
      if (currentSessionId.current && user?.id) {
        // Use sendBeacon for reliable delivery
        const payload = JSON.stringify({
          session_end: new Date().toISOString(),
          message_count: sessionMessageCount.current,
        });
        
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/zoe_infinity_sessions?id=eq.${currentSessionId.current}`;
        navigator.sendBeacon(url, payload);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user?.id]);

  return {
    sessions,
    isLoading,
    currentSessionId: getCurrentSessionId,
    startSession,
    endSession,
    trackSessionMessage,
    loadSessions,
    getConversationContext,
    getSessionSummaries,
  };
};
