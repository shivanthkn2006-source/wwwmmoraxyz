ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media_size_bytes integer
    GENERATED ALWAYS AS (length(COALESCE(media_url, ''))) STORED,
  ADD COLUMN IF NOT EXISTS media_is_heavy boolean
    GENERATED ALWAYS AS (media_url IS NOT NULL AND media_url LIKE 'data:%' AND length(media_url) > 120000) STORED,
  ADD COLUMN IF NOT EXISTS preview_is_heavy boolean
    GENERATED ALWAYS AS (media_preview_url IS NOT NULL AND media_preview_url LIKE 'data:%' AND length(media_preview_url) > 120000) STORED;

CREATE OR REPLACE VIEW public.feed_posts_safe
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  content,
  CASE WHEN media_is_heavy THEN NULL::text ELSE media_url END AS media_url,
  media_type,
  likes_count,
  comments_count,
  created_at,
  updated_at,
  visibility,
  private_timeline_id,
  media_is_heavy AS has_deferred_media,
  media_size_bytes AS media_size,
  CASE WHEN preview_is_heavy THEN NULL::text ELSE media_preview_url END AS media_preview_url,
  is_video
FROM public.posts;

GRANT SELECT ON public.feed_posts_safe TO authenticated;
GRANT SELECT ON public.feed_posts_safe TO anon;
GRANT SELECT ON public.feed_posts_safe TO service_role;

CREATE INDEX IF NOT EXISTS idx_posts_feed_visibility_created
  ON public.posts (visibility, created_at DESC)
  WHERE private_timeline_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_posts_feed_video_created
  ON public.posts (created_at DESC)
  WHERE is_video AND private_timeline_id IS NULL;