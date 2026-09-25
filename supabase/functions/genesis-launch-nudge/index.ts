import { requireCaller } from '../_shared/caller-guard.ts';
// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS LAUNCH NUDGE - WELCOME HOME BRIEFING FOR SPARTANS
// ═══════════════════════════════════════════════════════════════════════════════
// 
// Sends the first "Welcome Home" briefing to all 500 Spartan users.
// This marks the official transition from beta to live platform.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { publicGuard } from '../_shared/public-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const caller = await requireCaller(req, 'member');
  if (caller instanceof Response) return caller;

  const guard = await publicGuard(req, { name: 'genesis-launch-nudge', limit: 10, windowSeconds: 300, maxBodyBytes: 512 * 1024, allowRichText: true });
  if (guard.response) return guard.response;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[GENESIS LAUNCH] Initiating Welcome Home briefing for Spartans...');

    // Get all users (our 500 Spartans)
    // Admins/server broadcast to everyone. Members may only notify their own
    // accepted friends; each notification row belongs to its recipient alone.
    const isBroadcaster = caller.kind === 'service' || caller.isAdmin;
    let query = supabase.from('profiles').select('user_id, display_name, username').not('user_id', 'is', null);
    if (!isBroadcaster) {
      const me = (caller as { userId: string }).userId;
      const { data: fr } = await supabase.from('friendships').select('user1_id, user2_id')
        .or(`user1_id.eq.${me},user2_id.eq.${me}`).limit(200);
      const ids = [...new Set((fr || []).map((f) => f.user1_id === me ? f.user2_id : f.user1_id))].filter((id) => id && id !== me).slice(0, 50);
      if (ids.length === 0) {
        return new Response(JSON.stringify({ success: true, stats: { spartans_count: 0, notifications_sent: 0 } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      query = query.in('user_id', ids);
    }
    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
      console.error('[GENESIS LAUNCH] Failed to fetch profiles:', profilesError);
      throw profilesError;
    }

    const spartanCount = profiles?.length || 0;
    console.log(`[GENESIS LAUNCH] Found ${spartanCount} Spartans to notify`);

    // Create notifications for all users
    const senderId = caller.kind === 'member' ? caller.userId : null;
    const notifications = (profiles || []).map(profile => ({
      user_id: profile.user_id,
      from_user_id: senderId ?? profile.user_id,
      type: 'admin_notice',
      priority: 10,
      context_data: {
        title: '🚀 Welcome Home, Spartan!',
        message: `The gates are open, ${profile.display_name || profile.username || 'Spartan'}. You were among the first 500 to believe in this vision. Zoe is now fully activated. Your journey begins.`,
        notification_type: 'system',
        launch_type: 'genesis',
        spartan_number: spartanCount,
        launched_at: new Date().toISOString(),
        is_founder: true,
      },
    }));

    // Insert notifications in batches
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(batch);

      if (insertError) {
        console.error(`[GENESIS LAUNCH] Batch ${i / batchSize + 1} failed:`, insertError);
      } else {
        inserted += batch.length;
        console.log(`[GENESIS LAUNCH] Batch ${i / batchSize + 1} complete: ${inserted}/${notifications.length}`);
      }
    }

    // Log the genesis event
    await supabase.from('behavioral_events').insert({
      user_id: caller.kind === 'member' ? caller.userId : '00000000-0000-0000-0000-000000000000',
      event_type: 'genesis_launch_executed',
      event_category: 'platform_milestone',
      context_snippet: `Genesis Launch executed. ${inserted} Spartans notified.`,
      metadata: {
        spartans_count: spartanCount,
        notifications_sent: inserted,
        launched_at: new Date().toISOString(),
      },
      dhf_logged: true,
    });

    console.log('[GENESIS LAUNCH] ✓ Welcome Home briefing complete!');
    console.log(`[GENESIS LAUNCH] ${inserted} Spartans received their Welcome Home notification`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Genesis Launch complete. Welcome Home, Spartans.',
      stats: {
        spartans_count: spartanCount,
        notifications_sent: inserted,
        launched_at: new Date().toISOString(),
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[GENESIS LAUNCH] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
