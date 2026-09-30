// TEMPORARY QA helper: resets passwords of the two throwaway RLS test members only.
// Locked behind a one-time scheduler key; deleted right after the privacy tests run.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireCronOrAdmin } from '../_shared/caller-guard.ts';

const ALLOWED = ['rls.test.a@mmora-qa.dev', 'rls.test.b@mmora-qa.dev'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const c = await requireCronOrAdmin(req, 'qa-test-accounts');
  if (c instanceof Response) return c;
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  const out: Record<string, string> = {};
  for (const email of ALLOWED) {
    const u = data?.users.find((x) => x.email === email);
    if (!u) continue;
    const pw = crypto.randomUUID() + 'Aa1!';
    const { error } = await db.auth.admin.updateUserById(u.id, { password: pw, email_confirm: true });
    if (!error) out[email] = pw;
  }
  return new Response(JSON.stringify(out), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
