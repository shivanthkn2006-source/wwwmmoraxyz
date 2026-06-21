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

interface AnnotationPayload {
  version: string;
  semantic_tags: string[];
  emotional_weight: number;
  data_value_score: number;
  tier: 'high' | 'medium' | 'low';
  queue_for_ecn: boolean;
  needs_user_validation: boolean;
  annotated_at: string;
}

interface BatchEventRequest {
  events: BehavioralEvent[];
  process_ecn?: boolean;
}

const ANNOTATION_VERSION = '2026.03.edge-v1';
const HIGH_SIGNAL_CATEGORIES = new Set([
  'voice_interaction',
  'biometric_input',
  'emotional_computation',
  'security_violation',
  'chat',
  'response',
  'vr_activity',
]);

const LOW_SIGNAL_EVENT_TYPES = new Set([
  'sovereign_heartbeat',
  'dhf_health_sync',
  'self_heal_scan',
  'background_harvest',
  'memory_cleanup',
]);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function inferSemanticTags(event: BehavioralEvent): string[] {
  const source = `${event.event_type} ${event.event_category} ${event.context_snippet ?? ''}`.toLowerCase();
  const tags = new Set<string>();

  if (/voice|mic|audio|speech|transcribe/.test(source)) tags.add('voice');
  if (/face|emotion|sentiment|mood|feeling|ecn/.test(source)) tags.add('emotion');
  if (/vr|avatar|bike|vehicle|teleport|world|camera/.test(source)) tags.add('vr');
  if (/security|intrusion|attack|violation|lockdown|threat/.test(source)) tags.add('security');
  if (/chat|conversation|reply|message|prompt/.test(source)) tags.add('conversation');
  if (/payment|billing|credit|subscription|purchase/.test(source)) tags.add('monetization');
  if (/error|fail|exception|timeout|degraded/.test(source)) tags.add('incident');
  if (/profile|identity|behavior|fingerprint|dhf/.test(source)) tags.add('identity');

  if (tags.size === 0) tags.add('general');
  return [...tags].slice(0, 6);
}

function computeEmotionalWeight(sentimentScore: number | undefined, tags: string[]): number {
  const sentimentDistance = typeof sentimentScore === 'number'
    ? Math.abs(clamp(sentimentScore, 0, 1) - 0.5) * 2
    : 0.25;

  let boost = 0;
  if (tags.includes('emotion')) boost += 0.2;
  if (tags.includes('security')) boost += 0.15;
  if (tags.includes('incident')) boost += 0.1;

  return Number(clamp(sentimentDistance + boost, 0, 1).toFixed(3));
}

function computeDataValueScore(event: BehavioralEvent, tags: string[]): number {
  let score = 0.2;
  const category = (event.event_category || '').toLowerCase();
  const type = (event.event_type || '').toLowerCase();
  const contextLength = (event.context_snippet || '').trim().length;

  if (HIGH_SIGNAL_CATEGORIES.has(category)) score += 0.35;
  if (LOW_SIGNAL_EVENT_TYPES.has(type)) score -= 0.25;
  if (contextLength >= 20) score += 0.15;
  if (contextLength >= 60) score += 0.1;
  if (tags.includes('security')) score += 0.2;
  if (tags.includes('conversation')) score += 0.1;
  if (tags.includes('emotion')) score += 0.1;

  return Number(clamp(score, 0, 1).toFixed(3));
}

