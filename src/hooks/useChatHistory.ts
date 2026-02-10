/**
 * Universal Chat History Hook
 * Manages chat history persistence across all Zoe chat interfaces
 * Ensures conversations are saved and loaded consistently
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface UseChatHistoryOptions {
  table: 'ai_companion_messages' | 'zoe_messages' | 'messages' | 'zoe_infinity_messages';
  maxHistory?: number;
  autoSave?: boolean;
  /** For ai_companion_messages only: filter by variant (zoe_classic or zoe_infinity). Ignored for zoe_infinity_messages. */
  variant?: 'zoe_classic' | 'zoe_infinity';
}

export const useChatHistory = (options: UseChatHistoryOptions) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveQueueRef = useRef<ChatMessage[]>([]);
  const isSavingRef = useRef(false);

  const { table, maxHistory = 100, autoSave = true, variant } = options;

  // Load conversation history
  const loadHistory = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Query based on table type - ISOLATION: zoe_infinity_messages is separate
      let query;
      if (table === 'zoe_infinity_messages') {
        // Zoe Infinity has its own dedicated table (no variant column needed)
        query = supabase
          .from('zoe_infinity_messages')
          .select('id, content, role, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(maxHistory);
      } else if (table === 'ai_companion_messages' || table === 'zoe_messages') {
        query = supabase
          .from(table)
          .select('id, content, role, created_at')
          .eq('user_id', user.id);
        
        // Apply variant filter for ai_companion_messages to ensure isolation
        if (table === 'ai_companion_messages' && variant) {
          query = query.eq('variant', variant);
        } else if (table === 'ai_companion_messages') {
          // Default to classic if no variant specified (exclude infinity)
          query = query.or('variant.is.null,variant.eq.zoe_classic');
        }
        
        query = query.order('created_at', { ascending: true }).limit(maxHistory);
      } else {
        // For messages table, we need different handling
        setIsLoading(false);
        return;
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) {
        console.error(`[ChatHistory] Load error from ${table}:`, fetchError);
        setError(fetchError.message);
        return;
      }
      
      if (data) {
        const loadedMessages: ChatMessage[] = data.map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content || '',
          timestamp: new Date(msg.created_at),
        }));
        
        setMessages(loadedMessages);
        console.log(`[ChatHistory] Loaded ${loadedMessages.length} messages from ${table}`);
      }
    } catch (err) {
      console.error('[ChatHistory] Unexpected error:', err);
      setError('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  }, [user, table, maxHistory]);

  // Save a single message
  const saveMessage = useCallback(async (message: ChatMessage): Promise<boolean> => {
    if (!user || !message.content.trim()) {
      console.warn('[ChatHistory] Cannot save: no user or empty content');
      return false;
    }
    
    try {
      // Only save to supported tables
      if (table === 'messages') {
        console.warn('[ChatHistory] Direct messages table not supported');
        return false;
      }
      
      // ISOLATION: zoe_infinity_messages has no variant column
      if (table === 'zoe_infinity_messages') {
        const { data, error: saveError } = await supabase
          .from('zoe_infinity_messages')
          .insert({
            user_id: user.id,
            role: message.role,
            content: message.content.trim(),
          })
          .select('id')
          .single();
        
        if (saveError) {
          console.error('[ChatHistory] Save error to zoe_infinity_messages:', saveError);
          return false;
        }
        
        console.log('[ChatHistory] Saved message to zoe_infinity_messages:', data?.id);
        return true;
      }
      
      // Classic tables with optional variant
      const insertData: any = {
        user_id: user.id,
        role: message.role,
        content: message.content.trim(),
      };
      
      // Apply variant for ai_companion_messages
      if (table === 'ai_companion_messages' && variant) {
        insertData.variant = variant;
      } else if (table === 'ai_companion_messages') {
        insertData.variant = 'zoe_classic'; // Default to classic
      }
      
      const { data, error: saveError } = await supabase
        .from(table as 'ai_companion_messages' | 'zoe_messages')
        .insert(insertData)
        .select('id')
        .single();
      
      if (saveError) {
        console.error(`[ChatHistory] Save error to ${table}:`, saveError);
        return false;
      }
      
      console.log(`[ChatHistory] Saved message to ${table}:`, data?.id);
      return true;
    } catch (err) {
      console.error('[ChatHistory] Save exception:', err);
      return false;
    }
  }, [user, table, variant]);

  // Process save queue
  const processSaveQueue = useCallback(async () => {
    if (isSavingRef.current || saveQueueRef.current.length === 0) return;
    
    isSavingRef.current = true;
    
    while (saveQueueRef.current.length > 0) {
      const message = saveQueueRef.current.shift();
      if (message) {
        await saveMessage(message);
      }
    }
    
    isSavingRef.current = false;
  }, [saveMessage]);

  // Add message and optionally save
  const addMessage = useCallback(async (
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, any>
  ): Promise<ChatMessage> => {
    const message: ChatMessage = {
      role,
      content,
      timestamp: new Date(),
      metadata,
    };
    
    setMessages(prev => [...prev, message]);
    
    if (autoSave && content.trim()) {
      saveQueueRef.current.push(message);
      processSaveQueue();
    }
    
    return message;
  }, [autoSave, processSaveQueue]);

  // Clear history
  const clearHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      if (table === 'messages') return;
      
      // ISOLATION: Handle zoe_infinity_messages separately
      if (table === 'zoe_infinity_messages') {
        await supabase
          .from('zoe_infinity_messages')
          .delete()
          .eq('user_id', user.id);
      } else {
        await supabase
          .from(table as 'ai_companion_messages' | 'zoe_messages')
          .delete()
          .eq('user_id', user.id);
      }
      
      setMessages([]);
      console.log(`[ChatHistory] Cleared history from ${table}`);
    } catch (err) {
      console.error('[ChatHistory] Clear error:', err);
    }
  }, [user, table]);

  // Get messages for API context (last N messages)
  const getContextMessages = useCallback((count: number = 20) => {
    return messages.slice(-count).map(m => ({
      role: m.role,
      content: m.content,
    }));
  }, [messages]);

  // Load on mount
  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, loadHistory]);

  return {
    messages,
    setMessages,
    addMessage,
    saveMessage,
    loadHistory,
    clearHistory,
    getContextMessages,
    isLoading,
    error,
  };
};
