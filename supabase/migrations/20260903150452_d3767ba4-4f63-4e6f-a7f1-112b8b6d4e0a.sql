DROP FUNCTION IF EXISTS public.zoe_hybrid_search(extensions.vector, text, integer, integer);

CREATE FUNCTION public.zoe_hybrid_search(
  query_embedding extensions.vector,
  query_text text DEFAULT NULL,
  match_count integer DEFAULT 15,
  rrf_k integer DEFAULT 60
)
RETURNS TABLE (
  id uuid,
  entity_type text,
  entity_id uuid,
  content_synthesis text,
  metadata jsonb,
  social_weight double precision,
  created_at timestamptz,
  score double precision
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
WITH params AS (
  SELECT
    nullif(btrim(coalesce(query_text, '')), '') AS clean_query,
    greatest(1, least(coalesce(match_count, 15), 50)) AS safe_count,
    greatest(1, least(coalesce(rrf_k, 60), 1000)) AS safe_rrf_k
),
semantic_search AS (
  SELECT
    i.id, i.entity_type, i.entity_id, i.content_synthesis, i.metadata, i.social_weight, i.created_at,
    ROW_NUMBER() OVER (ORDER BY i.embedding OPERATOR(extensions.<=>) query_embedding) AS rank_ix
  FROM public.zoe_universal_index i, params p
  WHERE query_embedding IS NOT NULL AND i.embedding IS NOT NULL
  ORDER BY i.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT (SELECT safe_count * 2 FROM params)
),
keyword_search AS (
  SELECT
    i.id, i.entity_type, i.entity_id, i.content_synthesis, i.metadata, i.social_weight, i.created_at,
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
  COALESCE(s.created_at, k.created_at),
  (
    (COALESCE(1.0 / (p.safe_rrf_k + s.rank_ix), 0.0)
      + COALESCE(1.0 / (p.safe_rrf_k + k.rank_ix), 0.0))
    * COALESCE(s.social_weight, k.social_weight, 1.0)
  )::DOUBLE PRECISION
FROM semantic_search s
FULL OUTER JOIN keyword_search k ON s.id = k.id
CROSS JOIN params p
ORDER BY 8 DESC
LIMIT (SELECT safe_count FROM params);
$$;

GRANT EXECUTE ON FUNCTION public.zoe_hybrid_search(extensions.vector, text, integer, integer) TO authenticated, service_role;