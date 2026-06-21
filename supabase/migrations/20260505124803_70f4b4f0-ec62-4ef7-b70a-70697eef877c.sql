CREATE OR REPLACE FUNCTION public.enforce_post_media_size()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_inline_bytes INTEGER := 2621440; -- 2.5MB
BEGIN
  IF NEW.media_url IS NOT NULL
     AND NEW.media_url LIKE 'data:%'
     AND length(NEW.media_url) > max_inline_bytes THEN
    RAISE EXCEPTION 'Inline media exceeds 2.5MB limit (got % bytes). Use a thumbnail or storage URL instead.', length(NEW.media_url)
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_post_media_size ON public.posts;
CREATE TRIGGER trg_enforce_post_media_size
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.enforce_post_media_size();