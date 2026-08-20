CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.zoe_universal_index (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  content_synthesis TEXT NOT NULL,
  fts TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', coalesce(content_synthesis, ''))) STORED,
  embedding VECTOR(1536),
  privacy_level TEXT NOT NULL DEFAULT 'private' CHECK (privacy_level IN ('public', 'friends', 'private')),
  social_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_zoe_universal_entity
  ON public.zoe_universal_index (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_zoe_universal_embedding
  ON public.zoe_universal_index USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_zoe_universal_fts
  ON public.zoe_universal_index USING gin (fts);

CREATE INDEX IF NOT EXISTS idx_zoe_universal_owner
  ON public.zoe_universal_index (owner_id);

GRANT SELECT ON public.zoe_universal_index TO authenticated;
GRANT ALL ON public.zoe_universal_index TO service_role;

ALTER TABLE public.zoe_universal_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zoe_index_read_policy" ON public.zoe_universal_index;
CREATE POLICY "zoe_index_read_policy" ON public.zoe_universal_index
FOR SELECT TO authenticated
USING (privacy_level = 'public' OR auth.uid() = owner_id);

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
WITH semantic_search AS (
  SELECT
    i.id, i.entity_type, i.entity_id, i.content_synthesis, i.metadata, i.social_weight,
    ROW_NUMBER() OVER (ORDER BY i.embedding OPERATOR(extensions.<=>) query_embedding) AS rank_ix
  FROM public.zoe_universal_index i
  WHERE query_embedding IS NOT NULL AND i.embedding IS NOT NULL
  ORDER BY i.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT match_count * 2
),
keyword_search AS (
  SELECT
    i.id, i.entity_type, i.entity_id, i.content_synthesis, i.metadata, i.social_weight,
    ROW_NUMBER() OVER (ORDER BY ts_rank_cd(i.fts, websearch_to_tsquery('english', query_text)) DESC) AS rank_ix
  FROM public.zoe_universal_index i
  WHERE query_text IS NOT NULL
    AND i.fts @@ websearch_to_tsquery('english', query_text)
  ORDER BY ts_rank_cd(i.fts, websearch_to_tsquery('english', query_text)) DESC
  LIMIT match_count * 2
)
SELECT
  COALESCE(s.id, k.id) AS id,
  COALESCE(s.entity_type, k.entity_type) AS entity_type,
  COALESCE(s.entity_id, k.entity_id) AS entity_id,
  COALESCE(s.content_synthesis, k.content_synthesis) AS content_synthesis,
  COALESCE(s.metadata, k.metadata) AS metadata,
  COALESCE(s.social_weight, k.social_weight) AS social_weight,
  (
    (COALESCE(1.0 / (rrf_k + s.rank_ix), 0.0) + COALESCE(1.0 / (rrf_k + k.rank_ix), 0.0))
    * COALESCE(s.social_weight, k.social_weight, 1.0)
  )::DOUBLE PRECISION AS score
FROM semantic_search s
FULL OUTER JOIN keyword_search k ON s.id = k.id
ORDER BY score DESC
LIMIT match_count;
$$;

REVOKE EXECUTE ON FUNCTION public.zoe_hybrid_search(extensions.vector, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.zoe_hybrid_search(extensions.vector, TEXT, INT, INT) TO authenticated, service_role;