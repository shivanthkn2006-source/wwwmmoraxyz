CREATE TABLE public.music_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_playlists TO authenticated;
GRANT ALL ON public.music_playlists TO service_role;

ALTER TABLE public.music_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their own playlists"
ON public.music_playlists FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX music_playlists_user_idx ON public.music_playlists (user_id, position, created_at);

CREATE TRIGGER music_playlists_touch
BEFORE UPDATE ON public.music_playlists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();