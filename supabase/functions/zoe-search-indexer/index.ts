/** Durable queue processor and bounded historical backfill for Zoe universal search. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { embedText } from '../_shared/zoe-embeddings.ts';
import { requireSearchUser } from '../_shared/zoe-search-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

type QueueRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  owner_id: string | null;
  attempts: number;
};

type CanonicalEntity = {
  ownerId: string;
  content: string;
  privacy: 'public' | 'friends' | 'private';
  metadata: Record<string, unknown>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sanitizedError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || 'unknown');
  return message.replace(/[\r\n]+/g, ' ').slice(0, 300);
}

async function loadCanonical(db: ReturnType<typeof createClient>, job: QueueRow): Promise<CanonicalEntity | null> {
  if (['post', 'loop_video', 'image', 'quote'].includes(job.entity_type)) {
    const { data, error } = await db.from('posts')
      .select('id,user_id,content,media_url,media_preview_url,media_type,visibility,created_at')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const privacy = data.visibility === 'global' ? 'public' : data.visibility === 'personal' ? 'friends' : 'private';
    return {
      ownerId: data.user_id,
      content: String(data.content || '').trim() || `${data.media_type || job.entity_type} post`,
      privacy,
      metadata: {
        mediaType: data.media_type,
        mediaUrl: data.media_url,
        previewUrl: data.media_preview_url,
        createdAt: data.created_at,
      },
    };
  }

  if (job.entity_type === 'profile') {
    const { data, error } = await db.from('profiles')
      .select('user_id,display_name,username,bio,profession,field_of_study,city,profile_photo_url,profile_visibility')
      .eq('user_id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ownerId: data.user_id,
      content: [data.display_name, data.username ? `@${data.username}` : '', data.bio, data.profession, data.field_of_study, data.city]
        .filter(Boolean).join('\n'),
      privacy: data.profile_visibility === 'private' ? 'private' : 'public',
      metadata: { title: data.display_name || data.username || 'Member', username: data.username, avatarUrl: data.profile_photo_url },
    };
  }

  if (job.entity_type === 'chat') {
    const { data, error } = await db.from('zoe_infinity_messages')
      .select('id,user_id,role,content,media_type,created_at,session_id')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ownerId: data.user_id,
      content: String(data.content || '').trim(),
      privacy: 'private',
      metadata: { role: data.role, mediaType: data.media_type, createdAt: data.created_at, sessionId: data.session_id },
    };
  }

  if (job.entity_type === 'dhf_node') {
    const { data, error } = await db.from('mmora_memories')
      .select('id,user_id,content,type,emotion_tag,created_at,session_id')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ownerId: data.user_id,
      content: String(data.content || '').trim(),
      privacy: 'private',
      metadata: { type: data.type, emotion: data.emotion_tag, createdAt: data.created_at, sessionId: data.session_id },
    };
  }

  return null;
}

async function enqueueBackfill(db: ReturnType<typeof createClient>, userId: string) {
  const [profiles, posts, chats, memories] = await Promise.all([
    db.from('profiles').select('user_id'),
    db.from('posts').select('id,user_id,media_type,content'),
    db.from('zoe_infinity_messages').select('id,user_id').eq('user_id', userId),
    db.from('mmora_memories').select('id,user_id').eq('user_id', userId),
  ]);
  for (const response of [profiles, posts, chats, memories]) if (response.error) throw response.error;

  const rows = [
    ...(profiles.data || []).map((row) => ({ entity_type: 'profile', entity_id: row.user_id, owner_id: row.user_id })),
    ...(posts.data || []).map((row) => ({
      entity_type: row.media_type === 'video' ? 'loop_video' : row.media_type === 'image' ? 'image' : String(row.content || '').toLowerCase().startsWith('quote:') ? 'quote' : 'post',
      entity_id: row.id,
      owner_id: row.user_id,
    })),
    ...(chats.data || []).map((row) => ({ entity_type: 'chat', entity_id: row.id, owner_id: row.user_id })),
    ...(memories.data || []).map((row) => ({ entity_type: 'dhf_node', entity_id: row.id, owner_id: row.user_id })),
  ];
  if (!rows.length) return 0;
  const { error } = await db.from('zoe_search_index_queue').upsert(
    rows.map((row) => ({ ...row, status: 'pending', attempts: 0, available_at: new Date().toISOString(), last_error: null })),
    { onConflict: 'entity_type,entity_id' },
  );
  if (error) throw error;
  return rows.length;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();

  try {
    const user = await requireSearchUser(req);
    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('BACKEND_NOT_CONFIGURED');
    const body = await req.json().catch(() => ({}));
    // Keep each invocation inside the edge runtime budget; callers repeatedly
    // drain the durable queue in small resumable batches.
    const limit = Math.max(1, Math.min(Number(body?.limit) || 5, 10));
    const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const enqueued = body?.backfill === true ? await enqueueBackfill(db, user.id) : 0;

    const { data: jobs, error: queueError } = await db.from('zoe_search_index_queue')
      .select('id,entity_type,entity_id,owner_id,attempts')
      .in('status', ['pending', 'failed'])
      .lte('available_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(limit);
    if (queueError) throw queueError;

    let completed = 0;
    let failed = 0;
    for (const job of (jobs || []) as QueueRow[]) {
      const { data: claimed } = await db.from('zoe_search_index_queue')
        .update({ status: 'processing', attempts: job.attempts + 1, updated_at: new Date().toISOString() })
        .eq('id', job.id).in('status', ['pending', 'failed']).select('id').maybeSingle();
      if (!claimed) continue;

      try {
        const entity = await loadCanonical(db, job);
        if (!entity || !entity.content) {
          await db.from('zoe_universal_index').delete().eq('entity_type', job.entity_type).eq('entity_id', job.entity_id);
        } else {
          const embedding = await embedText(entity.content);
          if (!embedding) throw new Error('EMBEDDING_UNAVAILABLE');
          const { error } = await db.from('zoe_universal_index').upsert({
            owner_id: entity.ownerId,
            entity_type: job.entity_type,
            entity_id: job.entity_id,
            content_synthesis: entity.content.slice(0, 20000),
            embedding: JSON.stringify(embedding),
            privacy_level: entity.privacy,
            social_weight: 1,
            metadata: entity.metadata,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'entity_type,entity_id' });
          if (error) throw error;
        }
        await db.from('zoe_search_index_queue').update({ status: 'completed', last_error: null, updated_at: new Date().toISOString() }).eq('id', job.id);
        completed += 1;
      } catch (error) {
        const attempts = job.attempts + 1;
        const retryMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
        await db.from('zoe_search_index_queue').update({
          status: 'failed',
          last_error: sanitizedError(error),
          available_at: new Date(Date.now() + retryMinutes * 60_000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', job.id);
        failed += 1;
      }
    }

    const totalMs = Math.round(performance.now() - startedAt);
    await db.from('zoe_search_events').insert({
      request_id: requestId,
      event_type: 'backfill',
      user_id: user.id,
      result_count: completed,
      timings: { totalMs },
      degraded: { failed },
    });
    return json({ requestId, enqueued, processed: (jobs || []).length, completed, failed, timings: { totalMs } });
  } catch (error) {
    const message = sanitizedError(error);
    return json({ requestId, error: message === 'UNAUTHORIZED' ? 'Unauthorized' : message }, message === 'UNAUTHORIZED' ? 401 : 500);
  }
});