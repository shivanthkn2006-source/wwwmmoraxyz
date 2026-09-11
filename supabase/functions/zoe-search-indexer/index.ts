/** Durable queue processor and bounded historical backfill for Zoe universal search. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { embedText } from '../_shared/zoe-embeddings.ts';
import { requireSearchUser } from '../_shared/zoe-search-auth.ts';
import { describeSearchMedia } from '../_shared/zoe-media-understanding.ts';

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
  ownerId: string | null;
  content: string;
  privacy: 'public' | 'friends' | 'private';
  metadata: Record<string, unknown>;
};
/** Drops inline base64 payloads; keeps only http(s)/storage references. */
function slimMediaRef(url: unknown): string | null {
  const value = typeof url === 'string' ? url : '';
  if (!value) return null;
  if (value.startsWith('data:')) return `inline:${value.slice(5, value.indexOf(';') > 0 ? value.indexOf(';') : 20)}`;
  return value.slice(0, 500);
}


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

/** Author attribution so searching a person's name also returns their content. */
async function loadAuthor(db: ReturnType<typeof createClient>, userId: string) {
  const { data } = await db.from('profiles')
    .select('display_name,username').eq('user_id', userId).maybeSingle();
  const parts = [data?.display_name, data?.username ? `@${data.username}` : ''].filter(Boolean);
  return {
    line: parts.length ? `By ${parts.join(' ')}` : '',
    name: (data?.display_name as string | null) || (data?.username as string | null) || null,
    username: (data?.username as string | null) || null,
  };
}

