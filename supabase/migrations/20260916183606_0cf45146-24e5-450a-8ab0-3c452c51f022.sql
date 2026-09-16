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
        SELECT 1
        FROM public.friendships f
        WHERE (f.user1_id = NEW.user_id AND f.user2_id = r.user_id)
           OR (f.user2_id = NEW.user_id AND f.user1_id = r.user_id)
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

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type = ANY (ARRAY[
      'like','comment','follow','mention','friend_request','friend_request_accepted','new_post',
      'badge_earned','challenge_completed','leaderboard_position','nearby_friend','smart_suggestion',
      'admin_notice','private_timeline_invite','private_timeline_post','post_like','lisa_suggestion',
      'comment_like','post_tag','post_comment','interest_match','dhf_essay',
      'uptime_alert','zoe_sentry','message','warning','moderation_alert','friend_music_listen'
    ])
  );