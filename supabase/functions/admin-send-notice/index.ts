import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  message: z.string().min(1).max(500).trim(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  expiresAt: z.string().nullable(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: hasAdminRole } = await supabase.rpc('has_role', { check_role: 'admin' });
    
    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate request body
    const body = await req.json();
    const { title, message, priority, expiresAt } = requestSchema.parse(body);

    // Get all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id');

    if (profilesError) {
      throw profilesError;
    }

    const getPriorityNumber = (priority: string): number => {
      const map: { [key: string]: number } = {
        low: 3,
        medium: 5,
        high: 7,
        urgent: 10,
      };
      return map[priority] || 5;
    };

    // Insert notifications for all users
    const notifications = profiles.map(profile => ({
      user_id: profile.user_id,
      from_user_id: user.id,
      type: 'admin_notice',
      priority: getPriorityNumber(priority),
      expires_at: expiresAt,
      context_data: { title, message, priority },
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notice sent to ${profiles.length} users` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-send-notice:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: error instanceof z.ZodError ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});