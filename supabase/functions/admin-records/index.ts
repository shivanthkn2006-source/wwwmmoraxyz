/**
 * ADMIN RECORDS — create, edit and delete platform records for the single admin.
 *
 * Every request is checked twice: the caller must present a valid session, and
 * that account must be the root admin. Only whitelisted fields are ever written.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type Entity = 'users' | 'sessions' | 'events' | 'planner' | 'reminders';

const ENTITIES: Record<Entity, { table: string; pk: string; fields: string[] }> = {
  users: { table: 'profiles', pk: 'user_id', fields: ['username', 'display_name', 'bio', 'status', 'city'] },
  sessions: {
    table: 'user_sessions',
    pk: 'id',
    fields: ['user_id', 'device_type', 'browser', 'country', 'started_at', 'ended_at', 'is_active'],
  },
  events: {
    table: 'user_activity_log',
    pk: 'id',
    fields: ['user_id', 'activity_type', 'activity_data', 'created_at'],
  },
  planner: {
    table: 'important_dates',
    pk: 'id',
    fields: ['user_id', 'title', 'description', 'date_type', 'date_value', 'is_recurring', 'friend_user_id'],
  },
  reminders: {
    table: 'reminders',
    pk: 'id',
    fields: ['user_id', 'title', 'description', 'category', 'reminder_time', 'is_completed', 'priority'],
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const pick = (entity: Entity, values: Record<string, unknown>) => {
  const allowed = ENTITIES[entity].fields;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values || {})) {
    if (allowed.includes(key) && value !== undefined && value !== '') out[key] = value;
  }
  return out;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    if (!token) return json({ error: 'Sign in required.' }, 401);

    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await caller.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: 'Sign in required.' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc('is_root_admin', { check_user_id: userData.user.id });
    if (isAdmin !== true) return json({ error: 'Admin only.' }, 403);

    const body = await req.json().catch(() => null) as
      | { action?: string; entity?: string; id?: string; values?: Record<string, unknown>; email?: string; password?: string }
      | null;
    const action = body?.action;
    const entity = body?.entity as Entity | undefined;
    if (!entity || !(entity in ENTITIES)) return json({ error: 'Unknown record type.' }, 400);
    if (!action || !['create', 'update', 'delete'].includes(action)) return json({ error: 'Unknown action.' }, 400);

    const spec = ENTITIES[entity];

    if (entity === 'users') {
      if (action === 'create') {
        const email = String(body?.email || '').trim();
        const password = String(body?.password || '');
        if (!email.includes('@') || password.length < 8) {
          return json({ error: 'A valid email and a password of at least 8 characters are required.' }, 400);
        }
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (createError || !created?.user) return json({ error: createError?.message || 'Could not create the account.' }, 400);
        const values = pick(entity, body?.values || {});
        if (Object.keys(values).length > 0) {
          await admin.from('profiles').update(values).eq('user_id', created.user.id);
        }
        return json({ ok: true, id: created.user.id });
      }
      if (!body?.id) return json({ error: 'Missing record.' }, 400);
      if (action === 'delete') {
        const { error: deleteError } = await admin.auth.admin.deleteUser(body.id);
        if (deleteError) return json({ error: deleteError.message }, 400);
        return json({ ok: true });
      }
      const values = pick(entity, body?.values || {});
      if (Object.keys(values).length === 0) return json({ error: 'Nothing to change.' }, 400);
      const { error: updateError } = await admin.from('profiles').update(values).eq('user_id', body.id);
      if (updateError) return json({ error: updateError.message }, 400);
      return json({ ok: true });
    }

    if (action === 'create') {
      const values = pick(entity, body?.values || {});
      if (Object.keys(values).length === 0) return json({ error: 'Nothing to add.' }, 400);
      if (!values.user_id) values.user_id = userData.user.id;
      const { data: inserted, error: insertError } = await admin.from(spec.table).insert(values).select('id').single();
      if (insertError) return json({ error: insertError.message }, 400);
      return json({ ok: true, id: inserted?.id });
    }

    if (!body?.id) return json({ error: 'Missing record.' }, 400);

    if (action === 'delete') {
      const { error: deleteError } = await admin.from(spec.table).delete().eq(spec.pk, body.id);
      if (deleteError) return json({ error: deleteError.message }, 400);
      return json({ ok: true });
    }

    const values = pick(entity, body?.values || {});
    if (Object.keys(values).length === 0) return json({ error: 'Nothing to change.' }, 400);
    const { error: updateError } = await admin.from(spec.table).update(values).eq(spec.pk, body.id);
    if (updateError) return json({ error: updateError.message }, 400);
    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error.' }, 500);
  }
});
