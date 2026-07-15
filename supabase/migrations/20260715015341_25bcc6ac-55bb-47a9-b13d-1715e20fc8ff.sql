
-- Trigger-based MIME + size enforcement for the `posts` bucket.
-- Runs before every INSERT/UPDATE on storage.objects and blocks disallowed uploads.
CREATE OR REPLACE FUNCTION public.enforce_posts_bucket_upload_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  allowed_mimes TEXT[] := ARRAY[
    'video/mp4','video/webm','video/quicktime','video/ogg',
    'image/jpeg','image/png','image/webp','image/gif'
  ];
  max_bytes BIGINT := 52428800; -- 50 MB
  mime_val TEXT;
  size_val BIGINT;
BEGIN
  IF NEW.bucket_id <> 'posts' THEN
    RETURN NEW;
  END IF;

  mime_val := COALESCE(NEW.metadata->>'mimetype', NEW.metadata->>'contentType');
  size_val := NULLIF(NEW.metadata->>'size','')::BIGINT;

  IF mime_val IS NULL OR NOT (mime_val = ANY(allowed_mimes)) THEN
    RAISE EXCEPTION
      'Upload rejected: mimetype "%" is not allowed in bucket "posts". Allowed: %',
      COALESCE(mime_val,'(missing)'), array_to_string(allowed_mimes, ', ');
  END IF;

  IF size_val IS NOT NULL AND size_val > max_bytes THEN
    RAISE EXCEPTION
      'Upload rejected: file size % bytes exceeds the 50MB limit for bucket "posts".',
      size_val;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_posts_bucket_upload_rules_trg ON storage.objects;
CREATE TRIGGER enforce_posts_bucket_upload_rules_trg
  BEFORE INSERT OR UPDATE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_posts_bucket_upload_rules();
