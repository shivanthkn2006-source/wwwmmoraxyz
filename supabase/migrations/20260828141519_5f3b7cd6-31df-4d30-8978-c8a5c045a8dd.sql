CREATE OR REPLACE FUNCTION public.enforce_posts_bucket_upload_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  allowed_mimes TEXT[] := ARRAY[
    'video/mp4','video/webm','video/quicktime','video/ogg',
    'image/jpeg','image/png','image/webp','image/gif',
    'application/pdf','text/plain','text/markdown','text/csv','application/rtf',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text','application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation'
  ];
  mime_val TEXT;
  size_val BIGINT;
BEGIN
  IF NEW.bucket_id <> 'posts' THEN RETURN NEW; END IF;
  mime_val := COALESCE(NEW.metadata->>'mimetype', NEW.metadata->>'contentType');
  size_val := NULLIF(NEW.metadata->>'size','')::BIGINT;
  IF mime_val IS NULL OR NOT (mime_val = ANY(allowed_mimes)) THEN
    RAISE EXCEPTION 'Upload rejected: mimetype "%" is not allowed in bucket "posts".', COALESCE(mime_val,'(missing)');
  END IF;
  IF size_val IS NOT NULL AND size_val > 52428800 THEN
    RAISE EXCEPTION 'Upload rejected: file size % bytes exceeds the 50MB limit for bucket "posts".', size_val;
  END IF;
  RETURN NEW;
END;
$$;