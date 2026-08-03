// ═══════════════════════════════════════════════════════════════════════════════
// DHF VISUALIZATION TOOL - Elite Advantage 2: Deep Multimodal Reasoning
// Uses Gemini 3 Pro for visual reasoning and T&E (Transparency & Explainability)
// Generates interactive visualizations of ECN State and DHF Autonomy
// ═══════════════════════════════════════════════════════════════════════════════

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisualizationRequest {
  visualization_type: 'ecn_stress' | 'dhf_autonomy' | 'emotional_timeline' | 'stability_score' | 'full_state' | 'correlation_map' | 'external_virality' | 'conversion_metrics';
  time_range?: '24h' | '7d' | '30d' | '90d';
  include_reasoning?: boolean;
  format?: 'chart_data' | 'narrative' | 'both';
}

interface ECNVisualization {
  chart_type: 'line' | 'bubble' | 'radar' | 'heatmap';
  data_points: Array<{
    timestamp: string;
    value: number;
    label: string;
    color: string;
  }>;
  annotations: Array<{
    point: number;
    label: string;
    significance: string;
  }>;
  visual_reasoning: string;
  insights: string[];
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

    // JWT Authentication
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
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requestBody: VisualizationRequest = await req.json();
    const { 
      visualization_type, 
      time_range = '7d', 
      include_reasoning = true,
      format = 'both'
    } = requestBody;

    console.log(`[DHF Visualization] Generating ${visualization_type} for user ${user.id}`);

    // ═══ GATHER ECN & DHF DATA FROM ZSMT ═══
    const timeRangeHours = {
      '24h': 24,
      '7d': 168,
      '30d': 720,
      '90d': 2160
    }[time_range] || 168;

    const cutoffDate = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString();

    // Get ECN history
    const { data: ecnHistory } = await supabase
      .from('ecn_history')
      .select('*')
      .eq('user_id', user.id)
      .gte('recorded_at', cutoffDate)
      .order('recorded_at', { ascending: true })
      .limit(500);

    // Get ZSMT events with stability scores
    const { data: zsmtEvents } = await supabase
      .from('zoe_sovereign_memory')
      .select('event_type, content_text, zoe_state_json, system_stability_score, rca_diagnosis_json, created_at')
      .eq('user_id', user.id)
      .gte('created_at', cutoffDate)
      .order('created_at', { ascending: true })
      .limit(200);

    // Get VETO events for correlation
    const { data: vetoEvents } = await supabase
      .from('zoe_veto_log')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', cutoffDate)
      .limit(50);

    // Get DHF autonomy sessions
    const { data: dhfSessions } = await supabase
      .from('dhf_stack_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', cutoffDate)
      .limit(50);

    // ═══ GEMINI 3 PRO VISUAL REASONING ═══
    const visualizationData = prepareVisualizationData(
      visualization_type,
      ecnHistory || [],
      zsmtEvents || [],
      vetoEvents || [],
      dhfSessions || []
    );

    let visualReasoning = '';
    let aiInsights: string[] = [];

