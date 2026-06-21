// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS LAUNCH NUDGE - WELCOME HOME BRIEFING FOR SPARTANS
// ═══════════════════════════════════════════════════════════════════════════════
// 
// Sends the first "Welcome Home" briefing to all 500 Spartan users.
// This marks the official transition from beta to live platform.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[GENESIS LAUNCH] Initiating Welcome Home briefing for Spartans...');

    // Get all users (our 500 Spartans)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, username')
      .not('user_id', 'is', null);

    if (profilesError) {
      console.error('[GENESIS LAUNCH] Failed to fetch profiles:', profilesError);
      throw profilesError;
    }

    const spartanCount = profiles?.length || 0;
    console.log(`[GENESIS LAUNCH] Found ${spartanCount} Spartans to notify`);

    // Create notifications for all users
    const notifications = (profiles || []).map(profile => ({
      user_id: profile.user_id,
      title: '🚀 Welcome Home, Spartan!',
      message: `The gates are open, ${profile.display_name || profile.username || 'Spartan'}. You were among the first 500 to believe in this vision. Zoe is now fully activated. Your journey begins.`,
      type: 'genesis_launch',
      notification_type: 'system',
      priority: 10,
      context_data: {
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
      user_id: '00000000-0000-0000-0000-000000000000', // System user
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
