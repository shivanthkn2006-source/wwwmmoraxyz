CREATE TABLE public.music_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  artist TEXT NOT NULL DEFAULT 'My music' CHECK (char_length(artist) BETWEEN 1 AND 200),
  album TEXT CHECK (album IS NULL OR char_length(album) <= 200),
  storage_path TEXT NOT NULL,
  artwork_path TEXT,
  mime_type TEXT NOT NULL,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 12582912),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, storage_path)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_uploads TO authenticated;
GRANT ALL ON public.music_uploads TO service_role;
ALTER TABLE public.music_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own music uploads" ON public.music_uploads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members add own music uploads" ON public.music_uploads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members update own music uploads" ON public.music_uploads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members delete own music uploads" ON public.music_uploads FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX music_uploads_owner_created_idx ON public.music_uploads (user_id, created_at DESC);
CREATE INDEX music_uploads_owner_search_idx ON public.music_uploads (user_id, lower(title), lower(artist));
CREATE OR REPLACE FUNCTION public.touch_music_uploads_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER touch_music_uploads_updated_at BEFORE UPDATE ON public.music_uploads FOR EACH ROW EXECUTE FUNCTION public.touch_music_uploads_updated_at();

CREATE POLICY "Members read own music files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'music-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Members upload own music files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'music-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Members update own music files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'music-uploads' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'music-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Members delete own music files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'music-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);