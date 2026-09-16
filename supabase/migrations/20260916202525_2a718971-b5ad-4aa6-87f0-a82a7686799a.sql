CREATE TABLE public.music_profiles (
  user_id UUID NOT NULL PRIMARY KEY DEFAULT auth.uid(),
  genres TEXT[] NOT NULL DEFAULT '{}',
  moods TEXT[] NOT NULL DEFAULT '{}',
  artists TEXT[] NOT NULL DEFAULT '{}',
  favorite_tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_profiles TO authenticated;
GRANT ALL ON public.music_profiles TO service_role;

ALTER TABLE public.music_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read music taste profiles"
ON public.music_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members create own music profile"
ON public.music_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members update own music profile"
ON public.music_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members delete own music profile"
ON public.music_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER music_profiles_set_updated_at
BEFORE UPDATE ON public.music_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();