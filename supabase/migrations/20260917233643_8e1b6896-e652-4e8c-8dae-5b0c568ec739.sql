CREATE TABLE public.music_playlist_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id uuid,
  owner_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  name text NOT NULL,
  tracks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX music_playlist_shares_recipient_idx ON public.music_playlist_shares (recipient_id, created_at DESC);
CREATE INDEX music_playlist_shares_owner_idx ON public.music_playlist_shares (owner_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_playlist_shares TO authenticated;
GRANT ALL ON public.music_playlist_shares TO service_role;

ALTER TABLE public.music_playlist_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their playlist shares"
  ON public.music_playlist_shares FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Recipients can view playlists shared with them"
  ON public.music_playlist_shares FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);

CREATE TRIGGER update_music_playlist_shares_updated_at
  BEFORE UPDATE ON public.music_playlist_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type = ANY (ARRAY[
      'like','comment','follow','mention','friend_request','friend_request_accepted','new_post',
      'badge_earned','challenge_completed','leaderboard_position','nearby_friend','smart_suggestion',
      'admin_notice','private_timeline_invite','private_timeline_post','post_like','lisa_suggestion',
      'comment_like','post_tag','post_comment','interest_match','dhf_essay',
      'uptime_alert','zoe_sentry','message','warning','moderation_alert','friend_music_listen',
      'playlist_share'
    ])
  );