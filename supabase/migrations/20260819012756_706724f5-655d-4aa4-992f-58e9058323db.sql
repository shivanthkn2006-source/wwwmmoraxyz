
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility_created_at ON public.posts (visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_created_at ON public.posts (user_id, created_at DESC);

CREATE OR REPLACE VIEW public.feed_posts_safe AS
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
  CASE WHEN media_preview_url LIKE 'data:%' AND length(media_preview_url) > 120000 THEN NULL ELSE media_preview_url END AS media_preview_url
FROM posts;

GRANT SELECT ON public.feed_posts_safe TO authenticated;
