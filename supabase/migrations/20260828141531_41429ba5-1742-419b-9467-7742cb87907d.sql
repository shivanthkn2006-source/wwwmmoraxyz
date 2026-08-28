REVOKE ALL ON FUNCTION public.enforce_posts_bucket_upload_rules() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_posts_bucket_upload_rules() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_posts_bucket_upload_rules() FROM authenticated;