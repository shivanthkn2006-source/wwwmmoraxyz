import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const STARTER_FOCUS = ['discipline', 'clarity', 'resilience'];
const STARTER_STYLES = ['actionable', 'biographical'];

/**
 * Admin-only growth onboarding backfill.
 *
 * `list`  — every profile with no growth_preferences row (these users get no
 *           cards at all, which is why their feeds look empty).
 * `apply` — seeds a starter preference row so delivery starts immediately.
 *           `onboarded_at` stays NULL on purpose, so the member still sees the
 *           in-app onboarding wizard and can change everything themselves.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const { data: userData } = await admin.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) return json({ ok: false, error: 'sign in required' }, 401);

    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) return json({ ok: false, error: 'admin only' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? 'list');

    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('user_id, username, display_name, timezone')
      .limit(5000);
    if (profilesError) throw profilesError;

    const { data: prefs, error: prefsError } = await admin
      .from('growth_preferences')
      .select('user_id, onboarded_at');
    if (prefsError) throw prefsError;

    const withPrefs = new Set((prefs || []).map((p) => p.user_id));
    const missing = (profiles || []).filter((p) => p.user_id && !withPrefs.has(p.user_id));
    const notOnboarded = (prefs || []).filter((p) => !p.onboarded_at).length;

    if (action === 'list') {
      return json({
        ok: true,
        missingCount: missing.length,
        notOnboardedCount: notOnboarded,
        users: missing.slice(0, 200).map((p) => ({
          user_id: p.user_id,
          username: p.username,
          display_name: p.display_name,
          timezone: p.timezone ?? 'UTC',
        })),
      });
    }

    if (action === 'apply') {
      const requested: string[] = Array.isArray(body?.userIds) ? body.userIds : [];
      const targets = requested.length > 0
        ? missing.filter((p) => requested.includes(p.user_id))
        : missing;

      if (targets.length === 0) return json({ ok: true, seeded: 0, message: 'nothing to backfill' });

      const { error: insertError } = await admin.from('growth_preferences').upsert(
        targets.map((p) => ({
          user_id: p.user_id,
          focus_areas: STARTER_FOCUS,
          reflection_style: 'actionable',
          reflection_styles: STARTER_STYLES,
          delivery_frequency: 3,
          paused: false,
          timezone: p.timezone || 'UTC',
          onboarded_at: null,
        })),
        { onConflict: 'user_id', ignoreDuplicates: true },
      );
      if (insertError) throw insertError;

      return json({ ok: true, seeded: targets.length, remaining: missing.length - targets.length });
    }

    return json({ ok: false, error: 'unknown action' }, 400);
  } catch (error) {
    console.error('[growth-onboarding-backfill]', error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'backfill failed' }, 500);
  }
});
