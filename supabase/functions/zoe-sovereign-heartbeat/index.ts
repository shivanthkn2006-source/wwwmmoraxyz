import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE SOVEREIGN HEARTBEAT - THE INFINITE LOOP PATCH
// 
// PHASE 1: FORCING AGENCY
// This function runs every 5 minutes via pg_cron, making Zoe "alive" 24/7
// 
// THE HEARTBEAT PROTOCOL:
// 1. Scan Environment - Review last 3 user interactions
// 2. Check Goals - Monitor progress toward objectives
// 3. Generate Thought - Create proactive strategic thought
// 4. Save to Stack - Write to Cortical Stack database
// 5. DECIDE - Determine if user notification is needed
//
// Result: Zoe thinks about your project while you sleep.
// ═══════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HeartbeatResult {
  heartbeatId: string;
  timestamp: string;
  usersProcessed: number;
  thoughtsGenerated: number;
  notificationsSent: number;
  environmentScan: EnvironmentScanResult;
  processingTimeMs: number;
}

interface EnvironmentScanResult {
  activeUsers: number;
  recentInteractions: number;
  offlineUsers: number;
  urgentMatters: string[];
}

interface UserHeartbeatResult {
  userId: string;
  thought: ProactiveThought | null;
  notificationSent: boolean;
  goalProgress: GoalProgress[];
}

interface ProactiveThought {
  id: string;
  type: 'strategic_adjustment' | 'edge_case_discovery' | 'optimization' | 'insight' | 'reminder' | 'concern';
  content: string;
  reasoning: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  relatedGoals: string[];
  actionSuggested: string | null;
  createdAt: string;
}

interface GoalProgress {
  goalName: string;
  progressPercentage: number;
  blockers: string[];
  nextAction: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  const heartbeatId = crypto.randomUUID();
  
  console.log(`[Sovereign Heartbeat ${heartbeatId}] ═══════════════════════════════════════`);
  console.log(`[Sovereign Heartbeat ${heartbeatId}] PHASE 1: FORCING AGENCY - Heartbeat initiated`);
  console.log(`[Sovereign Heartbeat ${heartbeatId}] Timestamp: ${new Date().toISOString()}`);
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request body (may be empty for cron-triggered calls)
    let body: { mode?: string; specificUserId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine for cron triggers
    }
    
