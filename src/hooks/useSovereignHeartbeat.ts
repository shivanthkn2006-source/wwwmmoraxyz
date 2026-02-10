// ═══════════════════════════════════════════════════════════════════════════════
// SOVEREIGN HEARTBEAT HOOK - PHASE 1: FORCING AGENCY
// Frontend integration for the Infinite Loop Patch
// Monitor and control Zoe's autonomous 24/7 operation
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProactiveThought {
  id: string;
  type: 'strategic_adjustment' | 'edge_case_discovery' | 'optimization' | 'insight' | 'reminder' | 'concern';
  content: string;
  reasoning: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  relatedGoals: string[];
  actionSuggested: string | null;
  createdAt: string;
}

export interface HeartbeatStatus {
  isAlive: boolean;
  lastHeartbeat: string | null;
  thoughtsGeneratedToday: number;
  notificationsSentToday: number;
  nextHeartbeat: string | null;
}

export interface UseSovereignHeartbeatReturn {
  // Status
  status: HeartbeatStatus;
  isLoading: boolean;
  
  // Proactive Thoughts
  recentThoughts: ProactiveThought[];
  unreadThoughts: number;
  
  // Actions
  triggerManualHeartbeat: () => Promise<void>;
  markThoughtAsRead: (thoughtId: string) => void;
  dismissThought: (thoughtId: string) => void;
  
  // Refresh
  refresh: () => Promise<void>;
}

export function useSovereignHeartbeat(): UseSovereignHeartbeatReturn {
  const [status, setStatus] = useState<HeartbeatStatus>({
    isAlive: false,
    lastHeartbeat: null,
    thoughtsGeneratedToday: 0,
    notificationsSentToday: 0,
    nextHeartbeat: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentThoughts, setRecentThoughts] = useState<ProactiveThought[]>([]);
  const [readThoughtIds, setReadThoughtIds] = useState<Set<string>>(new Set());
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LOAD STATUS AND THOUGHTS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const loadStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Get last heartbeat event
      const { data: lastHeartbeat } = await supabase
        .from('behavioral_events')
        .select('created_at, metadata')
        .eq('event_type', 'sovereign_heartbeat')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Count today's thoughts
      const { count: thoughtsToday } = await supabase
        .from('behavioral_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('event_type', 'proactive_thought')
        .gte('created_at', startOfDay.toISOString());
      
      // Count today's notifications
      const { count: notificationsToday } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'proactive_insight')
        .gte('created_at', startOfDay.toISOString());
      
      // Calculate next heartbeat (approximately 5 minutes from last)
      let nextHeartbeat: string | null = null;
      if (lastHeartbeat?.created_at) {
        const lastTime = new Date(lastHeartbeat.created_at);
        const nextTime = new Date(lastTime.getTime() + 5 * 60 * 1000);
        if (nextTime > now) {
          nextHeartbeat = nextTime.toISOString();
        } else {
          // If overdue, next one should be any moment
          nextHeartbeat = new Date(now.getTime() + 60 * 1000).toISOString();
        }
      }
      
      // Determine if heartbeat system is alive (had activity in last 10 minutes)
      const isAlive = lastHeartbeat?.created_at 
        ? (now.getTime() - new Date(lastHeartbeat.created_at).getTime()) < 10 * 60 * 1000
        : false;
      
      setStatus({
        isAlive,
        lastHeartbeat: lastHeartbeat?.created_at || null,
        thoughtsGeneratedToday: thoughtsToday || 0,
        notificationsSentToday: notificationsToday || 0,
        nextHeartbeat,
      });
      
    } catch (error) {
      console.error('[SovereignHeartbeat] Failed to load status:', error);
    }
  }, []);
  
  const loadRecentThoughts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get recent proactive thoughts from cortical stack
      const { data: thoughts } = await supabase
        .from('cortical_stack_memories')
        .select('*')
        .eq('user_id', user.id)
        .contains('tags', ['proactive_thought'])
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (thoughts) {
        const parsedThoughts: ProactiveThought[] = thoughts.map(t => {
          const context = t.emotional_context as Record<string, unknown> || {};
          const tags = t.tags || [];
          
          // Extract thought type from tags
          const typeTag = tags.find((tag: string) => 
            ['strategic_adjustment', 'edge_case_discovery', 'optimization', 'insight', 'reminder', 'concern'].includes(tag)
          );
          
          return {
            id: t.id,
            type: (typeTag || 'insight') as ProactiveThought['type'],
            content: t.content,
            reasoning: t.summary || '',
            urgency: (context.urgency as ProactiveThought['urgency']) || 'low',
            relatedGoals: [],
            actionSuggested: null,
            createdAt: t.created_at,
          };
        });
        
        setRecentThoughts(parsedThoughts);
      }
      
    } catch (error) {
      console.error('[SovereignHeartbeat] Failed to load thoughts:', error);
    }
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIAL LOAD AND SUBSCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([loadStatus(), loadRecentThoughts()]);
      setIsLoading(false);
    };
    
    load();
    
    // Refresh every minute
    const interval = setInterval(loadStatus, 60000);
    
    return () => clearInterval(interval);
  }, [loadStatus, loadRecentThoughts]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const triggerManualHeartbeat = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.functions.invoke('zoe-sovereign-heartbeat', {
        body: {
          mode: 'on_demand',
          specificUserId: user.id,
        },
      });
      
      // Refresh after trigger
      await Promise.all([loadStatus(), loadRecentThoughts()]);
      
    } catch (error) {
      console.error('[SovereignHeartbeat] Manual trigger failed:', error);
    }
  }, [loadStatus, loadRecentThoughts]);
  
  const markThoughtAsRead = useCallback((thoughtId: string) => {
    setReadThoughtIds(prev => new Set([...prev, thoughtId]));
  }, []);
  
  const dismissThought = useCallback((thoughtId: string) => {
    setRecentThoughts(prev => prev.filter(t => t.id !== thoughtId));
    setReadThoughtIds(prev => new Set([...prev, thoughtId]));
  }, []);
  
  const refresh = useCallback(async () => {
    await Promise.all([loadStatus(), loadRecentThoughts()]);
  }, [loadStatus, loadRecentThoughts]);
  
  // Calculate unread count
  const unreadThoughts = recentThoughts.filter(t => !readThoughtIds.has(t.id)).length;
  
  return {
    status,
    isLoading,
    recentThoughts,
    unreadThoughts,
    triggerManualHeartbeat,
    markThoughtAsRead,
    dismissThought,
    refresh,
  };
}

export default useSovereignHeartbeat;