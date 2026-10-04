ALTER TABLE public.notification_kinds ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.notification_kinds ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE public.notification_channel_settings (
  channel text PRIMARY KEY,
  label text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notification_channel_settings TO authenticated;
GRANT ALL ON public.notification_channel_settings TO service_role;
ALTER TABLE public.notification_channel_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read channel switches" ON public.notification_channel_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin changes channel switches" ON public.notification_channel_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.notification_channel_settings(channel,label) VALUES ('push','Phone push'),('email','Email'),('slack','Slack');

GRANT UPDATE ON public.notification_kinds TO authenticated;

CREATE OR REPLACE FUNCTION public.notifications_normalize_kind()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k_enabled boolean;
BEGIN
  SELECT enabled INTO k_enabled FROM public.notification_kinds WHERE kind = NEW.type;
  IF NOT FOUND THEN
    NEW.context_data := coalesce(NEW.context_data,'{}'::jsonb) || jsonb_build_object('original_type', NEW.type);
    NEW.type := 'system';
    SELECT enabled INTO k_enabled FROM public.notification_kinds WHERE kind = 'system';
  END IF;
  -- Admin switched this kind off platform-wide: skip quietly (end-to-end tests always pass through).
  IF k_enabled IS FALSE AND coalesce(NEW.context_data->>'e2e_test','') = '' THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notifications_normalize_kind() FROM PUBLIC, anon, authenticated;