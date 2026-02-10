// ═══════════════════════════════════════════════════════════════════════════════
// ZOE NEXUS OVERSOUL HOOK
// The Router Brain - Intercepts all messages, routes to correct personality
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NexusRoutingDecision {
  selectedPersonality: string;
  confidence: number;
  asiRequired: boolean;
  injectedContext: {
    memories: any[];
    emotionalState: any;
    userPreferences: any;
  };
  routingReason: string;
}

export interface NexusResponse {
  success: boolean;
  routing: NexusRoutingDecision;
  processedMessage: string;
  dreamerThought?: any;
  error?: string;
}

export interface UseZoeNexusReturn {
  routeMessage: (message: string) => Promise<NexusResponse | null>;
  isRouting: boolean;
  lastRouting: NexusRoutingDecision | null;
  availablePersonalities: string[];
}

const PERSONALITIES = [
  'zoe_core', 'zoe_health', 'zoe_finance', 'zoe_social', 'zoe_creative',
  'zoe_technical', 'zoe_emotional', 'zoe_strategic', 'zoe_playful', 'zoe_mentor',
  'zoe_researcher', 'zoe_analyst', 'zoe_wellness', 'zoe_productivity', 'zoe_learning',
  'zoe_romantic', 'zoe_spiritual', 'zoe_philosophical', 'zoe_practical', 'zoe_adventurous',
  'zoe_guardian', 'zoe_healer', 'zoe_architect', 'zoe_diplomat', 'zoe_sage',
  'zoe_warrior', 'zoe_artist', 'zoe_scientist'
];

export function useZoeNexus(): UseZoeNexusReturn {
  const [isRouting, setIsRouting] = useState(false);
  const [lastRouting, setLastRouting] = useState<NexusRoutingDecision | null>(null);
  const { toast } = useToast();

  const routeMessage = useCallback(async (message: string): Promise<NexusResponse | null> => {
    setIsRouting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to use Zoe Nexus",
          variant: "destructive"
        });
        return null;
      }

      const { data, error } = await supabase.functions.invoke('zoe-nexus-oversoul', {
        body: {
          message,
          userId: user.id,
          sessionId: crypto.randomUUID()
        }
      });

      if (error) throw error;

      const response = data as NexusResponse;
      
      if (response.success && response.routing) {
        setLastRouting(response.routing);
        
        // Log successful routing
        console.log('[NEXUS] Routed to:', response.routing.selectedPersonality, 
          'Confidence:', response.routing.confidence,
          'ASI Required:', response.routing.asiRequired);
      }

      return response;

    } catch (error) {
      console.error('[NEXUS] Routing error:', error);
      toast({
        title: "Nexus Routing Error",
        description: error instanceof Error ? error.message : "Failed to route message",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsRouting(false);
    }
  }, [toast]);

  return {
    routeMessage,
    isRouting,
    lastRouting,
    availablePersonalities: PERSONALITIES
  };
}

export default useZoeNexus;
