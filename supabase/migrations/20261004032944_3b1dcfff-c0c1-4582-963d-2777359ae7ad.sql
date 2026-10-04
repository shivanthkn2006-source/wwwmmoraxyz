INSERT INTO public.edge_cron_tokens (name, token)
VALUES ('notification-push', encode(extensions.gen_random_bytes(24), 'hex'))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.notifications_send_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE tok text;
BEGIN
  IF NEW.type IN ('e2e_test', 'incoming_call') THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = NEW.user_id) THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.notification_channel_settings WHERE channel IN ('all','push') AND enabled = false) THEN RETURN NEW; END IF;
  SELECT token INTO tok FROM public.edge_cron_tokens WHERE name = 'notification-push';
  IF tok IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://qwufiqkeoyvqasimcmbd.supabase.co/functions/v1/notification-push',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token', tok),
    body := jsonb_build_object('id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- phone delivery must never block the in-app alert
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notifications_send_push() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notifications_send_push ON public.notifications;
CREATE TRIGGER notifications_send_push
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.notifications_send_push();