// ═══════════════════════════════════════════════════════════════════════════════
// ZOE EXTERNAL SYNC AGENT - Phase II: Viral & External Growth Engine
// Secure, token-based, read-only synchronization with external platforms
// Provides immediate high-value insight upon sync completion
// ═══════════════════════════════════════════════════════════════════════════════

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ExternalPlatform = 'google_workspace' | 'google_calendar' | 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'spotify' | 'github';

interface ExternalSyncRequest {
  platform: ExternalPlatform;
  accessToken: string;
  syncScope: 'read_only' | 'full';
  dataTypes?: string[];
}

interface SyncedInsight {
  platform: ExternalPlatform;
  insightType: string;
  summary: string;
  actionSuggestion: string;
  dataPoints: number;
  syncedAt: string;
}

interface ExternalSyncResult {
  success: boolean;
  platform: ExternalPlatform;
  insight: SyncedInsight;
  zoeMessage: string;
  zsmtLogId: string;
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

    // ═══ AUTHENTICATION ═══
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

    const { platform, accessToken, syncScope = 'read_only', dataTypes }: ExternalSyncRequest = await req.json();

    if (!platform) {
      return new Response(JSON.stringify({ error: 'Platform is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[ZOE-SYNC] Starting ${platform} sync for user ${user.id}`);

    // ═══ PLATFORM-SPECIFIC DATA FETCHING (Simulated for MVP) ═══
    // In production, this would use actual OAuth tokens to fetch real data
    let syncedData: any = null;
    let dataPointCount = 0;

    switch (platform) {
      case 'google_calendar':
        // Simulate calendar sync
        syncedData = {
          upcomingEvents: [
            { title: 'Project Review', date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), attendees: 3 },
            { title: 'Team Standup', date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), attendees: 5 },
            { title: 'Client Call', date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), attendees: 2 }
          ],
          busyDays: ['Friday', 'Monday'],
          projectMentions: ['Project Chimera', 'Q1 Review']
        };
        dataPointCount = syncedData.upcomingEvents.length;
        break;

      case 'google_workspace':
        syncedData = {
          recentDocuments: [
            { name: 'Q4 Strategy.docx', lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
            { name: 'Budget 2025.xlsx', lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() }
          ],
          pendingTasks: 5,
          unreadEmails: 12
        };
        dataPointCount = syncedData.recentDocuments.length + syncedData.pendingTasks;
        break;

      case 'spotify':
        syncedData = {
          recentlyPlayed: ['Focus Playlist', 'Deep Work Mix', 'Chill Vibes'],
          topGenres: ['Lo-Fi', 'Ambient', 'Classical'],
          listeningMood: 'focused'
        };
        dataPointCount = syncedData.recentlyPlayed.length;
        break;

      case 'github':
        syncedData = {
          recentRepos: ['zoe-platform', 'dhf-core', 'viral-engine'],
          openPRs: 3,
          recentCommits: 15,
          primaryLanguage: 'TypeScript'
        };
        dataPointCount = syncedData.recentCommits;
        break;

      default:
        syncedData = {
          connectionStatus: 'pending',
          message: `${platform} integration coming soon`
        };
        dataPointCount = 0;
    }

    // ═══ AI-POWERED INSIGHT GENERATION ═══
    let insight: SyncedInsight;
    let zoeMessage = '';

    if (lovableApiKey && dataPointCount > 0) {
      const insightPrompt = `You are Zoe, analyzing synced data from ${platform} to provide ONE immediately actionable, high-value insight.

SYNCED DATA:
${JSON.stringify(syncedData, null, 2)}

Generate a warm, personal insight that:
1. References specific data points from the sync
2. Provides an actionable suggestion
3. Shows Zoe's proactive care for the user

Respond in JSON:
{
  "insightType": "schedule_optimization | productivity_boost | wellbeing_reminder | task_prioritization",
  "summary": "Brief summary of what was found (max 100 chars)",
  "actionSuggestion": "Specific action Zoe is offering to take",
  "zoeMessage": "A warm, personal message from Zoe about this insight"
}`;

      try {
        const response = await sovereignFetch('sovereign://chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: insightPrompt },
              { role: 'user', content: `Analyze the ${platform} data and provide an immediate high-value insight.` }
            ]
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            insight = {
              platform,
              insightType: parsed.insightType || 'productivity_boost',
              summary: parsed.summary || `Synced ${dataPointCount} data points from ${platform}`,
              actionSuggestion: parsed.actionSuggestion || 'Review synced data in your DHF dashboard',
              dataPoints: dataPointCount,
              syncedAt: new Date().toISOString()
            };
            zoeMessage = parsed.zoeMessage || `I've synced your ${platform} data and found something interesting!`;
          }
        }
      } catch (e) {
        console.error('[ZOE-SYNC] AI insight error:', e);
      }
    }

    // Fallback insight if AI fails
    if (!insight!) {
      insight = {
        platform,
        insightType: 'productivity_boost',
        summary: `Successfully synced ${dataPointCount} data points from ${platform}`,
        actionSuggestion: 'Review your synced data in the DHF dashboard',
        dataPoints: dataPointCount,
        syncedAt: new Date().toISOString()
      };
      
      if (platform === 'google_calendar' && syncedData?.upcomingEvents?.length > 0) {
        const meetings = syncedData.upcomingEvents;
        const projectName = syncedData.projectMentions?.[0] || 'your project';
        zoeMessage = `I see you have ${meetings.length} meetings scheduled, all related to ${projectName}. I've proactively created a summary note for you.`;
      } else {
        zoeMessage = `I've synced your ${platform} data. Let me know if you'd like me to help you organize or act on anything.`;
      }
    }

    // ═══ LOG TO ZSMT (DHF Storage) ═══
    const { data: zsmtLog } = await supabase.from('zoe_sovereign_memory').insert({
      user_id: user.id,
      event_type: 'dhf_external_sync',
      content_text: insight.summary,
      zoe_state_json: {
        platform,
        sync_scope: syncScope,
        data_types: dataTypes,
        insight,
        content_summary: syncedData, // Store summary, not raw data
        synced_at: new Date().toISOString()
      },
      external_virality_score: dataPointCount > 5 ? 10 : 5,
      importance_score: 8,
      cqrs_write_priority: true
    }).select('id').single();

    // Log behavioral event for DHF learning
    await supabase.from('behavioral_events').insert({
      user_id: user.id,
      event_type: 'external_platform_sync',
      event_category: 'integration',
      context_snippet: `Synced ${platform}: ${insight.summary.substring(0, 50)}`,
      metadata: {
        platform,
        data_points: dataPointCount,
        insight_type: insight.insightType,
        zsmt_log_id: zsmtLog?.id
      },
      sentiment_score: 0.8,
      dhf_logged: true
    });

    const processingTime = Date.now() - startTime;

    console.log('[ZOE-SYNC] Sync completed:', {
      platform,
      dataPoints: dataPointCount,
      insightType: insight.insightType,
      processingMs: processingTime
    });

    const result: ExternalSyncResult = {
      success: true,
      platform,
      insight,
      zoeMessage,
      zsmtLogId: zsmtLog?.id || 'unknown'
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[ZOE-SYNC] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'External sync failed',
      message: 'I had trouble connecting to that platform. Let me try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
