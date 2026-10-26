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
// deno-lint-ignore no-explicit-any
async function ownedTables(db: any): Promise<string[]> {
  const { data, error } = await db.rpc('list_owned_tables');
  if (error || !Array.isArray(data) || data.length === 0 ||
      data.some((r) => typeof r?.table_name !== 'string' || !r.table_name)) {
    throw new Error('Account data discovery unavailable');
  }
  return (data as { table_name: string }[]).map((r) => r.table_name);
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
        if (error || !Array.isArray(data)) return json({ ok: false, error: 'Export could not be prepared. Please try again.' }, 503);
        if (data.length > 0) bundle[table] = data;
      }
      const { data: profile, error: profileError } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (profileError) return json({ ok: false, error: 'Export could not be prepared. Please try again.' }, 503);
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
      const { error: profileError } = await db.from('profiles').delete().eq('id', user.id);
      if (profileError) failed.push('profiles');

      for (const bucket of STORAGE_BUCKETS) {
        const { data: files, error: listError } = await db.storage.from(bucket).list(user.id, { limit: 1000 });
        // A full page or a directory cannot prove that every object was listed.
        // Fail closed until paginated/recursive cleanup is separately verified.
        if (listError || !Array.isArray(files) || files.length >= 1000 ||
            files.some((f: { id?: string | null; name?: string }) => !f.id || !f.name || f.name.includes('/'))) {
          failed.push(`storage:${bucket}`);
          continue;
        }
        if (files.length > 0) {
          const { error: removeError } = await db.storage.from(bucket).remove(files.map((f: { name: string }) => `${user.id}/${f.name}`));
          if (removeError) failed.push(`storage:${bucket}`);
        }
      }

      if (failed.length > 0) return json({
        ok: false, deleted_tables: removed.length, failed_tables: failed,
        login_removed: false, partial: true,
        error: 'Deletion did not finish. Some data may already have been removed. Your sign-in has been kept; please try again.',
      }, 503);

      const { error: authDeleteError } = await db.auth.admin.deleteUser(user.id);

      return json({
        ok: !authDeleteError,
        deleted_tables: removed.length,
        failed_tables: failed,
        login_removed: !authDeleteError,
        partial: Boolean(authDeleteError),
        error: authDeleteError ? 'Data cleanup finished, but sign-in removal did not. Please try again.' : undefined,
      }, authDeleteError ? 503 : 200);
    }

    return json({ ok: false, error: 'unknown action' }, 400);
  } catch (error) {
    console.error('[account-data]', error);
    return json({ ok: false, login_removed: false, error: 'The request did not finish. Some data may already have changed. Please try again.' }, 503);
  }
});
