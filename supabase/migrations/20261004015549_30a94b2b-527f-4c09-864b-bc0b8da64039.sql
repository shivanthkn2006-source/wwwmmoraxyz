CREATE TABLE public.notification_kinds (
  kind text PRIMARY KEY,
  feature text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_kinds TO authenticated;
GRANT ALL ON public.notification_kinds TO service_role;
ALTER TABLE public.notification_kinds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read alert kinds" ON public.notification_kinds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage alert kinds" ON public.notification_kinds FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.notification_kinds(kind, feature, label) VALUES
('like','likes','Like'),('post_like','likes','Post like'),('comment_like','likes','Comment like'),
('comment','comments','Comment'),('post_comment','comments','Post comment'),('comment_reply','replies','Comment reply'),
('mention','tags','Mention'),('post_tag','tags','Tag'),
('follow','friends','Follow'),('friend_request','friends','Friend request'),('friend_request_accepted','friends','Friend accepted'),('nearby_friend','friends','Nearby friend'),
('new_post','posts','New post'),('private_timeline_invite','posts','Timeline invite'),('private_timeline_post','posts','Timeline post'),
('badge_earned','badges','Badge'),('challenge_completed','badges','Challenge'),('leaderboard_position','badges','Leaderboard'),
('message','messages','Message'),('missed_call','calls','Missed call'),
('friend_music_listen','music','Friend listening'),('playlist_share','music','Playlist share'),
('growth_insight','growth','Growth card'),('dhf_essay','dhf','DHF essay'),('humor_drop','lol','Zoe''s LOL'),
('smart_suggestion','zoe','Suggestion'),('lisa_suggestion','zoe','Suggestion'),('interest_match','zoe','Interest match'),('zoe_sentry','zoe','Zoe sentry'),
('admin_notice','admin','Admin notice'),('uptime_alert','admin','Uptime'),('warning','admin','Warning'),('moderation_alert','admin','Moderation'),
('system','system','General'),('test','system','Test alert');

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

CREATE OR REPLACE FUNCTION public.notifications_normalize_kind()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type IS NULL OR NOT EXISTS (SELECT 1 FROM public.notification_kinds WHERE kind = NEW.type) THEN
    NEW.context_data := coalesce(NEW.context_data,'{}'::jsonb) || jsonb_build_object('original_type', NEW.type);
    NEW.type := 'system';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notifications_normalize_kind BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notifications_normalize_kind();

CREATE OR REPLACE FUNCTION public.notify_direct_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.receiver_id IS NOT NULL AND NEW.receiver_id <> NEW.sender_id THEN
    INSERT INTO public.notifications(user_id, type, from_user_id, context_data)
    VALUES (NEW.receiver_id, 'message', NEW.sender_id,
      jsonb_build_object('message_id', NEW.id, 'preview', left(coalesce(NEW.content, '[media]'), 80)));
  END IF;
  RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END $$;
CREATE TRIGGER notify_direct_message AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_direct_message();