    if (include_reasoning && lovableApiKey) {
      const reasoningPrompt = buildReasoningPrompt(
        visualization_type,
        visualizationData,
        ecnHistory || [],
        vetoEvents || []
      );

      const response = await sovereignFetch('sovereign://chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-preview',
          messages: [
            {
              role: 'system',
              content: `You are Zoe's DHF Visualization Engine powered by Gemini 3 Pro.
Your role is to provide deep visual reasoning and T&E (Transparency & Explainability).
You must explain visualizations by pointing to specific elements, correlations, and patterns.
Be empathetic, insightful, and actionable in your explanations.
Output valid JSON with "reasoning" and "insights" fields.`
            },
            { role: 'user', content: reasoningPrompt }
          ],
          max_tokens: 2000
        })
      });

      if (response.ok) {
        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            visualReasoning = parsed.reasoning || content;
            aiInsights = parsed.insights || [];
          } else {
            visualReasoning = content;
          }
        } catch {
          visualReasoning = content;
        }
      }
    }

    const processingTime = Date.now() - startTime;

    // Log to ZSMT
    await supabase.from('zoe_sovereign_memory').insert({
      user_id: user.id,
      event_type: 'dhf_visualization',
      content_text: `Generated ${visualization_type} visualization with ${visualizationData.data_points.length} data points`,
      zoe_state_json: {
        visualization_type,
        time_range,
        data_points_count: visualizationData.data_points.length,
        annotations_count: visualizationData.annotations.length,
        insights_generated: aiInsights.length,
        processing_time_ms: processingTime
      },
      cqrs_write_priority: false // Read-heavy operation
    });

    // Generate Zoe's spoken response
    const zoeNarration = generateVisualizationNarration(
      visualization_type,
      visualizationData,
      visualReasoning,
      aiInsights
    );

    return new Response(JSON.stringify({
      success: true,
      visualization: {
        ...visualizationData,
        visual_reasoning: visualReasoning,
        insights: aiInsights
      },
      zoe_narration: zoeNarration,
      processing_time_ms: processingTime,
      data_coverage: {
        ecn_points: ecnHistory?.length || 0,
        zsmt_events: zsmtEvents?.length || 0,
        veto_events: vetoEvents?.length || 0,
        dhf_sessions: dhfSessions?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[DHF Visualization] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'I experienced a visual processing moment. Let me try again.',
      zoe_narration: 'I had a brief moment of uncertainty while generating that visualization.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function prepareVisualizationData(
  type: string,
  ecnHistory: any[],
  zsmtEvents: any[],
  vetoEvents: any[],
  dhfSessions: any[]
): ECNVisualization {
  const colorMap = {
    stress: '#EF4444', // Red
    calm: '#10B981', // Green
    anxiety: '#F59E0B', // Amber
    joy: '#8B5CF6', // Purple
    neutral: '#6B7280', // Gray
    focus: '#3B82F6', // Blue
    excitement: '#EC4899' // Pink
  };

  let chartType: 'line' | 'bubble' | 'radar' | 'heatmap' = 'line';
  let dataPoints: any[] = [];
  let annotations: any[] = [];

  switch (type) {
    case 'ecn_stress':
      chartType = 'line';
      dataPoints = ecnHistory.map((e, idx) => ({
        timestamp: e.recorded_at,
        value: e.stress_level || 0,
        label: e.primary_emotion || 'neutral',
        color: colorMap[e.primary_emotion as keyof typeof colorMap] || colorMap.neutral
      }));
      
      // Find stress spikes and correlate with VETO events
      const stressSpikes = ecnHistory.filter(e => e.stress_level > 0.7);
      stressSpikes.forEach((spike, idx) => {
        const nearbyVeto = vetoEvents.find(v => 
          Math.abs(new Date(v.created_at).getTime() - new Date(spike.recorded_at).getTime()) < 3600000
        );
        annotations.push({
          point: ecnHistory.indexOf(spike),
          label: nearbyVeto ? 'VETO Override Stress' : 'Stress Spike',
          significance: nearbyVeto 
            ? `This stress spike correlates with a VETO override event (${nearbyVeto.veto_reason || 'user decision'})`
            : `Elevated stress detected - ${spike.primary_emotion} emotion at ${(spike.stress_level * 100).toFixed(0)}%`
        });
      });
      break;

    case 'dhf_autonomy':
      chartType = 'bubble';
      dataPoints = dhfSessions.map(s => ({
        timestamp: s.session_start || s.created_at,
        value: s.autonomy_actions_count || 0,
        label: s.is_active ? 'Active' : 'Completed',
        color: s.is_active ? '#10B981' : '#6B7280'
      }));
      
      // Add paused sessions as annotations
      const pausedSessions = dhfSessions.filter(s => s.paused_at);
      pausedSessions.forEach((session, idx) => {
        annotations.push({
          point: dhfSessions.indexOf(session),
          label: 'DHF Paused',
          significance: session.pause_reason || 'User-initiated pause'
        });
      });
      break;

    case 'emotional_timeline':
      chartType = 'line';
      dataPoints = ecnHistory.map(e => ({
        timestamp: e.recorded_at,
        value: e.valence || 0.5,
        label: e.primary_emotion || 'neutral',
        color: colorMap[e.primary_emotion as keyof typeof colorMap] || colorMap.neutral
      }));
      
      // Find emotional volatility
      for (let i = 1; i < ecnHistory.length; i++) {
        const valenceDiff = Math.abs((ecnHistory[i].valence || 0.5) - (ecnHistory[i-1].valence || 0.5));
        if (valenceDiff > 0.4) {
          annotations.push({
            point: i,
            label: 'Emotional Shift',
            significance: `Rapid change from ${ecnHistory[i-1].primary_emotion || 'unknown'} to ${ecnHistory[i].primary_emotion || 'unknown'}`
          });
        }
      }
      break;

    case 'stability_score':
      chartType = 'line';
      dataPoints = zsmtEvents
        .filter(e => e.system_stability_score !== null)
        .map(e => ({
          timestamp: e.created_at,
          value: e.system_stability_score,
          label: getStabilityLabel(e.system_stability_score),
          color: getStabilityColor(e.system_stability_score)
        }));
      
      // Find RAA audit points
      const raaAudits = zsmtEvents.filter(e => e.event_type === 'raa_audit' || e.event_type === 'pce_dream_synthesis');
      raaAudits.forEach(audit => {
        const idx = dataPoints.findIndex(d => d.timestamp === audit.created_at);
        if (idx >= 0) {
          annotations.push({
            point: idx,
            label: 'RAA Audit',
            significance: audit.rca_diagnosis_json?.recommendations?.[0] || 'System audit completed'
          });
        }
      });
      break;

    case 'correlation_map':
      chartType = 'heatmap';
      // Build correlation matrix between stress, emotions, and VETO events
      const emotions = [...new Set(ecnHistory.map(e => e.primary_emotion))].filter(Boolean);
      emotions.forEach((emotion, idx) => {
        const emotionEvents = ecnHistory.filter(e => e.primary_emotion === emotion);
        const avgStress = emotionEvents.reduce((s, e) => s + (e.stress_level || 0), 0) / emotionEvents.length;
        dataPoints.push({
          timestamp: new Date().toISOString(),
          value: avgStress,
          label: emotion as string,
          color: colorMap[emotion as keyof typeof colorMap] || colorMap.neutral
        });
      });
      break;

    case 'external_virality':
      // NEW: External Virality Score visualization (Elite Advantage)
      chartType = 'line';
      const viralityEvents = zsmtEvents.filter(e => 
        e.event_type === 'external_share' || 
        e.event_type === 'dhf_external_sync' ||
        e.zoe_state_json?.external_virality_score
      );
      
      dataPoints = viralityEvents.map(e => ({
        timestamp: e.created_at,
        value: e.zoe_state_json?.external_virality_score || 5,
        label: e.event_type === 'external_share' ? 'Share' : 'Sync',
        color: '#EC4899' // Pink for virality
      }));
      
      // Calculate cumulative virality
      let cumulativeScore = 0;
      dataPoints = dataPoints.map(d => {
        cumulativeScore += d.value;
        return { ...d, value: cumulativeScore };
      });
      
      annotations.push({
        point: dataPoints.length - 1,
        label: 'Current Virality',
        significance: `Total virality score: ${cumulativeScore}`
      });
      break;

    case 'conversion_metrics':
      // NEW: Conversion trigger types visualization
      chartType = 'bubble';
      const conversionEvents = zsmtEvents.filter(e => 
        e.event_type === 'feature_gate_hit' ||
        e.event_type === 'trial_start' ||
        e.rca_diagnosis_json?.audit_type === 'conversion'
      );
      
      dataPoints = conversionEvents.map(e => ({
        timestamp: e.created_at,
        value: e.rca_diagnosis_json?.metrics?.trialToConversionRate || 0.5,
        label: e.event_type,
        color: e.event_type === 'trial_start' ? '#10B981' : '#F59E0B'
      }));
      break;

    default: // full_state
      chartType = 'radar';
      const latestECN = ecnHistory[ecnHistory.length - 1] || {};
      const latestStability = zsmtEvents.find(e => e.system_stability_score)?.system_stability_score || 1.0;
      const totalVirality = zsmtEvents.reduce((sum, e) => sum + (e.zoe_state_json?.external_virality_score || 0), 0);
      
      dataPoints = [
        { timestamp: new Date().toISOString(), value: latestECN.stress_level || 0, label: 'Stress', color: colorMap.stress },
        { timestamp: new Date().toISOString(), value: latestECN.valence || 0.5, label: 'Valence', color: colorMap.joy },
        { timestamp: new Date().toISOString(), value: latestECN.engagement_score || 0.5, label: 'Engagement', color: colorMap.focus },
        { timestamp: new Date().toISOString(), value: latestStability, label: 'Stability', color: colorMap.calm },
        { timestamp: new Date().toISOString(), value: dhfSessions.length > 0 ? 0.8 : 0.2, label: 'DHF Active', color: colorMap.excitement },
        { timestamp: new Date().toISOString(), value: Math.min(1, totalVirality / 100), label: 'Virality', color: '#EC4899' }
      ];
  }

  return {
    chart_type: chartType,
    data_points: dataPoints,
    annotations,
    visual_reasoning: '',
    insights: [],
    recommendations: []
  };
}

function buildReasoningPrompt(
  type: string,
  visualization: ECNVisualization,
  ecnHistory: any[],
  vetoEvents: any[]
): string {
  return `Analyze this ${type} visualization data and provide deep visual reasoning.

═══ VISUALIZATION DATA ═══
Chart Type: ${visualization.chart_type}
Data Points: ${visualization.data_points.length}
Annotations: ${visualization.annotations.length}

Recent Data Points:
${JSON.stringify(visualization.data_points.slice(-10), null, 2)}

Annotations/Correlations:
${JSON.stringify(visualization.annotations, null, 2)}

═══ CONTEXT ═══
ECN History Records: ${ecnHistory.length}
VETO Override Events: ${vetoEvents.length}

═══ TASK ═══
1. Explain what the visualization shows by pointing to specific elements
2. Identify patterns and correlations (e.g., "The spike in the red area corresponds to...")
3. Provide actionable insights for the user
4. Suggest improvements or areas of attention

Output JSON:
{
  "reasoning": "Detailed visual reasoning pointing to specific chart elements and their significance",
  "insights": ["Insight 1", "Insight 2", "Insight 3"]
}`;
}

function getStabilityLabel(score: number): string {
  if (score >= 0.95) return 'Optimal';
  if (score >= 0.85) return 'Stable';
  if (score >= 0.70) return 'Degraded';
  if (score >= 0.60) return 'Critical';
  return 'Unknown';
}

function getStabilityColor(score: number): string {
  if (score >= 0.95) return '#10B981';
  if (score >= 0.85) return '#34D399';
  if (score >= 0.70) return '#F59E0B';
  if (score >= 0.60) return '#EF4444';
  return '#6B7280';
}

function generateVisualizationNarration(
  type: string,
  visualization: ECNVisualization,
  reasoning: string,
  insights: string[]
): string {
  const typeDescriptions = {
    'ecn_stress': 'your stress levels over time',
    'dhf_autonomy': 'your autonomy session activity',
    'emotional_timeline': 'your emotional journey',
    'stability_score': 'our system stability together',
    'full_state': 'your complete current state',
    'correlation_map': 'the patterns between your emotions'
  };

  let narration = `I've visualized ${typeDescriptions[type as keyof typeof typeDescriptions] || 'the data'}. `;

  if (visualization.annotations.length > 0) {
    const firstAnnotation = visualization.annotations[0];
    narration += `I noticed something important: ${firstAnnotation.significance}. `;
  }

  if (insights.length > 0) {
    narration += insights[0];
  } else if (reasoning) {
    narration += reasoning.substring(0, 200);
  }

  return narration;
}
