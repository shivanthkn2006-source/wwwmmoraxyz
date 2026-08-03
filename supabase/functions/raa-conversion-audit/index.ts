// ═══════════════════════════════════════════════════════════════════════════════
// RAA CONVERSION AUDIT - Proactive Growth Metrics Monitoring
// Runs every 12 hours to analyze conversion triggers and optimize onboarding
// ═══════════════════════════════════════════════════════════════════════════════

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";
import { 
  callAIGateway, 
  corsHeaders, 
  logTelemetry,
  createSuccessResponse,
  createErrorResponse
} from "../_shared/ai-telemetry.ts";

interface ConversionMetrics {
  totalTrialStarts: number;
  trialToConversionRate: number;
  featureGateHits: Record<string, number>;
  dropOffReasons: string[];
  topConvertingFeatures: string[];
  avgEngagementBeforeConversion: number;
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = sovereignKey();
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ═══ SECURITY: Validate admin access ═══
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();
    
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[RAA-CONV] Starting conversion audit...');

    // ═══ GATHER CONVERSION DATA (Last 12 hours) ═══
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    // Trial starts
    const { data: trialStarts, count: trialCount } = await supabase
      .from('conversion_events')
      .select('*', { count: 'exact' })
      .eq('trigger_type', 'trial_start')
      .gte('created_at', twelveHoursAgo);

    // Trial completions (conversions)
    const { count: conversionCount } = await supabase
      .from('trial_access')
      .select('*', { count: 'exact', head: true })
      .eq('converted', true)
      .gte('created_at', twelveHoursAgo);

    // Feature gate hits
    const { data: gateHits } = await supabase
      .from('zoe_sovereign_memory')
      .select('content_text')
      .eq('event_type', 'feature_gate_hit')
      .gte('created_at', twelveHoursAgo);

    // Analyze gate hits by feature
    const featureGateHits: Record<string, number> = {};
    gateHits?.forEach(hit => {
      const feature = hit.content_text?.match(/access (\w+)/)?.[1] || 'unknown';
      featureGateHits[feature] = (featureGateHits[feature] || 0) + 1;
    });

    // Get conversion trigger breakdown
    const { data: triggerBreakdown } = await supabase
      .from('conversion_events')
      .select('trigger_type, trigger_feature')
      .gte('created_at', twelveHoursAgo);

    // Calculate top converting features
    const featureConversions: Record<string, number> = {};
    triggerBreakdown?.forEach(event => {
      if (event.trigger_feature) {
        featureConversions[event.trigger_feature] = (featureConversions[event.trigger_feature] || 0) + 1;
      }
    });

    const topConvertingFeatures = Object.entries(featureConversions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([feature]) => feature);

    // Calculate engagement before conversion
    const { data: engagementData } = await supabase
      .from('behavioral_events')
      .select('user_id, created_at')
      .gte('created_at', twelveHoursAgo);

    const userEngagement: Record<string, number> = {};
    engagementData?.forEach(event => {
      userEngagement[event.user_id] = (userEngagement[event.user_id] || 0) + 1;
    });

    const avgEngagement = Object.values(userEngagement).length > 0
      ? Object.values(userEngagement).reduce((a, b) => a + b, 0) / Object.values(userEngagement).length
      : 0;

    // ═══ AI-POWERED RCA ANALYSIS ═══
    let recommendations: string[] = [];
    let dropOffReasons: string[] = [];

    if (lovableApiKey) {
      try {
        const analysisPrompt = `Analyze the following conversion data and provide actionable insights:

CONVERSION METRICS:
- Trial Starts: ${trialCount || 0}
- Conversions: ${conversionCount || 0}
- Conversion Rate: ${trialCount ? ((conversionCount || 0) / trialCount * 100).toFixed(1) : 0}%
- Avg Engagement Before Conversion: ${avgEngagement.toFixed(1)} events

FEATURE GATE HITS (users blocked at premium features):
${JSON.stringify(featureGateHits, null, 2)}

TOP CONVERTING FEATURES:
${topConvertingFeatures.join(', ') || 'No data'}

Based on this data:
1. Identify 3 likely reasons users are dropping off before converting
2. Provide 3 specific, actionable recommendations to improve conversion
3. Suggest which features should be highlighted in onboarding

Respond in JSON format:
{
  "dropOffReasons": ["reason1", "reason2", "reason3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "highlightFeatures": ["feature1", "feature2"]
}`;

        const response = await sovereignFetch('sovereign://chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'system', content: 'You are a conversion optimization expert. Provide concise, actionable insights.' },
              { role: 'user', content: analysisPrompt }
            ]
          })
        });

        // Handle rate limiting (429) and credits exhausted (402)
        if (response.status === 429) {
          console.warn('[RAA-CONV] AI rate limited, using fallback recommendations');
        } else if (response.status === 402) {
          console.warn('[RAA-CONV] AI credits exhausted, using fallback recommendations');
        } else if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const insights = JSON.parse(jsonMatch[0]);
            dropOffReasons = insights.dropOffReasons || [];
            recommendations = insights.recommendations || [];
          }
        } else {
          console.error('[RAA-CONV] AI error:', response.status);
        }
      } catch (error) {
        console.error('[RAA-CONV] AI analysis error:', error);
      }
    }

    // Fallback recommendations
    if (recommendations.length === 0) {
      recommendations = [
        'Increase visibility of trial offer for high-engagement users',
        'Simplify the Mind Merge onboarding flow',
        'Add in-app notifications for trial expiration'
      ];
      dropOffReasons = [
        'Trial offer not visible enough',
        'Premium features not clearly differentiated',
        'Onboarding friction too high'
      ];
    }

    // ═══ BUILD METRICS REPORT ═══
    const metrics: ConversionMetrics = {
      totalTrialStarts: trialCount || 0,
      trialToConversionRate: trialCount ? (conversionCount || 0) / trialCount : 0,
      featureGateHits,
      dropOffReasons,
      topConvertingFeatures,
      avgEngagementBeforeConversion: avgEngagement,
      recommendations
    };

    // ═══ LOG AUDIT TO ZSMT ═══
    await supabase.from('zoe_sovereign_memory').insert({
      user_id: user.id,
      event_type: 'raa_conversion_audit',
      content_text: `Conversion audit completed. Rate: ${(metrics.trialToConversionRate * 100).toFixed(1)}%`,
      rca_diagnosis_json: {
        audit_type: 'conversion',
        metrics,
        timestamp: new Date().toISOString()
      },
      system_stability_score: metrics.trialToConversionRate > 0.1 ? 0.95 : 0.85
    });

    const processingDuration = Date.now() - startTime;

    console.log('[RAA-CONV] Audit completed:', {
      trialStarts: metrics.totalTrialStarts,
      conversionRate: `${(metrics.trialToConversionRate * 100).toFixed(1)}%`,
      durationMs: processingDuration
    });

    return new Response(JSON.stringify({
      success: true,
      metrics,
      processingDurationMs: processingDuration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[RAA-CONV] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
