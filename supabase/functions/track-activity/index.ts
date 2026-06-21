import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackingData {
  activityType: 'session_start' | 'session_end' | 'page_view' | 'page_exit' | 'user_action';
  sessionData?: {
    sessionToken: string;
    ipAddress?: string;
    userAgent?: string;
    browser?: string;
    browserVersion?: string;
    deviceType?: string;
    deviceVendor?: string;
    deviceModel?: string;
    os?: string;
    osVersion?: string;
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };
  pageData?: {
    pagePath: string;
    pageTitle?: string;
    referrer?: string;
    sessionId?: string;
    enteredAt?: string;
    exitedAt?: string;
    durationSeconds?: number;
  };
  activityDetails?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role for database operations (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the request body
    const body: TrackingData = await req.json();
    const { activityType, sessionData, pageData, activityDetails } = body;

    // Try to get user from JWT if available (for authenticated requests)
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader && authHeader !== 'Bearer null' && authHeader !== 'Bearer undefined') {
      try {
        const authClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: authHeader }
            }
          }
        );
        
        const { data: userData } = await authClient.auth.getUser();
        userId = userData?.user?.id || null;
      } catch {
        // Auth failed - continue without user ID for sendBeacon requests
        console.log('[track-activity] Auth failed, continuing without user ID');
      }
    }

    // For sendBeacon requests (no auth), try to find user from session token
    if (!userId && sessionData?.sessionToken) {
      const { data: existingSession } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('session_token', sessionData.sessionToken)
        .single();
      
      if (existingSession) {
        userId = existingSession.user_id;
      }
    }

    // If still no user ID for session_start, skip (requires auth)
    if (!userId && activityType === 'session_start') {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'no_user' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let result;

    switch (activityType) {
      case 'session_start':
        if (sessionData && userId) {
          // Check for existing active session to prevent duplicates
          const { data: existingActive } = await supabase
            .from('user_sessions')
            .select('id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .gte('started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 min
            .limit(1);
          
          if (existingActive && existingActive.length > 0) {
            console.log('[track-activity] Reusing existing session:', existingActive[0].id);
            result = existingActive[0];
            break;
          }

          const { data: session, error } = await supabase
            .from('user_sessions')
            .insert({
              user_id: userId,
              session_token: sessionData.sessionToken,
              ip_address: sessionData.ipAddress,
              user_agent: sessionData.userAgent,
              browser: sessionData.browser,
              browser_version: sessionData.browserVersion,
              device_type: sessionData.deviceType,
              device_vendor: sessionData.deviceVendor,
              device_model: sessionData.deviceModel,
              os: sessionData.os,
              os_version: sessionData.osVersion,
              country: sessionData.country,
              region: sessionData.region,
              city: sessionData.city,
              latitude: sessionData.latitude,
              longitude: sessionData.longitude,
              timezone: sessionData.timezone,
            })
            .select()
            .single();

          if (error) throw error;
          console.log('[track-activity] New session created:', session.id);
          result = session;
        }
        break;

      case 'session_end':
        if (sessionData?.sessionToken) {
          const updateQuery: Record<string, unknown> = {
            ended_at: new Date().toISOString(),
            is_active: false,
          };
          
          let query = supabase
            .from('user_sessions')
            .update(updateQuery)
            .eq('session_token', sessionData.sessionToken);
          
          // Add user filter if we have it
          if (userId) {
            query = query.eq('user_id', userId);
          }
          
          const { error } = await query;
          if (error) throw error;
          console.log('[track-activity] Session ended:', sessionData.sessionToken);
        }
        break;

      case 'page_view':
        if (pageData && userId) {
          const { data: pageView, error } = await supabase
            .from('page_views')
            .insert({
              user_id: userId,
              session_id: pageData.sessionId,
              page_path: pageData.pagePath,
              page_title: pageData.pageTitle,
              referrer: pageData.referrer,
            })
            .select()
            .single();

          if (error) throw error;
          result = pageView;
        }
        break;

      case 'page_exit':
        if (pageData?.sessionId && pageData?.pagePath && pageData?.durationSeconds !== undefined) {
          // Update the most recent page view for this session/path
          const { error } = await supabase
            .from('page_views')
            .update({
              exited_at: new Date().toISOString(),
              duration_seconds: pageData.durationSeconds,
            })
            .eq('session_id', pageData.sessionId)
            .eq('page_path', pageData.pagePath)
            .is('exited_at', null)
            .order('entered_at', { ascending: false })
            .limit(1);

          if (error) {
            console.warn('[track-activity] Page exit update failed:', error);
          }
        }
        break;

      case 'user_action':
        if (userId) {
          const { data: activityLog, error } = await supabase
            .from('user_activity_log')
            .insert({
              user_id: userId,
              session_id: sessionData?.sessionToken,
              activity_type: (activityDetails?.type as string) || 'unknown',
              activity_details: activityDetails,
              page_path: pageData?.pagePath,
              ip_address: sessionData?.ipAddress,
            })
            .select()
            .single();

          if (error) throw error;
          result = activityLog;
        }
        break;
    }

    // Update last activity timestamp
    if (sessionData?.sessionToken) {
      const updateQuery = supabase
        .from('user_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('session_token', sessionData.sessionToken);
      
      if (userId) {
        await updateQuery.eq('user_id', userId);
      } else {
        await updateQuery;
      }
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[track-activity] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
