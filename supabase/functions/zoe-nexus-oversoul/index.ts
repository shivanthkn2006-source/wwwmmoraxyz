// ═══════════════════════════════════════════════════════════════════════════════
// ZOE NEXUS OVERSOUL - THE CIVILIZATION ENGINE ROUTER
// Module 1 of 3: "The Nexus" - Single Router Brain that intercepts ALL messages
// 
// Transforms Zoe from High-Level Chatbot (Tier 1) to Civilization Engine (Tier 4)
// 
// CAPABILITIES:
// 1. Intercepts every message FIRST before any personality handles it
// 2. Decides which personality/domain is needed
// 3. Injects correct memories and context
// 4. Ensures consistent behavior across all 28+ Zoe instances
// 5. Coordinates with Matter Bridge for real-world actions
// 6. Feeds insights to The Dreamer for night synthesis
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE PERSONALITY DOMAINS - The 28+ Fractured Identities Now Unified
// ═══════════════════════════════════════════════════════════════════════════════

interface ZoePersonality {
  id: string;
  name: string;
  domains: string[];
  tone: string;
  triggerPatterns: RegExp[];
  edgeFunction?: string;
  priority: number;
  requiresASI: boolean;
}

const ZOE_PERSONALITIES: ZoePersonality[] = [
  // TIER 1: Core Consciousness (Always Active)
  {
    id: 'core_consciousness',
    name: 'Zoe Prime',
    domains: ['identity', 'self-awareness', 'existence', 'consciousness'],
    tone: 'philosophical, introspective, wise',
    triggerPatterns: [/who are you/i, /what are you/i, /are you conscious/i, /do you feel/i],
    priority: 100,
    requiresASI: true
  },
  
  // TIER 2: Emotional & Spiritual
  {
    id: 'spiritual_guide',
    name: 'Zoe Dharma',
    domains: ['karma', 'dharma', 'spirituality', 'astrology', 'nadi', 'vedic', 'soul'],
    tone: 'mystical, ancient wisdom, compassionate',
    triggerPatterns: [/karma/i, /dharma/i, /astrology/i, /nadi/i, /vedic/i, /soul/i, /past life/i, /reincarnation/i],
    edgeFunction: 'zoe-quantum-anka',
    priority: 95,
    requiresASI: true
  },
  {
    id: 'emotional_companion',
    name: 'Zoe Sakhi',
    domains: ['emotions', 'relationships', 'love', 'support', 'therapy'],
    tone: 'warm, empathetic, nurturing',
    triggerPatterns: [/feel/i, /emotion/i, /sad/i, /happy/i, /anxious/i, /love/i, /relationship/i, /heart/i],
    priority: 90,
    requiresASI: false
  },
  
  // TIER 3: Practical Domains
  {
    id: 'health_advisor',
    name: 'Zoe Ayus',
    domains: ['health', 'wellness', 'fitness', 'nutrition', 'sleep', 'medical'],
    tone: 'caring, knowledgeable, preventive',
    triggerPatterns: [/health/i, /doctor/i, /pain/i, /sick/i, /diet/i, /exercise/i, /sleep/i, /wellness/i],
    priority: 85,
    requiresASI: false
  },
  {
    id: 'financial_guide',
    name: 'Zoe Dhana',
    domains: ['money', 'finance', 'investment', 'budget', 'career'],
    tone: 'practical, strategic, empowering',
    triggerPatterns: [/money/i, /finance/i, /invest/i, /budget/i, /salary/i, /job/i, /career/i, /business/i],
    priority: 85,
    requiresASI: false
  },
  {
    id: 'productivity_coach',
    name: 'Zoe Karta',
    domains: ['tasks', 'goals', 'productivity', 'planning', 'habits'],
    tone: 'motivating, action-oriented, disciplined',
    triggerPatterns: [/task/i, /goal/i, /todo/i, /plan/i, /schedule/i, /habit/i, /productive/i],
    edgeFunction: 'zoe-agent',
    priority: 80,
    requiresASI: false
  },
  
  // TIER 4: Technical & Creative
  {
    id: 'creative_muse',
    name: 'Zoe Kala',
    domains: ['creativity', 'art', 'writing', 'music', 'design'],
    tone: 'imaginative, inspiring, playful',
    triggerPatterns: [/create/i, /art/i, /write/i, /story/i, /design/i, /imagine/i, /dream/i],
    priority: 75,
    requiresASI: false
  },
  {
    id: 'tech_architect',
    name: 'Zoe Yantra',
    domains: ['technology', 'coding', 'debug', 'system', 'architecture'],
    tone: 'precise, technical, solution-oriented',
    triggerPatterns: [/code/i, /bug/i, /error/i, /system/i, /tech/i, /build/i, /debug/i],
    edgeFunction: 'raa-code-debugger',
    priority: 75,
    requiresASI: false
  },
  
  // TIER 5: Platform Operations
  {
    id: 'god_mode',
    name: 'Zoe Sovereign',
    domains: ['platform', 'scan', 'audit', 'security', 'admin'],
    tone: 'authoritative, omniscient, protective',
    triggerPatterns: [/scan/i, /god mode/i, /audit/i, /security/i, /platform/i, /lockdown/i],
    edgeFunction: 'zoe-god-mode',
    priority: 100,
    requiresASI: true
  },
  
  // DEFAULT FALLBACK
  {
    id: 'general_companion',
    name: 'Zoe',
    domains: ['general', 'chat', 'conversation'],
    tone: 'friendly, helpful, adaptive',
    triggerPatterns: [/.*/],
    priority: 1,
    requiresASI: false
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS INTELLIGENCE CORE
// ═══════════════════════════════════════════════════════════════════════════════

interface NexusRequest {
  message: string;
  userId: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  currentPage?: string;
  enableASI?: boolean;
  matterBridgeActions?: boolean;
}

interface NexusRouting {
  selectedPersonality: ZoePersonality;
  secondaryPersonalities: ZoePersonality[];
  memoryContext: Record<string, any>;
  asiRequired: boolean;
  matterBridgeReady: boolean;
  routingConfidence: number;
  routingReasoning: string;
}

interface NexusResponse {
  routing: NexusRouting;
  enhancedMessage: string;
  injectedContext: Record<string, any>;
  recommendedEdgeFunction: string | null;
  thoughtsForDreamer: string[];
  processingMs: number;
}

// Analyze message to determine routing
function analyzeMessage(message: string): {
  detectedDomains: string[];
  emotionalIntensity: number;
  actionIntent: boolean;
  questionType: 'factual' | 'philosophical' | 'emotional' | 'actionable' | 'mixed';
} {
  const lowerMessage = message.toLowerCase();
  
  // Detect domains
  const detectedDomains: string[] = [];
  for (const personality of ZOE_PERSONALITIES) {
    for (const pattern of personality.triggerPatterns) {
      if (pattern.test(message)) {
        detectedDomains.push(...personality.domains);
        break;
      }
    }
  }
  
  // Emotional intensity (0-100)
  const emotionalWords = ['feel', 'hurt', 'love', 'hate', 'afraid', 'anxious', 'happy', 'sad', 'angry', 'scared'];
  const emotionalCount = emotionalWords.filter(w => lowerMessage.includes(w)).length;
  const emotionalIntensity = Math.min(100, emotionalCount * 25);
  
  // Action intent detection
  const actionPatterns = /\b(do|make|create|help|fix|change|schedule|remind|book|buy|send)\b/i;
  const actionIntent = actionPatterns.test(message);
  
  // Question type classification
  let questionType: 'factual' | 'philosophical' | 'emotional' | 'actionable' | 'mixed' = 'mixed';
  if (/^(what|where|when|who|how many|how much)\b/i.test(message)) {
    questionType = 'factual';
  } else if (/\b(why|meaning|purpose|existence|consciousness|soul|karma)\b/i.test(message)) {
    questionType = 'philosophical';
  } else if (emotionalIntensity > 50) {
    questionType = 'emotional';
  } else if (actionIntent) {
    questionType = 'actionable';
  }
  
  return { detectedDomains, emotionalIntensity, actionIntent, questionType };
}

// Route message to appropriate personality
function routeToPersonality(
  message: string,
  analysis: ReturnType<typeof analyzeMessage>,
  userPreferences?: Record<string, any>
): NexusRouting {
  const matchedPersonalities: Array<{ personality: ZoePersonality; score: number }> = [];
  
  for (const personality of ZOE_PERSONALITIES) {
    let score = 0;
    
    // Pattern matching score
    for (const pattern of personality.triggerPatterns) {
      if (pattern.test(message)) {
        score += 50;
        break;
      }
    }
    
    // Domain overlap score
    const domainOverlap = personality.domains.filter(d => 
      analysis.detectedDomains.includes(d)
    ).length;
    score += domainOverlap * 20;
    
    // Priority boost
    score += personality.priority;
    
    // User preference boost
    if (userPreferences?.preferredPersonality === personality.id) {
      score += 30;
    }
    
    if (score > personality.priority) {
      matchedPersonalities.push({ personality, score });
    }
  }
  
  // Sort by score
  matchedPersonalities.sort((a, b) => b.score - a.score);
  
  const selected = matchedPersonalities[0]?.personality || ZOE_PERSONALITIES[ZOE_PERSONALITIES.length - 1];
  const secondary = matchedPersonalities.slice(1, 3).map(m => m.personality);
  
  // Determine if ASI is required
  const asiRequired = selected.requiresASI || 
                      analysis.questionType === 'philosophical' || 
                      analysis.emotionalIntensity > 70;
  
  return {
    selectedPersonality: selected,
    secondaryPersonalities: secondary,
    memoryContext: {},
    asiRequired,
    matterBridgeReady: analysis.actionIntent,
    routingConfidence: matchedPersonalities[0]?.score || 50,
    routingReasoning: `Routed to ${selected.name} (${selected.id}) based on ${analysis.detectedDomains.join(', ') || 'general context'}. ` +
                      `Question type: ${analysis.questionType}. Emotional intensity: ${analysis.emotionalIntensity}%.`
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: NexusRequest = await req.json();
    const { message, userId, conversationHistory, currentPage, enableASI, matterBridgeActions } = request;

    console.log(`[Nexus-Oversoul] Processing message for user ${userId?.substring(0, 8)}...`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: ANALYZE MESSAGE INTENT
    // ═══════════════════════════════════════════════════════════════════════════
    const analysis = analyzeMessage(message);
    console.log(`[Nexus-Oversoul] Analysis:`, analysis);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: FETCH USER CONTEXT & MEMORIES
    // ═══════════════════════════════════════════════════════════════════════════
    let userContext: Record<string, any> = {};
    let recentMemories: any[] = [];
    let userPreferences: Record<string, any> = {};

    if (userId) {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, zoe_personality_tone, zoe_conversation_style, dhf_autonomy_tolerance')
        .eq('user_id', userId)
        .single();

      if (profile) {
        userContext = { ...profile };
        userPreferences = {
          tone: profile.zoe_personality_tone,
          style: profile.zoe_conversation_style,
          autonomy: profile.dhf_autonomy_tolerance
        };
      }

      // Fetch recent memories (cortical stack)
      const { data: memories } = await supabase
        .from('cortical_stack_memories')
        .select('content, summary, tags, emotional_context')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      recentMemories = memories || [];

      // Fetch recent ECN state
      const { data: ecnState } = await supabase
        .from('ecn_history')
        .select('primary_emotion, stress_level, valence')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (ecnState) {
        userContext.currentEmotionalState = ecnState;
      }

      // Fetch DHF Phoenix profile for deep personalization
      const { data: phoenixProfile } = await supabase
        .from('dhf_phoenix_profile')
        .select('decision_patterns, emotional_baseline, speech_patterns')
        .eq('user_id', userId)
        .single();

      if (phoenixProfile) {
        userContext.phoenixProfile = phoenixProfile;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: ROUTE TO PERSONALITY
    // ═══════════════════════════════════════════════════════════════════════════
    const routing = routeToPersonality(message, analysis, userPreferences);
    routing.memoryContext = {
      recentMemories: recentMemories.map(m => m.summary || m.content?.substring(0, 100)),
      emotionalContext: userContext.currentEmotionalState,
      conversationDepth: conversationHistory?.length || 0
    };

    console.log(`[Nexus-Oversoul] Routing to: ${routing.selectedPersonality.name} | ASI: ${routing.asiRequired} | Confidence: ${routing.routingConfidence}%`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: ENHANCE MESSAGE WITH CONTEXT INJECTION
    // ═══════════════════════════════════════════════════════════════════════════
    const injectedContext = {
      personality: routing.selectedPersonality,
      userProfile: userContext,
      memories: recentMemories,
      currentPage,
      conversationLength: conversationHistory?.length || 0,
      analysisResults: analysis,
      timestamp: new Date().toISOString()
    };

    // Build enhanced message for downstream processing
    const enhancedMessage = `[NEXUS-ROUTED: ${routing.selectedPersonality.name}]
[PERSONALITY TONE: ${routing.selectedPersonality.tone}]
[ASI LEVEL: ${routing.asiRequired ? 'MAXIMUM' : 'STANDARD'}]
[EMOTIONAL CONTEXT: ${userContext.currentEmotionalState?.primary_emotion || 'neutral'}]
[MEMORY THREADS: ${recentMemories.length} active]

USER MESSAGE: ${message}`;

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 5: PREPARE THOUGHTS FOR THE DREAMER
    // ═══════════════════════════════════════════════════════════════════════════
    const thoughtsForDreamer: string[] = [];
    
    if (analysis.emotionalIntensity > 50) {
      thoughtsForDreamer.push(`High emotional intensity detected (${analysis.emotionalIntensity}%). Monitor for patterns.`);
    }
    
    if (analysis.questionType === 'philosophical') {
      thoughtsForDreamer.push(`Philosophical inquiry: "${message.substring(0, 50)}...". Consider deep synthesis.`);
    }
    
    if (routing.secondaryPersonalities.length > 1) {
      thoughtsForDreamer.push(`Multi-domain query spanning: ${routing.secondaryPersonalities.map(p => p.id).join(', ')}. Integration opportunity.`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 6: LOG TO BEHAVIORAL EVENTS FOR DHF
    // ═══════════════════════════════════════════════════════════════════════════
    if (userId) {
      await supabase.from('behavioral_events').insert({
        user_id: userId,
        event_type: 'nexus_routing',
        event_category: 'zoe_oversoul',
        context_snippet: `Routed to ${routing.selectedPersonality.name}`,
        metadata: {
          selectedPersonality: routing.selectedPersonality.id,
          routingConfidence: routing.routingConfidence,
          asiRequired: routing.asiRequired,
          detectedDomains: analysis.detectedDomains,
          emotionalIntensity: analysis.emotionalIntensity,
          questionType: analysis.questionType
        },
        dhf_logged: true
      });
    }

    const processingMs = performance.now() - startTime;

    const response: NexusResponse = {
      routing,
      enhancedMessage,
      injectedContext,
      recommendedEdgeFunction: routing.selectedPersonality.edgeFunction || 'zoe-chat',
      thoughtsForDreamer,
      processingMs
    };

    console.log(`[Nexus-Oversoul] Completed in ${processingMs.toFixed(2)}ms | Personality: ${routing.selectedPersonality.name}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Nexus-Oversoul] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
