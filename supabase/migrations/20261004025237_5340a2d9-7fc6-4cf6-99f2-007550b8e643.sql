-- Master switch lives separately from per-feature switches.
INSERT INTO public.notification_channel_settings(channel, label, enabled)
VALUES ('all', 'All platform notifications', true)
ON CONFLICT (channel) DO NOTHING;

INSERT INTO public.notification_kinds(kind, feature, label, enabled) VALUES
 ('vr_collectible','vr','Hidden item collected',true),
 ('vr_activity_reward','vr','Walk/run/cycle/workout karma earned',true),
 ('vr_purchase','vr','VR shop item unlocked',true),
 ('karma_gift','vr','Karma gift received',true)
ON CONFLICT (kind) DO NOTHING;

CREATE OR REPLACE FUNCTION public.notifications_normalize_kind()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE k_enabled boolean; master boolean;
BEGIN
  SELECT enabled INTO k_enabled FROM public.notification_kinds WHERE kind = NEW.type;
  IF NOT FOUND THEN
    NEW.context_data := coalesce(NEW.context_data,'{}'::jsonb) || jsonb_build_object('original_type', NEW.type);
    NEW.type := 'system';
    SELECT enabled INTO k_enabled FROM public.notification_kinds WHERE kind = 'system';
  END IF;
  IF coalesce(NEW.context_data->>'e2e_test','') = '' THEN
    SELECT enabled INTO master FROM public.notification_channel_settings WHERE channel = 'all';
    IF master IS FALSE OR k_enabled IS FALSE THEN RETURN NULL; END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.notify_vr_karma()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE t text; title text; msg text;
BEGIN
  IF NEW.reason IN ('walking','running','cycling','workout','riding','vr_talk') AND NEW.delta > 0 THEN
    t := 'vr_activity_reward'; title := 'Karma earned';
    msg := '+' || NEW.delta || ' karma for ' || replace(NEW.reason,'_',' ');
  ELSIF NEW.reason LIKE 'vr\_%' ESCAPE '\' AND NEW.delta < 0 THEN
    t := 'vr_purchase'; title := 'Unlocked in VR World';
    msg := initcap(replace(substr(NEW.reason,4),'_',' ')) || ' unlocked for ' || abs(NEW.delta) || ' karma';
  ELSIF NEW.reason = 'gift_received' THEN
    t := 'karma_gift'; title := 'Karma gift';
    msg := 'You received ' || NEW.delta || ' karma';
  ELSE
    RETURN NEW;
  END IF;
  BEGIN
    INSERT INTO public.notifications(user_id, from_user_id, type, priority, context_data)
    VALUES (NEW.user_id, NEW.user_id, t, 'normal', jsonb_build_object('title', title, 'message', msg, 'feature', 'vr', 'link', '/vr-world'));
  EXCEPTION WHEN others THEN NULL; -- never block karma
  END;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_notify_vr_karma ON public.karma_ledger;
CREATE TRIGGER trg_notify_vr_karma AFTER INSERT ON public.karma_ledger
FOR EACH ROW EXECUTE FUNCTION public.notify_vr_karma();