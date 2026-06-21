// ═══════════════════════════════════════════════════════════════════════════════
// MORNING BRIEFING HOOK - "THE PREMONITION DELIVERY SYSTEM"
// 
// TRIGGER: When user sends first message of the day, deliver the pre-computed
// Morning Briefing from the Ready Queue BEFORE answering their specific text.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface MorningBriefing {
  id: string;
  userId: string;
  insightHeadline: string;
  profoundInsight: string;
  actionItem: string;
  tone: 'wise' | 'prophetic' | 'calm' | 'urgent';
  scenarios: Array<{
    id: string;
    name: string;
    description: string;
    outcome: string;
    probability: number;
    riskLevel: number;
    recommendation: string;
  }>;
  deliveredAt: string | null;
  createdAt: string;
}

export interface UseMorningBriefingReturn {
  pendingBriefing: MorningBriefing | null;
  hasPendingBriefing: boolean;
  deliverBriefing: () => Promise<string | null>;
  markBriefingDelivered: () => Promise<void>;
  checkForBriefing: () => Promise<void>;
  briefingHistory: MorningBriefing[];
  isLoading: boolean;
}

export function useMorningBriefing(): UseMorningBriefingReturn {
  const { user } = useAuth();
  const [pendingBriefing, setPendingBriefing] = useState<MorningBriefing | null>(null);
  const [briefingHistory, setBriefingHistory] = useState<MorningBriefing[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user has been greeted today
  const hasBeenGreetedToday = useCallback((): boolean => {
    if (!user) return true;
    const today = new Date().toDateString();
    const lastBriefingDate = localStorage.getItem(`morning_briefing_${user.id}`);
    return lastBriefingDate === today;
  }, [user]);

  // Check Ready Queue for pending briefing
  const checkForBriefing = useCallback(async (): Promise<void> => {
    if (!user || hasBeenGreetedToday()) {
      return;
    }

    setIsLoading(true);
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Query the Ready Queue (behavioral_events with morning_briefing_ready type)
      const { data, error } = await supabase
        .from('behavioral_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_type', 'morning_briefing_ready')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const metadata = data[0].metadata as Record<string, any>;
        if (metadata?.briefing && metadata?.readyForDelivery) {
          const briefing = metadata.briefing as MorningBriefing;
          // Only set if not already delivered
          if (!briefing.deliveredAt) {
            setPendingBriefing(briefing);
          }
        }
      }

      // Also fetch briefing history
      const { data: historyData } = await supabase
        .from('behavioral_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_type', 'morning_briefing_ready')
        .order('created_at', { ascending: false })
        .limit(7);

      if (historyData) {
        const history: MorningBriefing[] = historyData
          .map(event => {
            const metadata = event.metadata as Record<string, any>;
            return metadata?.briefing as MorningBriefing;
          })
          .filter(Boolean);
        setBriefingHistory(history);
      }
    } catch (error) {
      console.error('[MorningBriefing] Check error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, hasBeenGreetedToday]);

  // Deliver the pending briefing (returns formatted message)
  const deliverBriefing = useCallback(async (): Promise<string | null> => {
    if (!pendingBriefing) return null;

    // Format the briefing for delivery
    const toneEmoji: Record<string, string> = {
      wise: '🦉',
      prophetic: '🔮',
      calm: '☀️',
      urgent: '⚡'
    };

    const message = `${toneEmoji[pendingBriefing.tone]} **${pendingBriefing.insightHeadline}**

${pendingBriefing.profoundInsight}

**Today's Action:** ${pendingBriefing.actionItem}`;

    return message;
  }, [pendingBriefing]);

  // Mark briefing as delivered
  const markBriefingDelivered = useCallback(async (): Promise<void> => {
    if (!user || !pendingBriefing) return;

    try {
      // Update localStorage to prevent re-delivery
      const today = new Date().toDateString();
      localStorage.setItem(`morning_briefing_${user.id}`, today);

      // Log delivery event
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'morning_briefing_delivered',
        event_category: 'zoe_dreamer',
        context_snippet: pendingBriefing.insightHeadline,
        metadata: {
          briefingId: pendingBriefing.id,
          deliveredAt: new Date().toISOString(),
          tone: pendingBriefing.tone
        }
      });

      setPendingBriefing(null);
    } catch (error) {
      console.error('[MorningBriefing] Mark delivered error:', error);
    }
  }, [user, pendingBriefing]);

  // Check for briefing on mount
  useEffect(() => {
    checkForBriefing();
  }, [checkForBriefing]);

  return {
    pendingBriefing,
    hasPendingBriefing: !!pendingBriefing,
    deliverBriefing,
    markBriefingDelivered,
    checkForBriefing,
    briefingHistory,
    isLoading
  };
}

export default useMorningBriefing;
