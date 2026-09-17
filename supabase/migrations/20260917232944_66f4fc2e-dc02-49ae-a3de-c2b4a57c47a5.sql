ALTER TABLE public.music_uploads DROP CONSTRAINT IF EXISTS music_uploads_file_size_bytes_check;
ALTER TABLE public.music_uploads ADD CONSTRAINT music_uploads_file_size_bytes_check CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800);

GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;