/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE GENESIS CRON - BATCH PROCESSOR (500 SPARTANS PROTOCOL)
 * 
 * CRASH POINT B MITIGATION: Batch processing within 10s timeout
 * 
 * Instead of processing all users in one call (which times out for 500+ users),
 * this version processes users in small batches per invocation.
 * 
 * Strategy:
 * - Process MAX 10 users per invocation (fits within 10s timeout)
 * - Use cursor-based pagination to track progress
 * - Cron calls this every minute, processes next batch
 * - Full cycle completes in ~50 minutes for 500 users
 * 
 * SOVEREIGNTY: ACTIVE | BATCH MODE: ENABLED
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH_CONFIG = {
  // Max users to process per invocation (stay well within 10s timeout)
  USERS_PER_BATCH: 10,
  
  // Min hours between miracles for same user
  MIN_HOURS_BETWEEN_MIRACLES: 20,
  
  // Max DB queries per user (budget for 10s)
  MAX_QUERIES_PER_USER: 4,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type MiracleType = 
  | 'PROACTIVE_OPTIMIZATION' 
  | 'EMOTIONAL_INTERVENTION' 
  | 'FINANCIAL_PROTECTION' 
  | 'HEALTH_NUDGE' 
  | 'SOCIAL_REPAIR' 
  | 'EFFICIENCY_BOOST';

interface BatchCursor {
  lastProcessedUserId: string | null;
  batchNumber: number;
  totalProcessed: number;
  cycleStartedAt: string;
}

interface MiracleSummary {
  userId: string;
  miracleType: MiracleType;
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIRACLE TEMPLATES (Condensed for batch processing)
// ═══════════════════════════════════════════════════════════════════════════════

const MIRACLE_TEMPLATES: Record<MiracleType, { descriptions: string[]; reasons: string[] }> = {
  PROACTIVE_OPTIMIZATION: {
    descriptions: ['Optimized your system performance by 15%.', 'Cleared workflow inefficiencies.'],
    reasons: ['Performance degradation detected.', 'Efficiency metrics need improvement.'],
  },
  EMOTIONAL_INTERVENTION: {
    descriptions: ['Consider reaching out to loved ones today.', 'Prepared calming recommendations for you.'],
    reasons: ['Social connection frequency dropped.', 'Stress patterns elevated.'],
  },
  FINANCIAL_PROTECTION: {
    descriptions: ['Flagged potential savings of $50+/month.', 'Found subscription redundancies.'],
    reasons: ['Spending pattern optimization available.', 'Unused services detected.'],
  },
  HEALTH_NUDGE: {
    descriptions: ['Recommend extra rest tonight.', 'A movement break would benefit you.'],
    reasons: ['Sleep quality degraded.', 'Sedentary behavior exceeded thresholds.'],
  },
  SOCIAL_REPAIR: {
    descriptions: ['Someone important might appreciate hearing from you.', 'A conversation needs follow-up.'],
    reasons: ['Important relationship contact gap.', 'Unresolved sentiment detected.'],
  },
  EFFICIENCY_BOOST: {
    descriptions: ['Pre-analyzed your patterns for faster response.', 'Automated a repetitive task.'],
    reasons: ['Pattern recognition found automation opportunity.', 'Task repetition detected.'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH CURSOR MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

async function getCursor(supabase: any): Promise<BatchCursor> {
  const { data } = await supabase
    .from('zoe_sovereign_memory')
    .select('zoe_state_json')
    .eq('event_type', 'genesis_batch_cursor')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (data?.[0]?.zoe_state_json) {
    const cursor = data[0].zoe_state_json as BatchCursor;
    
    // Check if cycle is stale (> 2 hours old) - restart
    const cycleAge = Date.now() - new Date(cursor.cycleStartedAt).getTime();
    if (cycleAge > 2 * 60 * 60 * 1000) {
      return {
        lastProcessedUserId: null,
        batchNumber: 0,
        totalProcessed: 0,
        cycleStartedAt: new Date().toISOString(),
      };
    }
    
    return cursor;
  }
  
  return {
    lastProcessedUserId: null,
    batchNumber: 0,
    totalProcessed: 0,
    cycleStartedAt: new Date().toISOString(),
  };
}

async function saveCursor(supabase: any, cursor: BatchCursor): Promise<void> {
  await supabase.from('zoe_sovereign_memory').insert({
    user_id: '00000000-0000-0000-0000-000000000000', // System user
    event_type: 'genesis_batch_cursor',
    content_text: `Batch ${cursor.batchNumber}: Processed ${cursor.totalProcessed} users`,
    zoe_state_json: cursor,
    importance_score: 10,
    cqrs_write_priority: true,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED BATCH PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════

async function getNextBatchUsers(supabase: any, cursor: BatchCursor): Promise<{ user_id: string }[]> {
  let query = supabase
    .from('profiles')
    .select('user_id')
    .order('user_id', { ascending: true })
    .limit(BATCH_CONFIG.USERS_PER_BATCH);
  
  if (cursor.lastProcessedUserId) {
    query = query.gt('user_id', cursor.lastProcessedUserId);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('[GENESIS-BATCH] Error fetching users:', error);
    return [];
  }
  
  return data || [];
}

async function processUserBatch(
  supabase: any, 
  users: { user_id: string }[]
): Promise<MiracleSummary[]> {
  const miracles: MiracleSummary[] = [];
  const now = Date.now();
  const minHoursMs = BATCH_CONFIG.MIN_HOURS_BETWEEN_MIRACLES * 60 * 60 * 1000;
  
  // Batch fetch last miracle times for all users in ONE query
  const userIds = users.map(u => u.user_id);
  const { data: lastMiracles } = await supabase
    .from('zoe_sovereign_memory')
    .select('user_id, created_at')
    .in('user_id', userIds)
    .eq('event_type', 'genesis_miracle')
    .order('created_at', { ascending: false });
  
  // Build lookup map
  const lastMiracleMap = new Map<string, Date>();
  for (const m of lastMiracles || []) {
    if (!lastMiracleMap.has(m.user_id)) {
      lastMiracleMap.set(m.user_id, new Date(m.created_at));
    }
  }
  
  // Batch fetch stress data for all users in ONE query
  const { data: stressData } = await supabase
    .from('ecn_history')
    .select('user_id, stress_level')
    .in('user_id', userIds)
    .order('recorded_at', { ascending: false })
    .limit(userIds.length); // One per user approx
  
  const stressMap = new Map<string, number>();
  for (const s of stressData || []) {
    if (!stressMap.has(s.user_id)) {
      stressMap.set(s.user_id, s.stress_level || 30);
    }
  }
  
  // Process each eligible user
  const insertPromises: Promise<any>[] = [];
  
  for (const user of users) {
    // Check if eligible (not too recently miracled)
    const lastMiracle = lastMiracleMap.get(user.user_id);
    if (lastMiracle && now - lastMiracle.getTime() < minHoursMs) {
      continue; // Skip - too soon
    }
    
    // Decide miracle type based on stress
    const stress = stressMap.get(user.user_id) || 30;
    const miracleType: MiracleType = stress > 60 ? 'HEALTH_NUDGE' : 'EFFICIENCY_BOOST';
    
    const template = MIRACLE_TEMPLATES[miracleType];
    const description = template.descriptions[Math.floor(Math.random() * template.descriptions.length)];
    const reason = template.reasons[Math.floor(Math.random() * template.reasons.length)];
    
    miracles.push({ userId: user.user_id, miracleType, description });
    
    // Queue inserts (will be batched)
    const miracleId = `miracle_batch_${Date.now()}_${user.user_id.slice(0, 8)}`;
    
    insertPromises.push(
      supabase.from('zoe_sovereign_memory').insert({
        user_id: user.user_id,
        event_type: 'genesis_miracle',
        content_text: description,
        zoe_state_json: {
          miracle_id: miracleId,
          miracle_type: miracleType,
          reason,
          server_executed: true,
          batch_processed: true,
        },
        importance_score: 80,
        cqrs_write_priority: true,
      })
    );
    
    insertPromises.push(
      supabase.from('notifications').insert({
        user_id: user.user_id,
        from_user_id: user.user_id,
        type: 'genesis_miracle',
        priority: 2,
        context_data: {
          miracle_id: miracleId,
          miracle_type: miracleType,
          description,
          zoe_message: `🌟 ${description}`,
        },
        read: false,
      })
    );
  }
  
  // Execute all inserts in parallel
  await Promise.allSettled(insertPromises);
  
  return miracles;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    console.log('[GENESIS-BATCH] ⚡ Batch processor triggered');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get current cursor
    const cursor = await getCursor(supabase);
    console.log(`[GENESIS-BATCH] Batch #${cursor.batchNumber + 1}, last user: ${cursor.lastProcessedUserId || 'START'}`);
    
    // Get next batch of users
    const users = await getNextBatchUsers(supabase, cursor);
    
    if (users.length === 0) {
      // Cycle complete - reset cursor
      console.log('[GENESIS-BATCH] ✅ Cycle complete! Processed', cursor.totalProcessed, 'users total');
      
      await saveCursor(supabase, {
        lastProcessedUserId: null,
        batchNumber: 0,
        totalProcessed: 0,
        cycleStartedAt: new Date().toISOString(),
      });
      
      return new Response(JSON.stringify({
        success: true,
        message: `Cycle complete. Processed ${cursor.totalProcessed} users.`,
        cycleComplete: true,
        duration: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Process batch
    const miracles = await processUserBatch(supabase, users);
    
    // Update cursor
    const newCursor: BatchCursor = {
      lastProcessedUserId: users[users.length - 1].user_id,
      batchNumber: cursor.batchNumber + 1,
      totalProcessed: cursor.totalProcessed + users.length,
      cycleStartedAt: cursor.cycleStartedAt,
    };
    
    await saveCursor(supabase, newCursor);
    
    const duration = Date.now() - startTime;
    console.log(`[GENESIS-BATCH] ✅ Batch #${newCursor.batchNumber} complete: ${users.length} users, ${miracles.length} miracles in ${duration}ms`);
    
    return new Response(JSON.stringify({
      success: true,
      batch: newCursor.batchNumber,
      usersProcessed: users.length,
      miraclesExecuted: miracles.length,
      totalProcessed: newCursor.totalProcessed,
      duration,
      withinTimeout: duration < 9000, // Warn if close to 10s
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[GENESIS-BATCH] ❌ Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
