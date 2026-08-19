
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_video boolean
  GENERATED ALWAYS AS (
    media_type = 'video'
    OR media_url LIKE 'data:video/%'
    OR lower(coalesce(media_url,'')) LIKE '%.mp4%'
    OR lower(coalesce(media_url,'')) LIKE '%.webm%'
    OR lower(coalesce(media_url,'')) LIKE '%.mov%'
    OR lower(coalesce(media_url,'')) LIKE '%.m4v%'
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_posts_is_video_created_at ON public.posts (is_video, created_at DESC);

DROP VIEW IF EXISTS public.feed_posts_safe;
CREATE VIEW public.feed_posts_safe
WITH (security_invoker = true) AS
SELECT id,
  user_id,
  content,
  CASE WHEN media_url LIKE 'data:%' AND length(media_url) > 120000 THEN NULL ELSE media_url END AS media_url,
  media_type,
  likes_count,
  comments_count,
  created_at,
  updated_at,
  visibility,
  private_timeline_id,
  (media_url IS NOT NULL AND media_url LIKE 'data:%' AND length(media_url) > 120000) AS has_deferred_media,
  length(COALESCE(media_url, '')) AS media_size,
  CASE WHEN media_preview_url LIKE 'data:%' AND length(media_preview_url) > 120000 THEN NULL ELSE media_preview_url END AS media_preview_url,
  is_video
FROM posts;

GRANT SELECT ON public.feed_posts_safe TO authenticated;
