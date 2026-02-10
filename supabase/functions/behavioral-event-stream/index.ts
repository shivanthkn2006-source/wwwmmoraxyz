// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIORAL STREAM PRODUCER - Unified Event Sourcing for DHF & ECN
// Zero-Friction Adaptive Learning System
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BehavioralEvent {
  event_type: string;
  event_category: string;
  context_snippet?: string;
  metadata?: Record<string, any>;
  session_id?: string;
  sentiment_score?: number;
}

interface BatchEventRequest {
  events: BehavioralEvent[];
  process_ecn?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    // Gracefully handle missing auth - return success but skip processing
    if (!authHeader) {
      console.log('[Behavioral Stream] No auth header - skipping (anonymous request)');
      return new Response(JSON.stringify({ 
        success: true, 
        events_processed: 0,
        skipped: true,
        reason: 'anonymous_request'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT - handle invalid tokens gracefully
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log('[Behavioral Stream] Invalid/expired token - skipping');
      return new Response(JSON.stringify({ 
        success: true, 
        events_processed: 0,
        skipped: true,
        reason: 'invalid_session'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { events, process_ecn = true }: BatchEventRequest = await req.json();

    if (!events || !Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ error: 'No events provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Behavioral Stream] Processing ${events.length} events for user ${user.id}`);

    // Prepare events with user_id and truncated context_snippet (max 50 chars)
    const preparedEvents = events.map(event => ({
      user_id: user.id,
      event_type: event.event_type,
      event_category: event.event_category,
      context_snippet: event.context_snippet?.substring(0, 50) || null,
      metadata: event.metadata || {},
      session_id: event.session_id || null,
      sentiment_score: event.sentiment_score || null,
      ecn_processed: false,
      dhf_logged: false,
    }));

    // Batch insert behavioral events
    const { data: insertedEvents, error: insertError } = await supabase
      .from('behavioral_events')
      .insert(preparedEvents)
      .select('id');

    if (insertError) {
      console.error('[Behavioral Stream] Insert error:', insertError);
      throw insertError;
    }

    console.log(`[Behavioral Stream] Inserted ${insertedEvents?.length} events`);

    // Also log to DHF asset logs for long-term memory
    // Use 'completed' status which is in the allowed check constraint values
    const dhfLogs = events.map(event => ({
      user_id: user.id,
      file_url: `event://${event.event_type}/${Date.now()}`,
      data_type: 'behavioral_event',
      dhf_stack_hash: `${user.id}-${event.event_type}-${Date.now()}`,
      content_summary: event.context_snippet?.substring(0, 50) || event.event_type,
      extracted_entities: event.metadata || {},
      sensitivity_level: 'low',
      processing_status: 'completed', // Must be: pending, processing, completed, or failed
    }));

    const { error: dhfError } = await supabase
      .from('dhf_asset_logs')
      .insert(dhfLogs);

    if (dhfError) {
      console.error('[Behavioral Stream] DHF logging error:', dhfError);
      // Non-fatal - continue processing
    }

    // Queue for ECN analysis if requested and batch size warrants it
    if (process_ecn && events.length >= 5) {
      const { error: queueError } = await supabase
        .from('ecn_analysis_queue')
        .insert({
          user_id: user.id,
          events_batch: preparedEvents,
          status: 'pending',
          model_used: 'gemini-2.5-flash-lite',
          processing_cost_estimate: events.length * 0.001, // Estimated cost per event
        });

      if (queueError) {
        console.error('[Behavioral Stream] ECN queue error:', queueError);
      }
    }

    // Get current sync status
    const { data: settings } = await supabase
      .from('zoe_settings')
      .select('event_count, sync_percentage, finetuning_ready')
      .eq('user_id', user.id)
      .single();

    return new Response(JSON.stringify({
      success: true,
      events_processed: insertedEvents?.length || 0,
      sync_status: {
        event_count: settings?.event_count || 0,
        sync_percentage: settings?.sync_percentage || 0,
        finetuning_ready: settings?.finetuning_ready || false,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Behavioral Stream] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});