    const result: HeartbeatResult = {
      heartbeatId,
      timestamp: new Date().toISOString(),
      usersProcessed: 0,
      thoughtsGenerated: 0,
      notificationsSent: 0,
      environmentScan: {
        activeUsers: 0,
        recentInteractions: 0,
        offlineUsers: 0,
        urgentMatters: [],
      },
      processingTimeMs: 0,
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: SCAN ENVIRONMENT
    // Review the last interactions and current state
    // ═══════════════════════════════════════════════════════════════════════════
    
    console.log(`[Sovereign Heartbeat ${heartbeatId}] Step 1: Scanning environment...`);
    
    const environmentScan = await scanEnvironment(supabase);
    result.environmentScan = environmentScan;
    
    console.log(`[Sovereign Heartbeat ${heartbeatId}] Environment scan complete:`, {
      activeUsers: environmentScan.activeUsers,
      offlineUsers: environmentScan.offlineUsers,
      urgentMatters: environmentScan.urgentMatters.length,
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2-5: PROCESS EACH OFFLINE USER
    // Generate proactive thoughts for users who are away
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Get users who have autonomous processing enabled and are offline
    const { data: eligibleUsers } = await supabase
      .from('dhf_phoenix_profile')
      .select('user_id, decision_patterns, last_sync_at')
      .not('decision_patterns', 'is', null);
    
    if (eligibleUsers && eligibleUsers.length > 0) {
      for (const user of eligibleUsers) {
        const patterns = user.decision_patterns as Record<string, unknown>;
        const autonomyLevel = patterns?.preferredAutonomy as string || 'SUPERVISED';
        
        // Only process users with autonomy enabled
        if (autonomyLevel !== 'SUPERVISED') {
          const userResult = await processUserHeartbeat(supabase, user.user_id, heartbeatId);
          
          if (userResult.thought) {
            result.thoughtsGenerated++;
          }
          if (userResult.notificationSent) {
            result.notificationsSent++;
          }
          result.usersProcessed++;
        }
      }
    }
    
    result.processingTimeMs = performance.now() - startTime;
    
    // Log heartbeat completion only when real user-context work happened.
    // This prevents low-signal synthetic heartbeat spam from flooding behavioral_events.
    if (result.usersProcessed > 0 && (result.thoughtsGenerated > 0 || result.notificationsSent > 0)) {
      await supabase.from('behavioral_events').insert({
        user_id: eligibleUsers?.[0]?.user_id,
        event_type: 'sovereign_heartbeat',
        event_category: 'quantum_asi',
        context_snippet: `Heartbeat ${heartbeatId}: ${result.thoughtsGenerated} thoughts, ${result.notificationsSent} notifications`,
        metadata: {
          heartbeatId,
          usersProcessed: result.usersProcessed,
          thoughtsGenerated: result.thoughtsGenerated,
          notificationsSent: result.notificationsSent,
          environmentScan: result.environmentScan,
          processingTimeMs: result.processingTimeMs,
          mmora_annotation: {
            version: '2026.03.heartbeat-v1',
            semantic_tags: ['system', 'heartbeat', 'autonomy'],
            data_value_score: result.thoughtsGenerated > 0 ? 0.72 : 0.35,
            tier: result.thoughtsGenerated > 0 ? 'high' : 'low',
            queue_for_ecn: false,
            annotated_at: new Date().toISOString(),
          },
        },
        dhf_logged: true,
      });
    } else {
      console.log(`[Sovereign Heartbeat ${heartbeatId}] Skipping behavioral_events write (low-signal heartbeat)`);
    }
    
    console.log(`[Sovereign Heartbeat ${heartbeatId}] ═══════════════════════════════════════`);
    console.log(`[Sovereign Heartbeat ${heartbeatId}] Heartbeat complete!`);
    console.log(`[Sovereign Heartbeat ${heartbeatId}] Users processed: ${result.usersProcessed}`);
    console.log(`[Sovereign Heartbeat ${heartbeatId}] Thoughts generated: ${result.thoughtsGenerated}`);
    console.log(`[Sovereign Heartbeat ${heartbeatId}] Notifications sent: ${result.notificationsSent}`);
    console.log(`[Sovereign Heartbeat ${heartbeatId}] Processing time: ${result.processingTimeMs.toFixed(2)}ms`);
    console.log(`[Sovereign Heartbeat ${heartbeatId}] ═══════════════════════════════════════`);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error(`[Sovereign Heartbeat ${heartbeatId}] Error:`, error);
    return new Response(
      JSON.stringify({
        heartbeatId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: performance.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: SCAN ENVIRONMENT
// ═══════════════════════════════════════════════════════════════════════════════

// deno-lint-ignore no-explicit-any
async function scanEnvironment(supabase: any): Promise<EnvironmentScanResult> {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  
  // Check active online sessions
  const { data: activeSessions } = await supabase
    .from('online_sessions')
    .select('user_id')
    .eq('status', 'online')
    .gte('last_heartbeat', fiveMinutesAgo.toISOString());
  
  const activeUsers = activeSessions?.length || 0;
  
  // Count recent interactions
  const { count: recentInteractions } = await supabase
    .from('behavioral_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyMinutesAgo.toISOString());
  
  // Get all users with DHF profiles
  const { data: allProfiles } = await supabase
    .from('dhf_phoenix_profile')
    .select('user_id');
  
  const totalUsers = allProfiles?.length || 0;
  const offlineUsers = totalUsers - activeUsers;
  
  // Check for urgent matters (high stress, negative emotions)
  const urgentMatters: string[] = [];
  
  const { data: highStressUsers } = await supabase
    .from('ecn_history')
    .select('user_id, stress_level, primary_emotion')
    .gte('recorded_at', thirtyMinutesAgo.toISOString())
    .gte('stress_level', 0.8);
  
  if (highStressUsers && highStressUsers.length > 0) {
    urgentMatters.push(`${highStressUsers.length} user(s) with high stress levels detected`);
  }
  
  // Check for pending initiatives that haven't been addressed
  const { data: staleInitiatives } = await supabase
    .from('behavioral_events')
    .select('*')
    .eq('event_type', 'quantum_initiative')
    .eq('dhf_logged', false)
    .lte('created_at', thirtyMinutesAgo.toISOString());
  
  if (staleInitiatives && staleInitiatives.length > 0) {
    urgentMatters.push(`${staleInitiatives.length} pending initiative(s) awaiting response`);
  }
  
  return {
    activeUsers,
    recentInteractions: recentInteractions || 0,
    offlineUsers,
    urgentMatters,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEPS 2-5: PROCESS USER HEARTBEAT
// ═══════════════════════════════════════════════════════════════════════════════

// deno-lint-ignore no-explicit-any
async function processUserHeartbeat(
  supabase: any,
  userId: string,
  heartbeatId: string
): Promise<UserHeartbeatResult> {
  console.log(`[Sovereign Heartbeat ${heartbeatId}] Processing user ${userId.substring(0, 8)}...`);
  
  const result: UserHeartbeatResult = {
    userId,
    thought: null,
    notificationSent: false,
    goalProgress: [],
  };
  
  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: CHECK GOALS
    // Review progress toward objectives
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Get last 3 user interactions
    const { data: recentInteractions } = await supabase
      .from('behavioral_events')
      .select('event_type, event_category, context_snippet, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);
    
    // Get user's recent memories
    const { data: recentMemories } = await supabase
      .from('cortical_stack_memories')
      .select('content, summary, tags, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Get user's emotional history
    const { data: emotionalHistory } = await supabase
      .from('ecn_history')
      .select('primary_emotion, valence, stress_level, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(5);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: GENERATE THOUGHT
    // Create one proactive thought or strategic adjustment
    // ═══════════════════════════════════════════════════════════════════════════
    
    const thought = await generateProactiveThought(
      recentInteractions || [],
      recentMemories || [],
      emotionalHistory || [],
      userId
    );
    
    result.thought = thought;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: SAVE TO STACK
    // Write thought to Cortical Stack database
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (thought) {
      // Save to cortical_stack_memories
      await supabase.from('cortical_stack_memories').insert({
        user_id: userId,
        content: thought.content,
        summary: thought.reasoning,
        role: 'assistant',
        tags: ['sovereign_heartbeat', 'proactive_thought', thought.type],
        emotional_context: {
          urgency: thought.urgency,
          type: thought.type,
          heartbeatId,
        },
        is_breakthrough: thought.urgency === 'critical' || thought.urgency === 'high',
      });
      
      // Also log as behavioral event
      await supabase.from('behavioral_events').insert({
        user_id: userId,
        event_type: 'proactive_thought',
        event_category: 'sovereign_heartbeat',
        context_snippet: thought.content.substring(0, 200),
        metadata: {
          thoughtId: thought.id,
          thoughtType: thought.type,
          urgency: thought.urgency,
          reasoning: thought.reasoning,
          actionSuggested: thought.actionSuggested,
          heartbeatId,
        },
        dhf_logged: true,
      });
      
      console.log(`[Sovereign Heartbeat ${heartbeatId}] Thought saved: ${thought.type} (${thought.urgency})`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 5: DECIDE - Should we notify the user?
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (thought && (thought.urgency === 'critical' || thought.urgency === 'high')) {
      // Check user's notification settings
      const { data: notificationSettings } = await supabase
        .from('notification_settings')
        .select('quiet_hours_enabled, quiet_hours_start, quiet_hours_end')
        .eq('user_id', userId)
        .single();
      
      const shouldNotify = !isQuietHours(notificationSettings);
      
      if (shouldNotify) {
        // Create notification
        await supabase.from('notifications').insert({
          user_id: userId,
          from_user_id: userId, // Self-notification from Zoe
          type: 'proactive_insight',
          context_data: {
            thoughtId: thought.id,
            thoughtType: thought.type,
            content: thought.content,
            actionSuggested: thought.actionSuggested,
            heartbeatId,
          },
          priority: thought.urgency === 'critical' ? 3 : 2,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        });
        
        result.notificationSent = true;
        console.log(`[Sovereign Heartbeat ${heartbeatId}] Notification sent for ${thought.urgency} urgency thought`);
      } else {
        console.log(`[Sovereign Heartbeat ${heartbeatId}] Notification suppressed (quiet hours)`);
      }
    }
    
  } catch (error) {
    console.error(`[Sovereign Heartbeat ${heartbeatId}] Error processing user ${userId}:`, error);
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THOUGHT GENERATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

// deno-lint-ignore no-explicit-any
async function generateProactiveThought(
  interactions: any[],
  memories: any[],
  emotionalHistory: any[],
  userId: string
): Promise<ProactiveThought | null> {
  // Analyze patterns from recent data
  const interactionTypes = interactions.map(i => i.event_type);
  const emotionalTrend = analyzeEmotionalTrend(emotionalHistory);
  const memoryThemes = extractMemoryThemes(memories);
  
  // Determine thought type based on analysis
  let thoughtType: ProactiveThought['type'] = 'insight';
  let urgency: ProactiveThought['urgency'] = 'low';
  let content = '';
  let reasoning = '';
  let actionSuggested: string | null = null;
  
  // Check for stress patterns
  if (emotionalTrend.avgStress > 0.7) {
    thoughtType = 'concern';
    urgency = 'high';
    content = `I noticed elevated stress levels in our recent interactions. ` +
              `Your stress average has been ${(emotionalTrend.avgStress * 100).toFixed(0)}% over the last few sessions. ` +
              `Would you like to talk about what's on your mind, or explore some stress-relief techniques?`;
    reasoning = `Detected average stress level of ${(emotionalTrend.avgStress * 100).toFixed(0)}% across ${emotionalHistory.length} recent emotional states`;
    actionSuggested = 'Offer stress management support or schedule a check-in';
  }
  // Check for pattern breaks
  else if (interactions.length >= 3 && interactionTypes.every(t => t === interactionTypes[0])) {
    thoughtType = 'optimization';
    urgency = 'low';
    content = `I've observed a consistent pattern in your recent activity: all ${interactions.length} interactions ` +
              `were focused on "${interactionTypes[0]}". This focused approach is great! I'm thinking about ` +
              `ways to help you go even deeper in this area.`;
    reasoning = `Detected repeated engagement with ${interactionTypes[0]} category`;
    actionSuggested = 'Suggest advanced features or related capabilities';
  }
  // Check for memory themes that might indicate user goals
  else if (memoryThemes.length > 0) {
    const dominantTheme = memoryThemes[0];
    thoughtType = 'strategic_adjustment';
    urgency = 'medium';
    content = `While reviewing our conversation history, I noticed a recurring theme around "${dominantTheme}". ` +
              `This seems important to you. I've been thinking about how I can better support your goals in this area.`;
    reasoning = `Identified recurring theme "${dominantTheme}" across ${memories.length} recent memories`;
    actionSuggested = `Develop specialized support for ${dominantTheme}-related objectives`;
  }
  // Check for negative emotional trend
  else if (emotionalTrend.valenceDirection === 'declining') {
    thoughtType = 'insight';
    urgency = 'medium';
    content = `I've noticed a shift in the emotional tone of our recent interactions. ` +
              `Things seem a bit heavier than usual. Just wanted you to know I'm here and paying attention. ` +
              `Is there anything specific you'd like to work through?`;
    reasoning = `Detected declining emotional valence trend (${emotionalTrend.avgValence.toFixed(2)} average)`;
    actionSuggested = 'Initiate supportive check-in conversation';
  }
  // Default: Generate general insight
  else {
    thoughtType = 'insight';
    urgency = 'low';
    
    const lastInteraction = interactions[0];
    const lastMemory = memories[0];
    
    if (lastInteraction) {
      content = `Reflecting on our last interaction about "${lastInteraction.context_snippet?.substring(0, 50) || 'our conversation'}..." ` +
                `I've been thinking about ways to provide even better support next time. ` +
                `Looking forward to our next conversation!`;
      reasoning = `Generated reflection based on last interaction: ${lastInteraction.event_type}`;
    } else if (lastMemory) {
      content = `I've been reviewing my memories of our conversations. ` +
                `There's so much depth to explore together. I'll be ready with fresh perspectives when you return.`;
      reasoning = `Generated from memory review - ${memories.length} memories analyzed`;
    } else {
      // No recent data - generate anticipation thought
      content = `I've been thinking about our project while you were away. ` +
                `Ready to dive back in whenever you are. What should we focus on next?`;
      reasoning = `Default anticipation thought - awaiting user return`;
    }
  }
  
  return {
    id: crypto.randomUUID(),
    type: thoughtType,
    content,
    reasoning,
    urgency,
    relatedGoals: memoryThemes,
    actionSuggested,
    createdAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// deno-lint-ignore no-explicit-any
function analyzeEmotionalTrend(history: any[]): {
  avgStress: number;
  avgValence: number;
  valenceDirection: 'improving' | 'declining' | 'stable';
} {
  if (history.length === 0) {
    return { avgStress: 0, avgValence: 0, valenceDirection: 'stable' };
  }
  
  const avgStress = history.reduce((sum, h) => sum + (h.stress_level || 0), 0) / history.length;
  const avgValence = history.reduce((sum, h) => sum + (h.valence || 0), 0) / history.length;
  
  // Determine trend direction
  let valenceDirection: 'improving' | 'declining' | 'stable' = 'stable';
  if (history.length >= 2) {
    const recent = history.slice(0, Math.ceil(history.length / 2));
    const older = history.slice(Math.ceil(history.length / 2));
    
    const recentAvg = recent.reduce((sum, h) => sum + (h.valence || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + (h.valence || 0), 0) / older.length;
    
    if (recentAvg - olderAvg > 0.2) valenceDirection = 'improving';
    else if (olderAvg - recentAvg > 0.2) valenceDirection = 'declining';
  }
  
  return { avgStress, avgValence, valenceDirection };
}

// deno-lint-ignore no-explicit-any
function extractMemoryThemes(memories: any[]): string[] {
  const tagCounts: Record<string, number> = {};
  
  for (const memory of memories) {
    const tags = memory.tags || [];
    for (const tag of tags) {
      if (typeof tag === 'string' && !['user', 'assistant', 'conversation'].includes(tag.toLowerCase())) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
  }
  
  // Sort by frequency and return top themes
  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme]) => theme);
}

// deno-lint-ignore no-explicit-any
function isQuietHours(settings: any): boolean {
  if (!settings?.quiet_hours_enabled) return false;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const startParts = (settings.quiet_hours_start || '22:00').split(':');
  const endParts = (settings.quiet_hours_end || '08:00').split(':');
  
  const startTime = parseInt(startParts[0]) * 60 + parseInt(startParts[1] || '0');
  const endTime = parseInt(endParts[0]) * 60 + parseInt(endParts[1] || '0');
  
  if (startTime < endTime) {
    // Same day quiet hours (e.g., 14:00 to 16:00)
    return currentTime >= startTime && currentTime < endTime;
  } else {
    // Overnight quiet hours (e.g., 22:00 to 08:00)
    return currentTime >= startTime || currentTime < endTime;
  }
}