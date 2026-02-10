// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY STREAM HOOK - Fetches and manages cortical stack memories
// Provides real-time memory timeline with sentiment analysis
// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL: SEMANTIC COMPRESSION - We do not delete memories; we distill them
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { SemanticCompressor, type GhostToken } from '@/core/memory/SemanticCompressor';

export interface CorticalMemory {
  id: string;
  user_id: string;
  content: string;
  role: 'user' | 'assistant';
  sentiment_score: number;
  is_breakthrough: boolean;
  summary: string | null;
  tags: string[];
  emotional_context: Record<string, any>;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryNode {
  id: string;
  content: string;
  summary: string;
  sentimentScore: number;
  isBreakthrough: boolean;
  timestamp: Date;
  role: 'user' | 'assistant';
  color: 'red' | 'blue' | 'gold' | 'gray';
}

interface UseMemoryStreamReturn {
  memories: CorticalMemory[];
  nodes: MemoryNode[];
  isLoading: boolean;
  error: string | null;
  // MEMORY IMMORTALITY: Distill before any delete
  distillMemories: (memories: CorticalMemory[]) => Promise<void>;
  restoreContext: (projectName: string) => Promise<void>;
  addMemory: (content: string, role: 'user' | 'assistant', sentimentScore?: number, isBreakthrough?: boolean, summary?: string) => Promise<CorticalMemory | null>;
  markAsBreakthrough: (memoryId: string) => Promise<void>;
  refreshMemories: () => Promise<void>;
}

// Simple sentiment analysis (can be enhanced with AI later)
const analyzeSentiment = (text: string): number => {
  const positiveWords = ['love', 'happy', 'great', 'wonderful', 'amazing', 'excited', 'grateful', 'blessed', 'joy', 'peace', 'calm', 'inspired'];
  const negativeWords = ['hate', 'sad', 'terrible', 'awful', 'anxious', 'stressed', 'worried', 'angry', 'frustrated', 'depressed', 'fear', 'pain'];
  
  const lowerText = text.toLowerCase();
  let score = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) score += 0.2;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) score -= 0.2;
  });
  
  return Math.max(-1, Math.min(1, score));
};

// Generate a short summary (first 3 words or extract key topic)
const generateSummary = (text: string): string => {
  const words = text.trim().split(/\s+/).slice(0, 5);
  return words.join(' ') + (text.split(/\s+/).length > 5 ? '...' : '');
};

// Determine node color based on sentiment
const getNodeColor = (sentimentScore: number, isBreakthrough: boolean): MemoryNode['color'] => {
  if (isBreakthrough) return 'gold';
  if (sentimentScore < -0.3) return 'red';
  if (sentimentScore > 0.3) return 'blue';
  return 'gray';
};

export const useMemoryStream = (): UseMemoryStreamReturn => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<CorticalMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    if (!user?.id) {
      setMemories([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('cortical_stack_memories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      setMemories((data as CorticalMemory[]) || []);
      setError(null);
    } catch (err) {
      console.error('[MemoryStream] Error fetching memories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load memories');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchMemories();

    if (!user?.id) return;

    // Subscribe to real-time changes
    const channel = supabase
      .channel('cortical-memories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cortical_stack_memories',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[MemoryStream] Realtime update:', payload);
          fetchMemories(); // Refresh on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchMemories]);

  // Convert memories to visual nodes
  const nodes: MemoryNode[] = memories.map((memory) => ({
    id: memory.id,
    content: memory.content,
    summary: memory.summary || generateSummary(memory.content),
    sentimentScore: memory.sentiment_score,
    isBreakthrough: memory.is_breakthrough,
    timestamp: new Date(memory.created_at),
    role: memory.role as 'user' | 'assistant',
    color: getNodeColor(memory.sentiment_score, memory.is_breakthrough),
  }));

  const addMemory = useCallback(async (
    content: string,
    role: 'user' | 'assistant',
    sentimentScore?: number,
    isBreakthrough?: boolean,
    summary?: string
  ): Promise<CorticalMemory | null> => {
    if (!user?.id) return null;

    const finalSentiment = sentimentScore ?? analyzeSentiment(content);
    const finalSummary = summary || generateSummary(content);

    try {
      const { data, error: insertError } = await supabase
        .from('cortical_stack_memories')
        .insert({
          user_id: user.id,
          content,
          role,
          sentiment_score: finalSentiment,
          is_breakthrough: isBreakthrough || false,
          summary: finalSummary,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('[MemoryStream] Memory added:', data);
      return data as CorticalMemory;
    } catch (err) {
      console.error('[MemoryStream] Error adding memory:', err);
      return null;
    }
  }, [user?.id]);

  const markAsBreakthrough = useCallback(async (memoryId: string) => {
    if (!user?.id) return;

    try {
      const { error: updateError } = await supabase
        .from('cortical_stack_memories')
        .update({ is_breakthrough: true })
        .eq('id', memoryId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      
      console.log('[MemoryStream] Marked as breakthrough:', memoryId);
    } catch (err) {
      console.error('[MemoryStream] Error marking breakthrough:', err);
    }
  }, [user?.id]);

  // MEMORY IMMORTALITY: Distill memories to Truth Ledger before clearing
  const distillMemories = useCallback(async (memoriesToDistill: CorticalMemory[]) => {
    if (!user?.id || memoriesToDistill.length === 0) return;

    console.log(`[MemoryStream] PROTOCOL: SEMANTIC COMPRESSION - Distilling ${memoriesToDistill.length} memories...`);

    const ghostTokens: GhostToken[] = memoriesToDistill.map(m => ({
      id: m.id,
      content: m.content,
      createdAt: new Date(m.created_at),
      tokenCount: Math.ceil(m.content.length / 4),
      sessionId: m.session_id || undefined
    }));

    const result = await SemanticCompressor.distillToTruthVector(user.id, ghostTokens);
    
    if (result.success) {
      console.log(`[MemoryStream] ✓ Distilled ${result.vectorsCreated} truth vectors, freed ${result.tokensFreed} tokens`);
    } else {
      console.error('[MemoryStream] ✗ Distillation failed - REFUSING to delete memories');
    }
  }, [user?.id]);

  // RESTORATION: Restore context from backup logs
  const restoreContext = useCallback(async (projectName: string) => {
    if (!user?.id) return;

    console.log(`[MemoryStream] Restoring "${projectName}" context from backup logs...`);
    const vectors = await SemanticCompressor.restoreFromBackupLogs(user.id, projectName);
    
    if (vectors.length > 0) {
      console.log(`[MemoryStream] ✓ Restored ${vectors.length} truth vectors for "${projectName}"`);
    } else {
      console.warn(`[MemoryStream] No backup found for "${projectName}"`);
    }
  }, [user?.id]);

  return {
    memories,
    nodes,
    isLoading,
    error,
    addMemory,
    markAsBreakthrough,
    refreshMemories: fetchMemories,
    distillMemories,
    restoreContext,
  };
};
