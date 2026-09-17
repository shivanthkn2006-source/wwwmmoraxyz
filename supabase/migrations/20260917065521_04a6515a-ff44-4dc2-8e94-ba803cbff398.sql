CREATE TABLE public.music_preference_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('play', 'skip', 'complete', 'replay', 'save', 'unsave', 'reaction', 'search', 'suggestion_select', 'playlist_add', 'explicit_preference')),
  track_id TEXT,
  track_title TEXT,
  track_artist TEXT,
  track_source TEXT,
  genre TEXT,
  mood TEXT,
  query_text TEXT,
  signal_weight NUMERIC NOT NULL DEFAULT 0,
  progress_ratio NUMERIC CHECK (progress_ratio IS NULL OR (progress_ratio >= 0 AND progress_ratio <= 1)),
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.music_preference_signals TO authenticated;
GRANT ALL ON public.music_preference_signals TO service_role;

ALTER TABLE public.music_preference_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own music preference signals"
ON public.music_preference_signals FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Members create own music preference signals"
ON public.music_preference_signals FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members delete own music preference signals"
ON public.music_preference_signals FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX music_preference_signals_user_time_idx
ON public.music_preference_signals (user_id, occurred_at DESC);

CREATE INDEX music_preference_signals_user_track_idx
ON public.music_preference_signals (user_id, track_id, occurred_at DESC)
WHERE track_id IS NOT NULL;

CREATE TABLE public.music_connect_context (
  user_id UUID NOT NULL PRIMARY KEY DEFAULT auth.uid(),
  taste_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  suggestion_keywords TEXT[] NOT NULL DEFAULT '{}',
  planetary_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_fingerprint TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_connect_context TO authenticated;
GRANT ALL ON public.music_connect_context TO service_role;

ALTER TABLE public.music_connect_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own music connect context"
ON public.music_connect_context FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Members create own music connect context"
ON public.music_connect_context FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members update own music connect context"
ON public.music_connect_context FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members delete own music connect context"
ON public.music_connect_context FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX music_connect_context_expiry_idx
ON public.music_connect_context (user_id, expires_at);

CREATE TRIGGER music_connect_context_set_updated_at
BEFORE UPDATE ON public.music_connect_context
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();