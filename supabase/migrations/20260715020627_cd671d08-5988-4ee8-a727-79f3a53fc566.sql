ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS media_preview_url TEXT;

DROP VIEW IF EXISTS public.feed_posts_safe;

CREATE VIEW public.feed_posts_safe
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
  length(coalesce(media_url, '')) AS media_size,
  media_preview_url
FROM public.posts;

GRANT SELECT ON public.feed_posts_safe TO anon, authenticated;
GRANT SELECT ON public.feed_posts_safe TO service_role;