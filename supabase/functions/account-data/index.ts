/**
 * ACCOUNT-DATA — the member's own data rights endpoint.
 *
 *   export — returns every row this member owns across the public schema.
 *   delete — erases those rows, removes their uploaded files and deletes the
 *            login itself. Irreversible, and only ever for the caller.
 *
 * Both actions act strictly on the authenticated caller: no user id is ever
 * accepted from the request body.
 *
 * Ownership covers every public table column that references a member
 * (user_id, sender_id, receiver_id, recipient_id, requester_id, owner_id,
 * created_by, actor_id, from_user_id, to_user_id, user1_id, user2_id),
 * discovered by the service-role-only list_member_tables() function, so rows
 * keyed on sender/recipient-style columns are exported and erased too.
 *
 * Storage cleanup walks each member folder recursively with pagination, so
 * nested uploads and folders with more than one page of files are removed
 * instead of blocking deletion forever.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface MemberTable {
  table: string;
  columns: string[];
}

/** Tables and columns that reference a member, discovered from the schema. */
// deno-lint-ignore no-explicit-any
async function memberTables(db: any): Promise<MemberTable[]> {
  const { data, error } = await db.rpc('list_member_tables');
  if (error || !Array.isArray(data) || data.length === 0 ||
      data.some((r) => typeof r?.table_name !== 'string' || !r.table_name ||
                  typeof r?.member_column !== 'string' || !r.member_column)) {
    throw new Error('Account data discovery unavailable');
  }
  const grouped = new Map<string, string[]>();
  for (const row of data as { table_name: string; member_column: string }[]) {
    const cols = grouped.get(row.table_name) ?? [];
    if (!cols.includes(row.member_column)) cols.push(row.member_column);
    grouped.set(row.table_name, cols);
  }
  return [...grouped.entries()].map(([table, columns]) => ({ table, columns }));
}

const STORAGE_BUCKETS = ['posts', 'avatars', 'vault'];

const EXPORT_PAGE = 1000;
/** Fail closed past 100k rows per table/column rather than silently truncate an export. */
const EXPORT_MAX_PAGES = 100;

// deno-lint-ignore no-explicit-any
async function exportOwnedRows(db: any, table: string, column: string, userId: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let page = 0; page < EXPORT_MAX_PAGES; page++) {
    const from = page * EXPORT_PAGE;
    const { data, error } = await db.from(table).select('*').eq(column, userId).range(from, from + EXPORT_PAGE - 1);
    if (error || !Array.isArray(data)) throw new Error('export page failed');
    rows.push(...data);
    if (data.length < EXPORT_PAGE) return rows;
  }
  throw new Error('export too large');
}

const STORAGE_LIST_PAGE = 100;
const STORAGE_REMOVE_BATCH = 100;
const STORAGE_MAX_DEPTH = 20;
/** Fail closed past 100k objects per member rather than silently leave files behind. */
const STORAGE_MAX_OBJECTS = 100_000;

/**
 * Recursively lists every object under a member folder. Returns null when any
 * listing fails or a safety ceiling is hit, so cleanup fails closed instead of
 * reporting erasure while files remain.
 */
// deno-lint-ignore no-explicit-any
async function listAllObjects(storage: any, bucket: string, prefix: string, depth: number): Promise<string[] | null> {
  if (depth > STORAGE_MAX_DEPTH) return null;
  const paths: string[] = [];
  for (let offset = 0; ; offset += STORAGE_LIST_PAGE) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: STORAGE_LIST_PAGE, offset });
    if (error || !Array.isArray(data)) return null;
    for (const entry of data as { id?: string | null; name?: string }[]) {
      if (!entry.name || entry.name.includes('..')) return null;
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) {
        paths.push(full);
      } else {
        // Folders have no id; descend into them.
        const nested = await listAllObjects(storage, bucket, full, depth + 1);
        if (nested === null) return null;
        paths.push(...nested);
      }
      if (paths.length > STORAGE_MAX_OBJECTS) return null;
    }
    if (data.length < STORAGE_LIST_PAGE) return paths;
  }
}

/** Removes every object the member owns across the configured buckets. */
// deno-lint-ignore no-explicit-any
async function removeMemberObjects(db: any, userId: string): Promise<string[]> {
  const failed: string[] = [];
  for (const bucket of STORAGE_BUCKETS) {
    const paths = await listAllObjects(db.storage, bucket, userId, 0);
    if (paths === null) {
      failed.push(`storage:${bucket}`);
      continue;
    }
    for (let i = 0; i < paths.length; i += STORAGE_REMOVE_BATCH) {
      const { error } = await db.storage.from(bucket).remove(paths.slice(i, i + STORAGE_REMOVE_BATCH));
      if (error) {
        failed.push(`storage:${bucket}`);
        break;
      }
    }
  }
  return failed;
}

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

    let tables: MemberTable[];
    try {
      tables = await memberTables(db);
    } catch {
      return json({ ok: false, login_removed: false, error: 'Account data discovery unavailable. Please try again.' }, 503);
    }

    if (action === 'export') {
      const bundle: Record<string, unknown[]> = {};
      for (const { table, columns } of tables) {
        const seen = new Set<string>();
        const rows: unknown[] = [];
        try {
          for (const column of columns) {
            for (const row of await exportOwnedRows(db, table, column, user.id)) {
              const key = JSON.stringify(row);
              if (!seen.has(key)) {
                seen.add(key);
                rows.push(row);
              }
            }
          }
        } catch {
          return json({ ok: false, error: 'Export could not be prepared. Please try again.' }, 503);
        }
        if (rows.length > 0) bundle[table] = rows;
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

      for (const { table, columns } of tables) {
        let tableFailed = false;
        for (const column of columns) {
          const { error } = await db.from(table).delete().eq(column, user.id);
          if (error) tableFailed = true;
        }
        if (tableFailed) failed.push(table); else removed.push(table);
      }

      // Profile rows key on id rather than user_id in this schema.
      const { error: profileError } = await db.from('profiles').delete().eq('id', user.id);
      if (profileError) failed.push('profiles');

      failed.push(...await removeMemberObjects(db, user.id));

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
