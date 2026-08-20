CREATE TABLE public.zoe_search_index_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('post', 'loop_video', 'image', 'quote', 'profile', 'chat', 'dhf_node')),
  entity_id UUID NOT NULL,
  owner_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

GRANT ALL ON public.zoe_search_index_queue TO service_role;

ALTER TABLE public.zoe_search_index_queue ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_zoe_search_queue_ready
  ON public.zoe_search_index_queue (status, available_at, created_at);

CREATE TABLE public.zoe_search_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('search', 'ingest', 'backfill')),
  user_id UUID,
  entity_type TEXT,
  result_count INTEGER,
  node_types JSONB NOT NULL DEFAULT '{}'::jsonb,
  timings JSONB NOT NULL DEFAULT '{}'::jsonb,
  degraded JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.zoe_search_events TO service_role;

ALTER TABLE public.zoe_search_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_zoe_search_events_request ON public.zoe_search_events (request_id);
CREATE INDEX idx_zoe_search_events_created ON public.zoe_search_events (created_at DESC);

CREATE OR REPLACE FUNCTION public.enqueue_zoe_search_entity(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_owner_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_entity_type NOT IN ('post', 'loop_video', 'image', 'quote', 'profile', 'chat', 'dhf_node') THEN
    RAISE EXCEPTION 'Unsupported search entity type';
  END IF;

  INSERT INTO public.zoe_search_index_queue (
    entity_type, entity_id, owner_id, status, attempts, available_at, last_error, updated_at
  ) VALUES (
    p_entity_type, p_entity_id, p_owner_id, 'pending', 0, now(), NULL, now()
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    status = 'pending',
    attempts = 0,
    available_at = now(),
    last_error = NULL,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_zoe_search_entity(TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_zoe_search_entity(TEXT, UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.queue_post_for_zoe_search()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_type TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.zoe_universal_index
      WHERE entity_id = OLD.id AND entity_type IN ('post', 'loop_video', 'image', 'quote');
    DELETE FROM public.zoe_search_index_queue
      WHERE entity_id = OLD.id AND entity_type IN ('post', 'loop_video', 'image', 'quote');
    RETURN OLD;
  END IF;

  resolved_type := CASE
    WHEN NEW.media_type = 'video' THEN 'loop_video'
    WHEN NEW.media_type = 'image' THEN 'image'
    WHEN lower(coalesce(NEW.content, '')) LIKE 'quote:%' THEN 'quote'
    ELSE 'post'
  END;

  PERFORM public.enqueue_zoe_search_entity(resolved_type, NEW.id, NEW.user_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_post_for_zoe_search() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_post_for_zoe_search() TO service_role;

DROP TRIGGER IF EXISTS queue_posts_for_zoe_search ON public.posts;
CREATE TRIGGER queue_posts_for_zoe_search
AFTER INSERT OR UPDATE OF content, media_url, media_preview_url, media_type, visibility OR DELETE
ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.queue_post_for_zoe_search();

CREATE OR REPLACE FUNCTION public.queue_profile_for_zoe_search()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.zoe_universal_index WHERE entity_type = 'profile' AND entity_id = OLD.user_id;
    DELETE FROM public.zoe_search_index_queue WHERE entity_type = 'profile' AND entity_id = OLD.user_id;
    RETURN OLD;
  END IF;

  PERFORM public.enqueue_zoe_search_entity('profile', NEW.user_id, NEW.user_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_profile_for_zoe_search() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_profile_for_zoe_search() TO service_role;

DROP TRIGGER IF EXISTS queue_profiles_for_zoe_search ON public.profiles;
CREATE TRIGGER queue_profiles_for_zoe_search
AFTER INSERT OR UPDATE OF username, display_name, bio, profile_photo_url
ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.queue_profile_for_zoe_search();

REVOKE ALL ON public.zoe_universal_index FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.zoe_universal_index FROM authenticated;
GRANT SELECT ON public.zoe_universal_index TO authenticated;
GRANT ALL ON public.zoe_universal_index TO service_role;

DROP POLICY IF EXISTS "zoe_index_read_policy" ON public.zoe_universal_index;
CREATE POLICY "zoe_index_read_policy" ON public.zoe_universal_index
FOR SELECT TO authenticated
USING (
  privacy_level = 'public'
  OR auth.uid() = owner_id
  OR (
    privacy_level = 'friends'
    AND EXISTS (
      SELECT 1
      FROM public.friendships f
      WHERE (f.user1_id = auth.uid() AND f.user2_id = owner_id)
         OR (f.user2_id = auth.uid() AND f.user1_id = owner_id)
    )
  )
);

CREATE OR REPLACE FUNCTION public.zoe_hybrid_search(
  query_embedding extensions.vector(1536),
  query_text TEXT,
  match_count INT DEFAULT 15,
  rrf_k INT DEFAULT 60
) RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_id UUID,
  content_synthesis TEXT,
  metadata JSONB,
  social_weight DOUBLE PRECISION,
  score DOUBLE PRECISION
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
WITH params AS (
  SELECT
    nullif(btrim(coalesce(query_text, '')), '') AS clean_query,
    greatest(1, least(coalesce(match_count, 15), 50)) AS safe_count,
    greatest(1, least(coalesce(rrf_k, 60), 1000)) AS safe_rrf_k
),
semantic_search AS (
  SELECT
    i.id, i.entity_type, i.entity_id, i.content_synthesis, i.metadata, i.social_weight,
    ROW_NUMBER() OVER (ORDER BY i.embedding OPERATOR(extensions.<=>) query_embedding) AS rank_ix
  FROM public.zoe_universal_index i, params p
  WHERE query_embedding IS NOT NULL AND i.embedding IS NOT NULL
  ORDER BY i.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT (SELECT safe_count * 2 FROM params)
),
keyword_search AS (
  SELECT
    i.id, i.entity_type, i.entity_id, i.content_synthesis, i.metadata, i.social_weight,
    ROW_NUMBER() OVER (
      ORDER BY ts_rank_cd(i.fts, websearch_to_tsquery('english', p.clean_query)) DESC
    ) AS rank_ix
  FROM public.zoe_universal_index i, params p
  WHERE p.clean_query IS NOT NULL
    AND i.fts @@ websearch_to_tsquery('english', p.clean_query)
  ORDER BY ts_rank_cd(i.fts, websearch_to_tsquery('english', p.clean_query)) DESC
  LIMIT (SELECT safe_count * 2 FROM params)
)
SELECT
  COALESCE(s.id, k.id),
  COALESCE(s.entity_type, k.entity_type),
  COALESCE(s.entity_id, k.entity_id),
  COALESCE(s.content_synthesis, k.content_synthesis),
  COALESCE(s.metadata, k.metadata),
  COALESCE(s.social_weight, k.social_weight),
  (
    (COALESCE(1.0 / (p.safe_rrf_k + s.rank_ix), 0.0)
      + COALESCE(1.0 / (p.safe_rrf_k + k.rank_ix), 0.0))
    * COALESCE(s.social_weight, k.social_weight, 1.0)
  )::DOUBLE PRECISION
FROM semantic_search s
FULL OUTER JOIN keyword_search k ON s.id = k.id
CROSS JOIN params p
ORDER BY 7 DESC
LIMIT (SELECT safe_count FROM params);
$$;

REVOKE EXECUTE ON FUNCTION public.zoe_hybrid_search(extensions.vector, TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zoe_hybrid_search(extensions.vector, TEXT, INT, INT) TO authenticated, service_role;