async function loadCanonical(db: ReturnType<typeof createClient>, job: QueueRow): Promise<CanonicalEntity | null> {
  if (['post', 'loop_video', 'image', 'quote'].includes(job.entity_type)) {
    const { data, error } = await db.from('posts')
      .select('id,user_id,content,media_url,media_preview_url,media_type,visibility,created_at')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const privacy = data.visibility === 'global' ? 'public' : data.visibility === 'personal' ? 'friends' : 'private';
    const author = await loadAuthor(db, data.user_id);
    const caption = String(data.content || '').trim();
    const primaryMedia = typeof data.media_url === 'string' ? data.media_url : null;
    const previewMedia = typeof data.media_preview_url === 'string' ? data.media_preview_url : null;
    let visualDescription = await describeSearchMedia(primaryMedia);
    if (!visualDescription && previewMedia && previewMedia !== primaryMedia) {
      visualDescription = await describeSearchMedia(previewMedia);
    }
    const body = caption || `${data.media_type || job.entity_type} post`;
    return {
      ownerId: data.user_id,
      content: [author.line, body, visualDescription ? `[Visual Data]: ${visualDescription}` : ''].filter(Boolean).join('\n'),
      privacy,
      metadata: {
        mediaType: data.media_type,
        // Never store base64 data: URLs in the index — they bloat every search
        // response by megabytes. Keep only remote references.
        mediaUrl: slimMediaRef(data.media_url),
        previewUrl: slimMediaRef(data.media_preview_url),
        createdAt: data.created_at,
        authorName: author.name,
        authorUsername: author.username,
        visualIndexed: Boolean(visualDescription),
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

  // Visual memory: what Zoe actually SAW, made recallable like any other
  // memory so "what was in the photo I showed you" resolves to a real row.
  if (job.entity_type === 'visual_memory') {
    const { data, error } = await db.from('zoe_infinity_memories')
      .select('id,user_id,key,value,context,importance_score,created_at')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const body = [String(data.value || '').trim(), String(data.context || '').trim()]
      .filter(Boolean).join('\n');
    if (!body) return null;
    return {
      ownerId: data.user_id,
      content: `Zoe saw: ${body}`,
      privacy: 'private',
      metadata: {
        title: 'Visual memory',
        visionKind: data.key,
        importance: data.importance_score,
        createdAt: data.created_at,
      },
    };
  }

  // ── Omni-Graph coverage: DHF, Growth and Daily Compass entities ──
  if (job.entity_type === 'dhf_post') {
    const { data, error } = await db.from('dhf_daily_posts')
      .select('id,user_id,headline,short_summary,full_story_content,category,post_date,slot_time,image_url')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ownerId: data.user_id,
      content: [data.headline, data.short_summary, String(data.full_story_content || '').slice(0, 8000)]
        .filter(Boolean).join('\n'),
      privacy: 'private',
      metadata: {
        title: data.headline, category: data.category, createdAt: data.post_date,
        slot: data.slot_time, imageUrl: slimMediaRef(data.image_url), route: `/dhf/essay/${data.id}`,
      },
    };
  }

  if (job.entity_type === 'dhf_video') {
    const { data, error } = await db.from('dhf_videos')
      .select('id,title,description,figure_name,topic,category,youtube_url,thumbnail_url,published_at,active')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data || data.active === false) return null;
    return {
      ownerId: null, // platform-wide asset — no single owner
      content: [data.title, data.figure_name, data.topic, data.description].filter(Boolean).join('\n'),
      privacy: 'public',
      metadata: {
        title: data.title, figure: data.figure_name, category: data.category,
        url: data.youtube_url, thumbnailUrl: slimMediaRef(data.thumbnail_url), createdAt: data.published_at,
      },
    };
  }

  if (job.entity_type === 'growth_card') {
    const { data, error } = await db.from('growth_feed_items')
      .select('id,user_id,title,content,actionable_step,category,slot,local_date')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ownerId: data.user_id,
      content: [data.title, data.content, data.actionable_step].filter(Boolean).join('\n'),
      privacy: 'private',
      metadata: { title: data.title, category: data.category, slot: data.slot, createdAt: data.local_date },
    };
  }

  if (job.entity_type === 'astro_prediction') {
    const { data, error } = await db.from('astro_predictions')
      .select('id,user_id,prediction_headline,prediction_body,motivational_quote,transits_summary,target_date,slot')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ownerId: data.user_id,
      content: [data.prediction_headline, data.prediction_body, data.motivational_quote,
        typeof data.transits_summary === 'string' ? data.transits_summary : JSON.stringify(data.transits_summary || '')]
        .filter(Boolean).join('\n').slice(0, 8000),
      privacy: 'private',
      metadata: { title: data.prediction_headline, slot: data.slot, createdAt: data.target_date },
    };
  }

  if (job.entity_type === 'wisdom_goal') {
    const { data, error } = await db.from('wisdom_macro_goals')
      .select('id,user_id,title,purpose,domain,status,target_date,created_at')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ownerId: data.user_id,
      content: [data.title, data.purpose, data.domain, `Status: ${data.status}`].filter(Boolean).join('\n'),
      privacy: 'private',
      metadata: { title: data.title, domain: data.domain, status: data.status, createdAt: data.created_at },
    };
  }

  // ── Conversational memory: direct messages and post comments ──
  if (job.entity_type === 'direct_message') {
    const { data, error } = await db.from('messages')
      .select('id,sender_id,receiver_id,content,media_type,created_at')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const author = await loadAuthor(db, data.sender_id);
    return {
      ownerId: data.sender_id,
      content: [author.line, String(data.content || '').trim()].filter(Boolean).join('\n'),
      // Always private: only the sender's own recall may surface a DM.
      privacy: 'private',
      metadata: {
        title: 'Direct message',
        mediaType: data.media_type,
        counterpartId: data.receiver_id,
        createdAt: data.created_at,
        route: `/chat?peer=${data.receiver_id}`,
      },
    };
  }

  if (job.entity_type === 'post_comment') {
    const { data, error } = await db.from('post_comments')
      .select('id,post_id,user_id,content,created_at')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { data: parent } = await db.from('posts')
      .select('id,visibility,content').eq('id', data.post_id).maybeSingle();
    const author = await loadAuthor(db, data.user_id);
    return {
      ownerId: data.user_id,
      content: [author.line, String(data.content || '').trim(),
        parent?.content ? `On post: ${String(parent.content).slice(0, 200)}` : ''].filter(Boolean).join('\n'),
      privacy: parent?.visibility === 'global' ? 'public' : parent?.visibility === 'personal' ? 'friends' : 'private',
      metadata: {
        title: 'Comment',
        postId: data.post_id,
        createdAt: data.created_at,
        route: `/post/${data.post_id}`,
      },
    };
  }

  // ── Life graph: dates, attachments and remembered facts ──
  // These three were previously invisible to recall, which is why questions
  // like "when is her birthday", "show me the documents I attached" or
  // "where do I live" had no backing data even though the rows existed.
  if (job.entity_type === 'important_date') {
    const { data, error } = await db.from('important_dates')
      .select('id,user_id,date_type,date_value,title,description,is_recurring,friend_user_id,created_at')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const about = data.friend_user_id ? await loadAuthor(db, data.friend_user_id) : null;
    return {
      ownerId: data.user_id,
      content: [
        `${data.date_type || 'Date'}: ${data.title || ''}`.trim(),
        data.date_value ? `On ${data.date_value}${data.is_recurring ? ' (every year)' : ''}` : '',
        about?.name ? `For ${about.name}` : '',
        data.description || '',
      ].filter(Boolean).join('\n'),
      privacy: 'private',
      metadata: {
        title: data.title || data.date_type,
        dateType: data.date_type,
        dateValue: data.date_value,
        recurring: data.is_recurring,
        aboutUserId: data.friend_user_id,
        aboutName: about?.name ?? null,
        createdAt: data.created_at,
        route: '/dates',
      },
    };
  }

  if (job.entity_type === 'post_attachment') {
    const { data, error } = await db.from('post_attachments')
      .select('id,post_id,user_id,media_url,media_preview_url,media_type,file_name,created_at')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { data: parent } = await db.from('posts')
      .select('id,visibility,content,created_at').eq('id', data.post_id).maybeSingle();
    // Describe the picture so "the photo of the beach" resolves to a real row.
    const visualDescription = await describeSearchMedia(
      typeof data.media_url === 'string' ? data.media_url : null,
    );
    return {
      ownerId: data.user_id,
      content: [
        `${data.media_type || 'file'} attachment${data.file_name ? `: ${data.file_name}` : ''}`,
        parent?.content ? `On post: ${String(parent.content).slice(0, 200)}` : '',
        visualDescription ? `[Visual Data]: ${visualDescription}` : '',
      ].filter(Boolean).join('\n'),
      privacy: parent?.visibility === 'global' ? 'public' : parent?.visibility === 'personal' ? 'friends' : 'private',
      metadata: {
        title: data.file_name || `${data.media_type || 'File'} attachment`,
        mediaType: data.media_type,
        mediaUrl: slimMediaRef(data.media_url),
        previewUrl: slimMediaRef(data.media_preview_url),
        postId: data.post_id,
        createdAt: parent?.created_at || data.created_at,
        visualIndexed: Boolean(visualDescription),
        route: `/post/${data.post_id}`,
      },
    };
  }

  if (job.entity_type === 'life_fact') {
    const { data, error } = await db.from('zoe_life_context')
      .select('id,user_id,category,fact_key,fact_value,confidence,occurred_on,last_seen_at,created_at')
      .eq('id', job.entity_id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const body = String(data.fact_value || '').trim();
    if (!body) return null;
    return {
      ownerId: data.user_id,
      content: `${data.category}: ${body}`,
      privacy: 'private',
      metadata: {
        title: `${data.category} — ${data.fact_key}`,
        category: data.category,
        factKey: data.fact_key,
        confidence: data.confidence,
        occurredOn: data.occurred_on,
        createdAt: data.occurred_on || data.last_seen_at || data.created_at,
      },
    };
  }

  return null;

}



