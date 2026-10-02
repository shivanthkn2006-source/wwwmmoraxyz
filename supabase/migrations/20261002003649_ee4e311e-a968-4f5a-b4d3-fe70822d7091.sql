ALTER TABLE public.platform_visits ADD COLUMN IF NOT EXISTS lat double precision, ADD COLUMN IF NOT EXISTS lon double precision, ADD COLUMN IF NOT EXISTS load_ms integer;

CREATE TABLE IF NOT EXISTS public.platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  user_id uuid,
  kind text NOT NULL,          -- 'tap' | 'error' | 'signup'
  name text NOT NULL,
  path text,
  device_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.platform_events TO service_role;
GRANT SELECT ON public.platform_events TO authenticated;
ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Root admin reads platform events" ON public.platform_events FOR SELECT TO authenticated USING (public.is_root_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS platform_events_created_idx ON public.platform_events(created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_events;

CREATE OR REPLACE FUNCTION public.prune_visitor_network_data() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.platform_visits SET ip_address = NULL, lat = NULL, lon = NULL WHERE entered_at < now() - interval '90 days' AND ip_address IS NOT NULL;
  UPDATE public.platform_auth_events SET ip_address = NULL WHERE created_at < now() - interval '90 days' AND ip_address IS NOT NULL;
  DELETE FROM public.platform_events WHERE created_at < now() - interval '180 days';
$$;
REVOKE EXECUTE ON FUNCTION public.prune_visitor_network_data() FROM PUBLIC, anon, authenticated;