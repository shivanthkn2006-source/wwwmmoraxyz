ALTER TABLE public.platform_visits ADD COLUMN IF NOT EXISTS site_host text;
CREATE INDEX IF NOT EXISTS platform_visits_site_host_idx ON public.platform_visits(site_host);