async function enqueueBackfill(db: ReturnType<typeof createClient>, userId: string) {
  const [profiles, posts, chats, memories, dhfPosts, dhfVideos, growthCards, predictions, goals, dms, comments, visuals, dates, attachments, lifeFacts] = await Promise.all([
    db.from('profiles').select('user_id'),
    db.from('posts').select('id,user_id,media_type,content'),
    db.from('zoe_infinity_messages').select('id,user_id').eq('user_id', userId),
    db.from('mmora_memories').select('id,user_id').eq('user_id', userId),
    db.from('dhf_daily_posts').select('id,user_id').eq('user_id', userId),
    db.from('dhf_videos').select('id').eq('active', true),
    db.from('growth_feed_items').select('id,user_id').eq('user_id', userId),
    db.from('astro_predictions').select('id,user_id').eq('user_id', userId),
    db.from('wisdom_macro_goals').select('id,user_id').eq('user_id', userId),
    db.from('messages').select('id,sender_id').eq('sender_id', userId).limit(2000),
    db.from('post_comments').select('id,user_id').eq('user_id', userId).limit(2000),
    db.from('zoe_infinity_memories').select('id,user_id').eq('user_id', userId).like('key', 'vision_%').limit(2000),
    db.from('important_dates').select('id,user_id').eq('user_id', userId).limit(2000),
    db.from('post_attachments').select('id,user_id').eq('user_id', userId).limit(2000),
    db.from('zoe_life_context').select('id,user_id').eq('user_id', userId).limit(2000),
  ]);
  for (const response of [profiles, posts, chats, memories, dhfPosts, dhfVideos, growthCards, predictions, goals, dms, comments, visuals, dates, attachments, lifeFacts]) {
    if (response.error) throw response.error;
  }

  const rows = [
    ...(profiles.data || []).map((row) => ({ entity_type: 'profile', entity_id: row.user_id, owner_id: row.user_id })),
    ...(posts.data || []).map((row) => ({
      entity_type: row.media_type === 'video' ? 'loop_video' : row.media_type === 'image' ? 'image' : String(row.content || '').toLowerCase().startsWith('quote:') ? 'quote' : 'post',
      entity_id: row.id,
      owner_id: row.user_id,
    })),
    ...(chats.data || []).map((row) => ({ entity_type: 'chat', entity_id: row.id, owner_id: row.user_id })),
    ...(memories.data || []).map((row) => ({ entity_type: 'dhf_node', entity_id: row.id, owner_id: row.user_id })),
    ...(dhfPosts.data || []).map((row) => ({ entity_type: 'dhf_post', entity_id: row.id, owner_id: row.user_id })),
    ...(dhfVideos.data || []).map((row) => ({ entity_type: 'dhf_video', entity_id: row.id, owner_id: null })),
    ...(growthCards.data || []).map((row) => ({ entity_type: 'growth_card', entity_id: row.id, owner_id: row.user_id })),
    ...(predictions.data || []).map((row) => ({ entity_type: 'astro_prediction', entity_id: row.id, owner_id: row.user_id })),
    ...(goals.data || []).map((row) => ({ entity_type: 'wisdom_goal', entity_id: row.id, owner_id: row.user_id })),
    ...(dms.data || []).map((row) => ({ entity_type: 'direct_message', entity_id: row.id, owner_id: row.sender_id })),
    ...(comments.data || []).map((row) => ({ entity_type: 'post_comment', entity_id: row.id, owner_id: row.user_id })),
    ...(visuals.data || []).map((row) => ({ entity_type: 'visual_memory', entity_id: row.id, owner_id: row.user_id })),
  ];
  if (!rows.length) return 0;
  const { error } = await db.from('zoe_search_index_queue').upsert(
    rows.map((row) => ({ ...row, status: 'pending', attempts: 0, available_at: new Date().toISOString(), last_error: null })),
    { onConflict: 'entity_type,entity_id' },
  );
  if (error) throw error;
  return rows.length;
}

