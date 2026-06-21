import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get('id');

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing job_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query job_queue with ownership check
    const { data: job, error: jobError } = await supabase
      .from('job_queue')
      .select('id, status, created_at, updated_at')
      .eq('id', jobId)
      .eq('admin_user_id', user.id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return status based on job state
    if (job.status === 'PENDING' || job.status === 'RUNNING') {
      return new Response(
        JSON.stringify({
          job_id: job.id,
          status: job.status,
          eta_minutes: 5,
          created_at: job.created_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status === 'COMPLETED') {
      // Get report_id from audit_reports
      const { data: report, error: reportError } = await supabase
        .from('audit_reports')
        .select('id')
        .eq('job_id', jobId)
        .single();

      return new Response(
        JSON.stringify({
          job_id: job.id,
          status: 'COMPLETED',
          report_url: report ? `/api/v1/audit-reports/${report.id}` : null,
          report_id: report?.id,
          completed_at: job.updated_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status === 'FAILED') {
      return new Response(
        JSON.stringify({
          job_id: job.id,
          status: 'FAILED',
          error: 'Job processing failed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ job_id: job.id, status: job.status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Job status error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
