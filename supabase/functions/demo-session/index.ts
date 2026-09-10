/**
 * DEMO SESSION — signs a visitor into the shared, real demo account.
 *
 * There is nothing fake here: the account is a normal M'Mora member with its
 * own posts, profile and Zoe history. The password lives only in the
 * DEMO_ACCOUNT_PASSWORD secret and is never returned to the browser — the
 * function signs in server-side and hands back the session tokens.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { publicGuard, wafCorsHeaders } from '../_shared/public-guard.ts';

const DEMO_EMAIL = Deno.env.get('DEMO_ACCOUNT_EMAIL') ?? 'demo@mmora.xyz';
const DEMO_NAME = 'M\u2019Mora Demo';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...wafCorsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: wafCorsHeaders });

  const guard = await publicGuard(req, { functionName: 'demo-session', limit: 20, windowSeconds: 60 });
  if (guard.response) return guard.response;

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const password = Deno.env.get('DEMO_ACCOUNT_PASSWORD');

  if (!url || !serviceKey || !anonKey || !password) {
    return json({ ok: false, error: 'Demo account is not configured yet.' }, 503);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    // 1. Make sure the demo member exists and its password matches the secret.
    const { data: existingId } = await admin.rpc('auth_user_id_by_email', { _email: DEMO_EMAIL });

    if (!existingId) {
      const { error: createError } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password,
        email_confirm: true,
        user_metadata: { full_name: DEMO_NAME, username: 'mmora_demo', is_demo: true },
      });
      if (createError && !/already/i.test(createError.message)) {
        console.error('demo-session create failed:', createError.message);
        return json({ ok: false, error: 'Could not open the demo account.' }, 500);
      }
    } else {
      const { error: updateError } = await admin.auth.admin.updateUserById(String(existingId), {
        password,
        email_confirm: true,
      });
      if (updateError) {
        console.error('demo-session refresh failed:', updateError.message);
      }
    }

    // 2. Sign in as that member and hand the session to the browser.
    const publicClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: signIn, error: signInError } = await publicClient.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password,
    });

    if (signInError || !signIn.session) {
      console.error('demo-session sign-in failed:', signInError?.message);
      return json({ ok: false, error: 'The demo account could not be opened right now.' }, 502);
    }

    return json({
      ok: true,
      email: DEMO_EMAIL,
      session: {
        access_token: signIn.session.access_token,
        refresh_token: signIn.session.refresh_token,
      },
    });
  } catch (error) {
    console.error('demo-session error:', error);
    return json({ ok: false, error: 'Unexpected demo error.' }, 500);
  }
});