/**
 * Requeues media entities (images / loops / media posts) so they are re-described
 * by the vision pipeline. By default only rows without a vision description are
 * requeued; `force` re-runs vision for every media row.
 */
async function enqueueVisionBackfill(db: ReturnType<typeof createClient>, force: boolean) {
  const { data: posts, error: postsError } = await db.from('posts')
    .select('id,user_id,media_url,media_preview_url,media_type,content');
  if (postsError) throw postsError;

  const media = (posts || []).filter((row) => Boolean(row.media_url || row.media_preview_url));
  if (!media.length) return 0;

  const { data: indexed, error: indexError } = await db.from('zoe_universal_index')
    .select('entity_id,content_synthesis,metadata')
    .in('entity_id', media.map((row) => row.id));
  if (indexError) throw indexError;

  const described = new Set(
    (indexed || [])
      .filter((row) =>
        (row.metadata as Record<string, unknown> | null)?.visualIndexed === true ||
        String(row.content_synthesis || '').includes('[Visual Data]'))
      .map((row) => row.entity_id as string),
  );

  const rows = media
    .filter((row) => force || !described.has(row.id as string))
    .map((row) => ({
      entity_type: row.media_type === 'video' ? 'loop_video' : row.media_type === 'image' ? 'image' : 'post',
      entity_id: row.id,
      owner_id: row.user_id,
    }));
  if (!rows.length) return 0;

  const { error } = await db.from('zoe_search_index_queue').upsert(
    rows.map((row) => ({ ...row, status: 'pending', attempts: 0, available_at: new Date().toISOString(), last_error: null })),
    { onConflict: 'entity_type,entity_id' },
  );
  if (error) throw error;
  return rows.length;
}

