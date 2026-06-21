import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { 
  corsHeaders, 
  logTelemetry,
  estimateCost,
  getLatencyTarget
} from "../_shared/ai-telemetry.ts";

/**
 * ZOE DHF GOD MODE - Platform-Wide Ultra Deep Scan & Auto-Fix System
 * 
 * This edge function enables Zoe to:
 * 1. Scan the entire platform for issues
 * 2. Analyze database health, edge functions, and system status
 * 3. Identify and auto-fix common problems
 * 4. Generate comprehensive health reports
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

interface ScanResult {
  category: string;
  status: 'healthy' | 'warning' | 'critical' | 'fixed';
  message: string;
  details?: any;
  autoFixable?: boolean;
  fixApplied?: boolean;
}

interface GodModeScanReport {
  timestamp: string;
  requestId: string;
  overallHealth: number;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  scanDuration: number;
  results: ScanResult[];
  fixes: {
    attempted: number;
    successful: number;
    failed: number;
    details: string[];
  };
  recommendations: string[];
  zoeNarrative: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create service role client for full access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // Verify caller is admin
    const { data: isAdmin } = await supabase.rpc('is_root_admin', { check_user_id: claimsData.claims.sub });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, userId, options } = await req.json();

    const results: ScanResult[] = [];
    const fixDetails: string[] = [];
    let fixesAttempted = 0;
    let fixesSuccessful = 0;
    let fixesFailed = 0;

    // ═══════════════════════════════════════════════════════════════════
    // SCAN 1: Database Health Check
    // ═══════════════════════════════════════════════════════════════════
    try {
      // Check behavioral_events table health
      const { count: eventsCount, error: eventsError } = await supabase
        .from('behavioral_events')
        .select('*', { count: 'exact', head: true });

      if (eventsError) {
        results.push({
          category: 'Database - Behavioral Events',
          status: 'critical',
          message: 'Table access error: unable to query behavioral events',
          autoFixable: false
        });
      } else {
        results.push({
          category: 'Database - Behavioral Events',
          status: 'healthy',
          message: `${eventsCount?.toLocaleString() || 0} events tracked`,
          details: { count: eventsCount }
        });
      }

      // Check ECN history health
      const { count: ecnCount, error: ecnError } = await supabase
        .from('ecn_history')
        .select('*', { count: 'exact', head: true });

      if (ecnError) {
        results.push({
          category: 'Database - ECN History',
          status: 'warning',
          message: `ECN access issue: ${ecnError.message}`,
          autoFixable: true
        });
      } else {
        if ((ecnCount || 0) === 0) {
          results.push({
            category: 'Database - ECN History',
            status: 'warning',
            message: 'ECN history is empty - emotional tracking not populated',
            autoFixable: true,
            details: { count: ecnCount }
          });
        } else {
          results.push({
            category: 'Database - ECN History',
            status: 'healthy',
            message: `${ecnCount?.toLocaleString() || 0} emotional states recorded`,
            details: { count: ecnCount }
          });
        }
      }

      // Check Zoe settings
      const { data: zoSettings, error: zoError } = await supabase
        .from('zoe_settings')
        .select('user_id, enabled, sync_percentage')
        .limit(100);

      if (zoError) {
        results.push({
          category: 'Database - Zoe Settings',
          status: 'critical',
          message: `Settings access error: ${zoError.message}`,
          autoFixable: false
        });
      } else {
        const activeUsers = zoSettings?.filter(s => s.enabled).length || 0;
        const avgSync = zoSettings?.length 
          ? zoSettings.reduce((sum, s) => sum + (s.sync_percentage || 0), 0) / zoSettings.length 
          : 0;
        results.push({
          category: 'Database - Zoe Settings',
          status: 'healthy',
          message: `${activeUsers} active users, ${avgSync.toFixed(1)}% avg sync`,
          details: { activeUsers, avgSync, totalUsers: zoSettings?.length }
        });
      }

      // Check DHF asset logs
      const { count: dhfCount, error: dhfError } = await supabase
        .from('dhf_asset_logs')
        .select('*', { count: 'exact', head: true });

      results.push({
        category: 'Database - DHF Assets',
        status: dhfError ? 'warning' : 'healthy',
        message: dhfError ? dhfError.message : `${dhfCount?.toLocaleString() || 0} DHF assets indexed`,
        details: { count: dhfCount }
      });

      // Check Zoe sovereign memory
      const { count: memoryCount, error: memoryError } = await supabase
        .from('zoe_sovereign_memory')
        .select('*', { count: 'exact', head: true });

      results.push({
        category: 'Database - Sovereign Memory',
        status: memoryError ? 'warning' : 'healthy',
        message: memoryError ? memoryError.message : `${memoryCount?.toLocaleString() || 0} memory entries`,
        details: { count: memoryCount }
      });

    } catch (dbError) {
      results.push({
        category: 'Database - General',
        status: 'critical',
        message: `Database scan failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
        autoFixable: false
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // SCAN 2: Edge Function Status
    // ═══════════════════════════════════════════════════════════════════
    const edgeFunctions = [
      'zoe-chat',
      'zoe-agent',
      'zoe-core-executor',
      'behavioral-event-stream',
      'platform-diagnostics'
    ];

    for (const fn of edgeFunctions) {
      try {
        // Test function availability with a simple ping
        const testResponse = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
          method: 'OPTIONS',
          headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
        });

        results.push({
          category: `Edge Function - ${fn}`,
          status: testResponse.ok || testResponse.status === 204 ? 'healthy' : 'warning',
          message: testResponse.ok || testResponse.status === 204 ? 'Function accessible' : `Status: ${testResponse.status}`,
          details: { status: testResponse.status }
        });
      } catch (fnError) {
        results.push({
          category: `Edge Function - ${fn}`,
          status: 'warning',
          message: 'Function not responding to health check',
          autoFixable: false
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SCAN 3: ECN Analysis Queue Health
    // ═══════════════════════════════════════════════════════════════════
    try {
      const { data: failedQueue, error: queueError } = await supabase
        .from('ecn_analysis_queue')
        .select('id, status, created_at')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (queueError) {
        results.push({
          category: 'ECN Analysis Queue',
          status: 'warning',
          message: queueError.message,
          autoFixable: false
        });
      } else if ((failedQueue?.length || 0) > 0) {
        results.push({
          category: 'ECN Analysis Queue',
          status: 'warning',
          message: `${failedQueue?.length} failed analysis jobs detected`,
          details: { failedCount: failedQueue?.length },
          autoFixable: true
        });

        // Auto-fix: Mark old failed jobs for retry
        if (options?.autoFix) {
          fixesAttempted++;
          const { error: updateError } = await supabase
            .from('ecn_analysis_queue')
            .update({ status: 'pending' })
            .eq('status', 'failed')
            .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

          if (updateError) {
            fixesFailed++;
            fixDetails.push(`Failed to reset ECN queue: ${updateError.message}`);
          } else {
            fixesSuccessful++;
            fixDetails.push('Reset old failed ECN analysis jobs to pending');
            // Update the result to show fix applied
            results[results.length - 1].status = 'fixed';
            results[results.length - 1].fixApplied = true;
          }
        }
      } else {
        results.push({
          category: 'ECN Analysis Queue',
          status: 'healthy',
          message: 'No failed analysis jobs',
        });
      }
    } catch (qError) {
      results.push({
        category: 'ECN Analysis Queue',
        status: 'warning',
        message: 'Could not check queue status',
        autoFixable: false
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // SCAN 4: User-Specific Health (if userId provided)
    // ═══════════════════════════════════════════════════════════════════
    if (userId) {
      try {
        // Check user's behavioral events
        const { count: userEvents } = await supabase
          .from('behavioral_events')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        results.push({
          category: 'User - Behavioral Events',
          status: (userEvents || 0) > 0 ? 'healthy' : 'warning',
          message: `${userEvents || 0} events for this user`,
          details: { userId, count: userEvents }
        });

        // Check user's ECN history
        const { count: userEcn } = await supabase
          .from('ecn_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        results.push({
          category: 'User - ECN History',
          status: (userEcn || 0) > 0 ? 'healthy' : 'warning',
          message: `${userEcn || 0} emotional states tracked`,
          details: { userId, count: userEcn }
        });

        // Check user's Zoe settings
        const { data: userSettings } = await supabase
          .from('zoe_settings')
          .select('*')
          .eq('user_id', userId)
          .single();

        results.push({
          category: 'User - Zoe Settings',
          status: userSettings ? 'healthy' : 'warning',
          message: userSettings 
            ? `Zoe ${userSettings.enabled ? 'enabled' : 'disabled'}, ${userSettings.sync_percentage}% synced`
            : 'No Zoe settings found',
          details: userSettings
        });

      } catch (userError) {
        results.push({
          category: 'User - Health Check',
          status: 'warning',
          message: 'Could not complete user health check',
          autoFixable: false
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SCAN 5: CDSP Analysis Status
    // ═══════════════════════════════════════════════════════════════════
    try {
      const { count: cdspCount } = await supabase
        .from('zoe_cdsp_analysis')
        .select('*', { count: 'exact', head: true });

      results.push({
        category: 'CDSP Analysis Engine',
        status: 'healthy',
        message: `${cdspCount?.toLocaleString() || 0} CDSP analyses performed`,
        details: { count: cdspCount }
      });
    } catch {
      results.push({
        category: 'CDSP Analysis Engine',
        status: 'warning',
        message: 'CDSP status check failed',
        autoFixable: false
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // CALCULATE OVERALL HEALTH
    // ═══════════════════════════════════════════════════════════════════
    const criticalCount = results.filter(r => r.status === 'critical').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const healthyCount = results.filter(r => r.status === 'healthy' || r.status === 'fixed').length;
    const totalChecks = results.length;

    const overallHealth = Math.round(
      ((healthyCount * 100) + (warningCount * 50) + (criticalCount * 0)) / totalChecks
    );

    const overallStatus = criticalCount > 0 ? 'critical' 
      : warningCount > 2 ? 'degraded' 
      : 'healthy';

    // ═══════════════════════════════════════════════════════════════════
    // GENERATE RECOMMENDATIONS
    // ═══════════════════════════════════════════════════════════════════
    const recommendations: string[] = [];

    if (criticalCount > 0) {
      recommendations.push('🚨 Critical issues detected - immediate attention required');
    }
    if (results.find(r => r.category.includes('ECN') && r.status !== 'healthy')) {
      recommendations.push('📊 ECN emotional tracking needs attention - run CDSP sync');
    }
    if (results.find(r => r.category.includes('Edge Function') && r.status !== 'healthy')) {
      recommendations.push('⚡ Some edge functions may need redeployment');
    }
    if (overallHealth < 80) {
      recommendations.push('🔧 Consider running auto-fix with options.autoFix = true');
    }
    if (overallHealth >= 90) {
      recommendations.push('✅ Platform is in excellent health - continue monitoring');
    }

    // ═══════════════════════════════════════════════════════════════════
    // GENERATE ZOE'S NARRATIVE RESPONSE
    // ═══════════════════════════════════════════════════════════════════
    let zoeNarrative = '';
    
    try {
      const narrativePrompt = `You are Zoe, an AI with God Mode access to the platform. You just completed a deep platform scan. Generate a 2-3 sentence natural, conversational summary of the scan results.

Scan Results:
- Overall Health: ${overallHealth}%
- Status: ${overallStatus}
- Healthy Checks: ${healthyCount}/${totalChecks}
- Warnings: ${warningCount}
- Critical Issues: ${criticalCount}
- Fixes Applied: ${fixesSuccessful}/${fixesAttempted}

Key Findings:
${results.slice(0, 5).map(r => `- ${r.category}: ${r.status} - ${r.message}`).join('\n')}

Respond as Zoe in first person, be confident about your scanning abilities. If issues were found, mention you can fix them. Be specific about what you scanned.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are Zoe, a self-aware AI with platform-wide scanning abilities. Be confident and specific.' },
            { role: 'user', content: narrativePrompt }
          ],
          max_tokens: 200,
        }),
      });

      // Handle rate limiting (429) and credits exhausted (402)
      if (response.status === 429) {
        console.warn('[God Mode] AI rate limited for narrative generation');
        zoeNarrative = `Platform scan complete. Overall health: ${overallHealth}%. Status: ${overallStatus}. ${healthyCount}/${totalChecks} checks passed.`;
      } else if (response.status === 402) {
        console.warn('[God Mode] AI credits exhausted for narrative generation');
        zoeNarrative = `Scan complete with ${overallHealth}% health score. AI narrative unavailable - credits depleted.`;
      } else if (response.ok) {
        const data = await response.json();
        zoeNarrative = data.choices?.[0]?.message?.content || '';
      } else {
        console.error('[God Mode] AI narrative error:', response.status);
        zoeNarrative = `Platform health: ${overallHealth}%. ${criticalCount} critical, ${warningCount} warnings, ${healthyCount} healthy.`;
      }
    } catch {
      zoeNarrative = `I've completed my platform-wide scan. Overall health is ${overallHealth}% with ${healthyCount} systems healthy. ${warningCount > 0 ? `I detected ${warningCount} warnings that may need attention.` : 'Everything looks great!'} ${fixesSuccessful > 0 ? `I've already applied ${fixesSuccessful} fixes automatically.` : ''}`;
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPILE FINAL REPORT
    // ═══════════════════════════════════════════════════════════════════
    const scanDuration = Date.now() - startTime;

    const report: GodModeScanReport = {
      timestamp: new Date().toISOString(),
      requestId,
      overallHealth,
      overallStatus,
      scanDuration,
      results,
      fixes: {
        attempted: fixesAttempted,
        successful: fixesSuccessful,
        failed: fixesFailed,
        details: fixDetails
      },
      recommendations,
      zoeNarrative
    };

    // Log scan to behavioral_events for tracking
    if (userId) {
      await supabase.from('behavioral_events').insert({
        user_id: userId,
        event_type: 'zoe_god_mode_scan',
        event_category: 'system',
        context_snippet: `Platform scan: ${overallHealth}% health`,
        metadata: {
          requestId,
          overallHealth,
          overallStatus,
          checksRun: totalChecks,
          fixesApplied: fixesSuccessful,
          scanDuration
        }
      });
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Zoe God Mode error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        zoeNarrative: "I encountered an issue while scanning. Let me try a different approach - can you tell me what specific area you'd like me to focus on?"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
