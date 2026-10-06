import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Access Denied: Admin Role Required for Audit' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body for analysis options
    const body = await req.json().catch(() => ({}));
    const analyze = body.analyze || new URL(req.url).searchParams.get('analyze') === 'true';

    // Create job in queue
    const { data: job, error: jobError } = await supabase
      .from('job_queue')
      .insert({
        admin_user_id: user.id,
        job_type: 'AI_AUDIT',
        status: 'PENDING'
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error('Failed to create audit job');
    }

    // Start the worker in the background with the admin's own credentials.
    const work = fetch(`${supabaseUrl}/functions/v1/run-ai-audit-job`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.id, admin_user_id: user.id, analyze }),
    }).then((r) => r.text()).catch((e) => console.error('[Interface] worker start failed', e));
    // @ts-ignore EdgeRuntime exists on the edge runtime
    if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(work);
    console.log(`[Interface] Created job ${job.id} for admin ${user.id}`);

    // Return immediate 202 Accepted response
    return new Response(
      JSON.stringify({
        status: 'Job Queued',
        message: 'Audit analysis has been queued and will complete asynchronously',
        job_id: job.id,
        analyze: analyze,
        checkStatus: `/api/audit-status/${job.id}`,
        estimatedCompletion: '30-60 seconds'
      }),
      { 
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Interface] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});