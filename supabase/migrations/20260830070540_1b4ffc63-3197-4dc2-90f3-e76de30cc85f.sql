CREATE TABLE public.dhf_dispatch_lease (
  key TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'idle',
  leased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.dhf_dispatch_lease TO service_role;

ALTER TABLE public.dhf_dispatch_lease ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view compass dispatch leases"
ON public.dhf_dispatch_lease FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_dhf_dispatch_lease_updated_at
BEFORE UPDATE ON public.dhf_dispatch_lease
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();