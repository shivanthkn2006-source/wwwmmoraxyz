CREATE TABLE public.music_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_artist TEXT,
  track_artwork TEXT,
  track_source TEXT,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id, reaction)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_reactions TO authenticated;
GRANT ALL ON public.music_reactions TO service_role;
ALTER TABLE public.music_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in members can read music reactions"
  ON public.music_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members add their own music reactions"
  ON public.music_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members remove their own music reactions"
  ON public.music_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX music_reactions_track_idx ON public.music_reactions (track_id, reaction);
CREATE INDEX music_reactions_user_idx ON public.music_reactions (user_id, created_at DESC);

CREATE TABLE public.music_listens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_artist TEXT,
  track_artwork TEXT,
  track_source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.music_listens TO authenticated;
GRANT ALL ON public.music_listens TO service_role;
ALTER TABLE public.music_listens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in members can read music listens"
  ON public.music_listens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members log their own music listens"
  ON public.music_listens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX music_listens_track_idx ON public.music_listens (track_id, created_at DESC);
CREATE INDEX music_listens_user_idx ON public.music_listens (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_friends_music_listen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT DISTINCT r.user_id
    FROM public.music_reactions r
    WHERE r.track_id = NEW.track_id
      AND r.reaction = 'loved'
      AND r.user_id <> NEW.user_id
      AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE (f.user_id = NEW.user_id AND f.friend_id = r.user_id)
           OR (f.friend_id = NEW.user_id AND f.user_id = r.user_id)
      )
  LOOP
    INSERT INTO public.notifications (user_id, from_user_id, type, context_data)
    VALUES (
      target.user_id,
      NEW.user_id,
      'friend_music_listen',
      jsonb_build_object(
        'track_id', NEW.track_id,
        'track_title', NEW.track_title,
        'track_artist', NEW.track_artist,
        'track_artwork', NEW.track_artwork,
        'track_source', NEW.track_source
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER music_listens_notify_friends
AFTER INSERT ON public.music_listens
FOR EACH ROW EXECUTE FUNCTION public.notify_friends_music_listen();