/** Per-entity-type index + vision coverage for the admin view and search filters. */
async function coverageSnapshot(db: ReturnType<typeof createClient>) {
  const { data, error } = await db.from('zoe_universal_index')
    .select('entity_type,content_synthesis,metadata').limit(5000);
  if (error) throw error;
  const coverage: Record<string, { indexed: number; withVision: number }> = {};
  for (const row of data || []) {
    const type = String(row.entity_type);
    coverage[type] = coverage[type] || { indexed: 0, withVision: 0 };
    coverage[type].indexed += 1;
    const hasVision = (row.metadata as Record<string, unknown> | null)?.visualIndexed === true ||
      String(row.content_synthesis || '').includes('[Visual Data]');
    if (hasVision) coverage[type].withVision += 1;
  }
  return coverage;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();

  try {
    // System drain: the scheduled cron authenticates with the service role key so
    // the queue keeps draining even when nobody is using the app.
    const bearer = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    const drainSecret = Deno.env.get('ZOE_INDEX_DRAIN_SECRET') || '';
    const presentedSecret = (req.headers.get('x-index-drain-secret') || '').trim();
    const isSystemDrain = (Boolean(SERVICE_ROLE) && bearer === SERVICE_ROLE)
      || (Boolean(drainSecret) && presentedSecret === drainSecret);
    const user = isSystemDrain ? null : await requireSearchUser(req);
    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('BACKEND_NOT_CONFIGURED');
    const body = await req.json().catch(() => ({}));
    // Keep each invocation inside the edge runtime budget; callers repeatedly
    // drain the durable queue in small resumable batches.
    const limit = Math.max(1, Math.min(Number(body?.limit) || 5, 25));
    const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Health/progress snapshot for the startup guard and the admin view.
    if (body?.stats === true) {
      const [indexed, pending, processing, failedCount, failedRows, newest] = await Promise.all([
        db.from('zoe_universal_index').select('id', { count: 'exact', head: true }),
        db.from('zoe_search_index_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        db.from('zoe_search_index_queue').select('id', { count: 'exact', head: true }).eq('status', 'processing'),
        db.from('zoe_search_index_queue').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
        db.from('zoe_search_index_queue').select('id,entity_type,entity_id,attempts,last_error,updated_at')
          .eq('status', 'failed').order('updated_at', { ascending: false }).limit(20),
        db.from('zoe_universal_index').select('updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      const coverage = await coverageSnapshot(db);
      return json({
        requestId,
        stats: {
          indexed: indexed.count ?? 0,
          pending: pending.count ?? 0,
          processing: processing.count ?? 0,
          failed: failedCount.count ?? 0,
          newestIndexedAt: newest.data?.updated_at ?? null,
        },
        coverage,
        failures: failedRows.data || [],
      });
    }

    // Keep each invocation inside the edge runtime budget; callers repeatedly
    const enqueued = body?.backfill === true && user
      ? await enqueueBackfill(db, user.id)
      : body?.visionBackfill === true
        ? await enqueueVisionBackfill(db, body?.force === true)
        : 0;


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
      user_id: user?.id ?? null,
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