-- 1. feed_events: raw intimacy signals (who interacted with whom, how deeply)
CREATE TABLE public.feed_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('view','dwell','like','comment','reply','share','save','profile_visit','dm','replay','skip')),
  dwell_ms INTEGER NOT NULL DEFAULT 0 CHECK (dwell_ms >= 0 AND dwell_ms <= 3600000),
  weight NUMERIC NOT NULL DEFAULT 1 CHECK (weight >= 0 AND weight <= 100),
  surface TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_feed_events_user_created ON public.feed_events (user_id, created_at DESC);
CREATE INDEX idx_feed_events_pair ON public.feed_events (user_id, target_user_id, created_at DESC);
GRANT SELECT, INSERT ON public.feed_events TO authenticated;
GRANT ALL ON public.feed_events TO service_role;
ALTER TABLE public.feed_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed_events_own_select" ON public.feed_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "feed_events_own_insert" ON public.feed_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 2. intimacy_scores: derived closeness edge per (user -> target)
CREATE TABLE public.intimacy_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0 CHECK (score >= 0),
  reciprocity NUMERIC NOT NULL DEFAULT 0 CHECK (reciprocity >= 0 AND reciprocity <= 1),
  depth_ratio NUMERIC NOT NULL DEFAULT 0 CHECK (depth_ratio >= 0 AND depth_ratio <= 1),
  event_count INTEGER NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_user_id)
);
CREATE INDEX idx_intimacy_scores_user ON public.intimacy_scores (user_id, score DESC);
GRANT SELECT ON public.intimacy_scores TO authenticated;
GRANT ALL ON public.intimacy_scores TO service_role;
ALTER TABLE public.intimacy_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intimacy_scores_own_select" ON public.intimacy_scores FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 3. legacy_memories: digital legacy vault entries
CREATE TABLE public.legacy_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body TEXT CHECK (char_length(body) <= 20000),
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image','video','audio','document')),
  recipients TEXT[] NOT NULL DEFAULT '{}',
  unlock_at TIMESTAMPTZ,
  is_sealed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_legacy_memories_user ON public.legacy_memories (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legacy_memories TO authenticated;
GRANT ALL ON public.legacy_memories TO service_role;
ALTER TABLE public.legacy_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legacy_memories_own_all" ON public.legacy_memories FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER update_legacy_memories_updated_at BEFORE UPDATE ON public.legacy_memories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. generational cohort on profiles (used for adaptive phrasing only)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_cohort TEXT CHECK (age_cohort IN ('genz','millennial','genx','boomer','unspecified'));

-- 5. server-side recompute of intimacy edges from raw events (90-day decay window)
CREATE OR REPLACE FUNCTION public.recompute_intimacy_scores(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rows INTEGER;
BEGIN
  IF _user_id IS NULL OR _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH agg AS (
    SELECT
      e.user_id,
      e.target_user_id,
      SUM(e.weight * exp(-EXTRACT(EPOCH FROM (now() - e.created_at)) / 7776000.0)) AS score,
      SUM(CASE WHEN e.event_type IN ('comment','reply','dm','share','save') THEN 1 ELSE 0 END)::NUMERIC
        / GREATEST(COUNT(*), 1) AS depth_ratio,
      COUNT(*)::INTEGER AS event_count,
      MAX(e.created_at) AS last_interaction_at
    FROM public.feed_events e
    WHERE e.user_id = _user_id
      AND e.target_user_id IS NOT NULL
      AND e.target_user_id <> e.user_id
      AND e.created_at > now() - INTERVAL '90 days'
    GROUP BY e.user_id, e.target_user_id
  ), recip AS (
    SELECT a.*,
      LEAST(1.0, (
        SELECT COUNT(*)::NUMERIC FROM public.feed_events b
        WHERE b.user_id = a.target_user_id AND b.target_user_id = a.user_id
          AND b.created_at > now() - INTERVAL '90 days'
      ) / GREATEST(a.event_count, 1)) AS reciprocity
    FROM agg a
  )
  INSERT INTO public.intimacy_scores AS s
    (user_id, target_user_id, score, reciprocity, depth_ratio, event_count, last_interaction_at, computed_at)
  SELECT user_id, target_user_id,
         ROUND(score * (1 + reciprocity) * (1 + depth_ratio), 4),
         ROUND(reciprocity, 4), ROUND(depth_ratio, 4), event_count, last_interaction_at, now()
  FROM recip
  ON CONFLICT (user_id, target_user_id) DO UPDATE SET
    score = EXCLUDED.score,
    reciprocity = EXCLUDED.reciprocity,
    depth_ratio = EXCLUDED.depth_ratio,
    event_count = EXCLUDED.event_count,
    last_interaction_at = EXCLUDED.last_interaction_at,
    computed_at = now();

  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows;
END;
$$;
REVOKE ALL ON FUNCTION public.recompute_intimacy_scores(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_intimacy_scores(UUID) TO authenticated;