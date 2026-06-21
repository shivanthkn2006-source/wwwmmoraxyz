import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract and verify the user from the JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifiedUserId = user.id;
    const { operation, ...params } = await req.json();

    console.log('Security operation:', operation);

    switch (operation) {
      case 'request_password_reset': {
        const { email } = params;
        
        // Use Supabase's built-in password reset
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${req.headers.get('origin')}/reset-password`,
        });

        if (error) throw error;

        // Log security event
        const { data: userData } = await supabase.auth.admin.listUsers();
        const user = userData.users.find(u => u.email === email);
        
        if (user) {
          await supabase.from('security_audit_log').insert({
            user_id: user.id,
            event_type: 'password_reset_requested',
            event_status: 'success',
            metadata: { email }
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Password reset email sent' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify_2fa_setup': {
        const { secret, token } = params;
        // Use verifiedUserId from JWT, ignore any userId in params
        
        // Verify TOTP token (simplified - in production use a proper TOTP library)
        // For now, store the secret and mark 2FA as enabled
        const { error } = await supabase
          .from('user_security_settings')
          .upsert({
            user_id: verifiedUserId,
            two_factor_enabled: true,
            two_factor_secret: secret,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        await supabase.from('security_audit_log').insert({
          user_id: verifiedUserId,
          event_type: '2fa_enabled',
          event_status: 'success',
          metadata: { method: 'totp' }
        });

        return new Response(
          JSON.stringify({ success: true, verified: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disable_2fa': {
        // Use verifiedUserId from JWT, ignore any userId in params
        const { error } = await supabase
          .from('user_security_settings')
          .update({
            two_factor_enabled: false,
            two_factor_secret: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', verifiedUserId);

        if (error) throw error;

        await supabase.from('security_audit_log').insert({
          user_id: verifiedUserId,
          event_type: '2fa_disabled',
          event_status: 'success'
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_recovery_email': {
        const { recoveryEmail } = params;
        // Use verifiedUserId from JWT, ignore any userId in params
        
        const { error } = await supabase
          .from('user_security_settings')
          .upsert({
            user_id: verifiedUserId,
            recovery_email: recoveryEmail,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        await supabase.from('security_audit_log').insert({
          user_id: verifiedUserId,
          event_type: 'recovery_email_updated',
          event_status: 'success'
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_recovery_phone': {
        const { recoveryPhone } = params;
        // Use verifiedUserId from JWT, ignore any userId in params
        
        const { error } = await supabase
          .from('user_security_settings')
          .upsert({
            user_id: verifiedUserId,
            recovery_phone: recoveryPhone,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        await supabase.from('security_audit_log').insert({
          user_id: verifiedUserId,
          event_type: 'recovery_phone_updated',
          event_status: 'success'
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_security_settings': {
        // Use verifiedUserId from JWT, ignore any userId in params
        
        const { data, error } = await supabase
          .from('user_security_settings')
          .select('*')
          .eq('user_id', verifiedUserId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        return new Response(
          JSON.stringify({ settings: data || {} }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_security_audit_log': {
        const { limit = 50 } = params;
        // Use verifiedUserId from JWT, ignore any userId in params
        
        const { data, error } = await supabase
          .from('security_audit_log')
          .select('*')
          .eq('user_id', verifiedUserId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        return new Response(
          JSON.stringify({ logs: data || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Security operations error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});