function buildAnnotation(event: BehavioralEvent): AnnotationPayload {
  const semanticTags = inferSemanticTags(event);
  const emotionalWeight = computeEmotionalWeight(event.sentiment_score, semanticTags);
  const dataValueScore = computeDataValueScore(event, semanticTags);
  const isLowSignalEvent = LOW_SIGNAL_EVENT_TYPES.has((event.event_type || '').toLowerCase());
  const queueForEcn = !isLowSignalEvent && (dataValueScore >= 0.55 || emotionalWeight >= 0.6);

  return {
    version: ANNOTATION_VERSION,
    semantic_tags: semanticTags,
    emotional_weight: emotionalWeight,
    data_value_score: dataValueScore,
    tier: dataValueScore >= 0.75 ? 'high' : dataValueScore >= 0.45 ? 'medium' : 'low',
    queue_for_ecn: queueForEcn,
    needs_user_validation: semanticTags.includes('security') || dataValueScore >= 0.85,
    annotated_at: new Date().toISOString(),
  };
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

    // Prepare events with deterministic edge annotation and normalized metadata
    const preparedEvents = events.map(event => ({
      user_id: user.id,
      event_type: (event.event_type || 'unknown_event').trim().slice(0, 80),
      event_category: (event.event_category || 'uncategorized').trim().slice(0, 80),
      context_snippet: event.context_snippet?.substring(0, 120) || null,
      metadata: {
        ...(event.metadata || {}),
        mmora_annotation: buildAnnotation(event),
      },
      session_id: event.session_id || null,
      sentiment_score: typeof event.sentiment_score === 'number'
        ? clamp(event.sentiment_score, 0, 1)
        : null,
      ecn_processed: false,
      dhf_logged: false,
    }));

    // Batch insert behavioral events
    const { data: insertedEvents, error: insertError } = await supabase
      .from('behavioral_events')
      .insert(preparedEvents)
      .select('id, event_type, event_category, context_snippet, metadata, session_id, sentiment_score');

    if (insertError) {
      console.error('[Behavioral Stream] Insert error:', insertError);
      throw insertError;
    }

    console.log(`[Behavioral Stream] Inserted ${insertedEvents?.length} events`);

    // Also log to DHF asset logs for long-term memory
    // Use 'completed' status which is in the allowed check constraint values
    const dhfLogs = (insertedEvents || []).map((event: any, index: number) => ({
      user_id: user.id,
      file_url: `event://${event.event_type}/${Date.now()}-${index}`,
      data_type: 'behavioral_event',
      dhf_stack_hash: `${user.id}-${event.event_type}-${Date.now()}-${index}`,
      content_summary: event.context_snippet?.substring(0, 80) || event.event_type,
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
    } else if (insertedEvents && insertedEvents.length > 0) {
      const insertedIds = insertedEvents.map((event: any) => event.id);
      const { error: dhfMarkError } = await supabase
        .from('behavioral_events')
        .update({ dhf_logged: true })
        .in('id', insertedIds);

      if (dhfMarkError) {
        console.error('[Behavioral Stream] Failed to mark dhf_logged=true:', dhfMarkError);
      }
    }

    // Queue only high-value events for ECN analysis and merge with recent pending batch to avoid queue bloat
    const queueCandidates = (insertedEvents || []).filter((event: any) => {
      const annotation = event?.metadata?.mmora_annotation;
      return Boolean(annotation?.queue_for_ecn);
    });

    let queueAction: 'inserted' | 'merged' | 'skipped' = 'skipped';

    if (process_ecn && queueCandidates.length >= 3) {
      const mergeWindowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: existingPending } = await supabase
        .from('ecn_analysis_queue')
        .select('id, events_batch, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPending && existingPending.created_at && existingPending.created_at >= mergeWindowStart) {
        const existingBatch = Array.isArray(existingPending.events_batch)
          ? existingPending.events_batch
          : [];
        const mergedBatch = [...existingBatch, ...queueCandidates].slice(-60);

        const { error: mergeError } = await supabase
          .from('ecn_analysis_queue')
          .update({
            events_batch: mergedBatch,
            model_used: 'gemini-2.5-flash-lite',
            processing_cost_estimate: mergedBatch.length * 0.001,
          })
          .eq('id', existingPending.id);

        if (mergeError) {
          console.error('[Behavioral Stream] ECN merge error:', mergeError);
        } else {
          queueAction = 'merged';
        }
      } else {
        const { error: queueError } = await supabase
          .from('ecn_analysis_queue')
          .insert({
            user_id: user.id,
            events_batch: queueCandidates,
            status: 'pending',
            model_used: 'gemini-2.5-flash-lite',
            processing_cost_estimate: queueCandidates.length * 0.001,
          });

        if (queueError) {
          console.error('[Behavioral Stream] ECN queue error:', queueError);
        } else {
          queueAction = 'inserted';
        }
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
      ecn_candidates: queueCandidates.length,
      ecn_queue_action: queueAction,
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
      error: 'An internal error occurred processing your request.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});