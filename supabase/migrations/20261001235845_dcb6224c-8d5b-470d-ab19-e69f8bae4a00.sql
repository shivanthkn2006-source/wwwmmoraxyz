CREATE TABLE public.platform_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  user_id uuid,
  path text NOT NULL,
  referrer_host text,
  entered_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL DEFAULT 0,
  device_type text, os text, browser text,
  screen text, language text, timezone text,
  hardware jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text, country text, country_code text, region text, city text, district text,
  isp text, is_vpn boolean, is_hosting boolean, is_mobile_network boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX platform_visits_entered_idx ON public.platform_visits (entered_at DESC);
CREATE INDEX platform_visits_seen_idx ON public.platform_visits (last_seen_at DESC);
GRANT SELECT ON public.platform_visits TO authenticated;
GRANT ALL ON public.platform_visits TO service_role;
ALTER TABLE public.platform_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sole admin reads visits" ON public.platform_visits FOR SELECT TO authenticated USING (public.is_root_admin(auth.uid()));

CREATE TABLE public.platform_auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event text NOT NULL,
  display_name text,
  device_type text, os text, browser text,
  ip_address text, country text, city text, is_vpn boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX platform_auth_events_created_idx ON public.platform_auth_events (created_at DESC);
GRANT SELECT ON public.platform_auth_events TO authenticated;
GRANT ALL ON public.platform_auth_events TO service_role;
ALTER TABLE public.platform_auth_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sole admin reads auth events" ON public.platform_auth_events FOR SELECT TO authenticated USING (public.is_root_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_visits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_auth_events;