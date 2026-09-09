/**
 * ACCOUNT-DATA — the member's own data rights endpoint.
 *
 *   export — returns every row this member owns across the public schema.
 *   delete — erases those rows, removes their uploaded files and deletes the
 *            login itself. Irreversible, and only ever for the caller.
 *
 * Both actions act strictly on the authenticated caller: no user id is ever
 * accepted from the request body.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/** Tables whose rows belong to a member, discovered from the schema. */
async function ownedTables(db: ReturnType<typeof createClient>): Promise<string[]> {
  const { data } = await db.rpc('list_owned_tables');
  return Array.isArray(data) ? (data as { table_name: string }[]).map((r) => r.table_name) : [];
}

const STORAGE_BUCKETS = ['posts', 'avatars', 'vault'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return json({ ok: false, error: 'sign in required' }, 401);

    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'export');

    const tables = await ownedTables(db);

    if (action === 'export') {
      const bundle: Record<string, unknown[]> = {};
      for (const table of tables) {
        const { data, error } = await db.from(table).select('*').eq('user_id', user.id).limit(5000);
        if (!error && data && data.length > 0) bundle[table] = data;
      }
      const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (profile) bundle.profile = [profile];

      return json({
        ok: true,
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email, created_at: user.created_at },
        tables: Object.keys(bundle).length,
        data: bundle,
      });
    }

    if (action === 'delete') {
      if (String(body.confirm ?? '') !== 'DELETE') {
        return json({ ok: false, error: 'confirmation required' }, 400);
      }

      const removed: string[] = [];
      const failed: string[] = [];

      for (const table of tables) {
        const { error } = await db.from(table).delete().eq('user_id', user.id);
        if (error) failed.push(table); else removed.push(table);
      }

      // Profile rows key on id rather than user_id in this schema.
      await db.from('profiles').delete().eq('id', user.id);

      for (const bucket of STORAGE_BUCKETS) {
        const { data: files } = await db.storage.from(bucket).list(user.id, { limit: 1000 });
        if (files && files.length > 0) {
          await db.storage.from(bucket).remove(files.map((f: { name: string }) => `${user.id}/${f.name}`));
        }
      }

      const { error: authDeleteError } = await db.auth.admin.deleteUser(user.id);

      return json({
        ok: !authDeleteError,
        deleted_tables: removed.length,
        failed_tables: failed,
        login_removed: !authDeleteError,
        error: authDeleteError?.message,
      });
    }

    return json({ ok: false, error: 'unknown action' }, 400);
  } catch (error) {
    console.error('[account-data]', error);
    return json({ ok: false, error: 'unexpected error' }, 500);
  }
});
