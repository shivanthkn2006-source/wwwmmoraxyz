ALTER TABLE public.music_listens ADD COLUMN IF NOT EXISTS track_url TEXT;
ALTER TABLE public.music_reactions ADD COLUMN IF NOT EXISTS track_url TEXT;