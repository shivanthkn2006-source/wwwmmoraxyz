CREATE OR REPLACE VIEW public.feed_posts_safe
WITH (security_invoker = on) AS
SELECT
  id,
  user_id,
  content,
  CASE
    WHEN media_url IS NOT NULL
      AND media_url LIKE 'data:%'
      AND length(media_url) > 900000
    THEN NULL
    ELSE media_url
  END AS media_url,
  media_type,
  likes_count,
  comments_count,
  created_at,
  visibility,
  private_timeline_id,
  (
    media_url IS NOT NULL
    AND media_url LIKE 'data:%'
    AND length(media_url) > 900000
  ) AS has_deferred_media,
  length(coalesce(media_url, '')) AS media_size
FROM public.posts;

GRANT SELECT ON public.feed_posts_safe TO anon, authenticated;
GRANT SELECT ON public.feed_posts_safe TO service_role;

CREATE TABLE IF NOT EXISTS public.feed_diagnostics_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL,
  code text,
  message text,
  query text,
  duration_ms integer,
  row_count integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT, SELECT ON public.feed_diagnostics_log TO authenticated;
GRANT ALL ON public.feed_diagnostics_log TO service_role;

CREATE INDEX IF NOT EXISTS idx_feed_diag_user_created ON public.feed_diagnostics_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_diag_status_created ON public.feed_diagnostics_log(status, created_at DESC);

ALTER TABLE public.feed_diagnostics_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own feed diagnostics" ON public.feed_diagnostics_log;
CREATE POLICY "Users can create their own feed diagnostics"
  ON public.feed_diagnostics_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own feed diagnostics" ON public.feed_diagnostics_log;
CREATE POLICY "Users can view their own feed diagnostics"
  ON public.feed_diagnostics_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage feed diagnostics" ON public.feed_diagnostics_log;
CREATE POLICY "Service role can manage feed diagnostics"
  ON public.feed_diagnostics_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);