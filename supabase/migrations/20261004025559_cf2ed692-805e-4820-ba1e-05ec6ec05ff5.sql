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
    INSERT INTO public.notifications(user_id, from_user_id, type, context_data)
    VALUES (NEW.user_id, NEW.user_id, t, jsonb_build_object('title', title, 'message', msg, 'feature', 'vr', 'link', '/vr-world'));
  EXCEPTION WHEN others THEN NULL; -- never block karma
  END;
  RETURN NEW;
END $function$;
REVOKE EXECUTE ON FUNCTION public.notify_vr_karma() FROM PUBLIC, anon, authenticated;