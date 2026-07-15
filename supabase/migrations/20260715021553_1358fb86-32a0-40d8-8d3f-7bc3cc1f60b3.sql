-- Re-infer legacy media types so previews/playback do not trust stale tags.
UPDATE public.posts
SET media_type = CASE
  WHEN media_url IS NULL THEN media_type
  WHEN media_url ILIKE 'data:video/%' THEN 'video'
  WHEN media_url ILIKE 'data:image/%' THEN 'image'
  WHEN lower(split_part(media_url, '?', 1)) ~ '\.(mp4|webm|mov|ogg|m4v)$' THEN 'video'
  WHEN lower(split_part(media_url, '?', 1)) ~ '\.(jpe?g|png|webp|gif|avif|heic)$' THEN 'image'
  ELSE media_type
END,
updated_at = now()
WHERE media_url IS NOT NULL
  AND media_type IS DISTINCT FROM CASE
    WHEN media_url ILIKE 'data:video/%' THEN 'video'
    WHEN media_url ILIKE 'data:image/%' THEN 'image'
    WHEN lower(split_part(media_url, '?', 1)) ~ '\.(mp4|webm|mov|ogg|m4v)$' THEN 'video'
    WHEN lower(split_part(media_url, '?', 1)) ~ '\.(jpe?g|png|webp|gif|avif|heic)$' THEN 'image'
    ELSE media_type
  END;

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
  updated_at,
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

DROP POLICY IF EXISTS "Admins can view all feed diagnostics" ON public.feed_diagnostics_log;
CREATE POLICY "Admins can view all feed diagnostics"
ON public.feed_diagnostics_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
