CREATE TABLE public.platform_routes (
  path text PRIMARY KEY,
  label text NOT NULL,
  route_group text NOT NULL DEFAULT 'tools',
  dynamic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_routes TO authenticated;
GRANT ALL ON public.platform_routes TO service_role;
ALTER TABLE public.platform_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read routes" ON public.platform_routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage routes" ON public.platform_routes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.zoe_crawl_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger text NOT NULL DEFAULT 'manual',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  routes_checked integer NOT NULL DEFAULT 0,
  findings_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.zoe_crawl_runs TO authenticated;
GRANT ALL ON public.zoe_crawl_runs TO service_role;
ALTER TABLE public.zoe_crawl_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read crawl runs" ON public.zoe_crawl_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.zoe_crawl_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.zoe_crawl_runs(id) ON DELETE CASCADE,
  route text,
  finding_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  http_status integer,
  duration_ms integer,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.zoe_crawl_findings TO authenticated;
GRANT ALL ON public.zoe_crawl_findings TO service_role;
ALTER TABLE public.zoe_crawl_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read crawl findings" ON public.zoe_crawl_findings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_crawl_findings_run ON public.zoe_crawl_findings (run_id, severity);

CREATE TABLE public.zoe_shadow_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'shadow',
  basis text,
  recommendation text NOT NULL,
  live_recommendation text,
  confidence numeric NOT NULL DEFAULT 0,
  reviewed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.zoe_shadow_recommendations TO authenticated;
GRANT ALL ON public.zoe_shadow_recommendations TO service_role;
ALTER TABLE public.zoe_shadow_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own shadow recs" ON public.zoe_shadow_recommendations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_shadow_recs_user ON public.zoe_shadow_recommendations (user_id, created_at DESC);