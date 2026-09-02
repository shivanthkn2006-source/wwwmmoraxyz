CREATE TABLE IF NOT EXISTS public.edge_function_probes (
  id uuid primary key default gen_random_uuid(),
  fn text not null,
  status integer not null,
  ok boolean not null default false,
  category text not null default 'unknown',
  note text,
  duration_ms integer,
  checked_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS edge_function_probes_checked_idx ON public.edge_function_probes (checked_at DESC);
CREATE INDEX IF NOT EXISTS edge_function_probes_fn_idx ON public.edge_function_probes (fn, checked_at DESC);
GRANT SELECT ON public.edge_function_probes TO authenticated;
GRANT ALL ON public.edge_function_probes TO service_role;
ALTER TABLE public.edge_function_probes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read edge probes" ON public.edge_function_probes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.dhf_link_health_runs (
  id uuid primary key default gen_random_uuid(),
  checked integer not null default 0,
  dead integer not null default 0,
  deactivated integer not null default 0,
  errors integer not null default 0,
  detail jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS dhf_link_health_runs_started_idx ON public.dhf_link_health_runs (started_at DESC);
GRANT SELECT ON public.dhf_link_health_runs TO authenticated;
GRANT ALL ON public.dhf_link_health_runs TO service_role;
ALTER TABLE public.dhf_link_health_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read link health" ON public.dhf_link_health_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.platform_load_tests (
  id uuid primary key default gen_random_uuid(),
  target text not null,
  concurrency integer not null,
  total_requests integer not null,
  succeeded integer not null default 0,
  failed integer not null default 0,
  p50_ms integer,
  p95_ms integer,
  p99_ms integer,
  max_ms integer,
  status_breakdown jsonb not null default '{}'::jsonb,
  notes text,
  ran_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS platform_load_tests_ran_idx ON public.platform_load_tests (ran_at DESC);
GRANT SELECT ON public.platform_load_tests TO authenticated;
GRANT ALL ON public.platform_load_tests TO service_role;
ALTER TABLE public.platform_load_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read load tests" ON public.platform_load_tests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));