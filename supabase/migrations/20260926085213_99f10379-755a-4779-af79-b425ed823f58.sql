CREATE TABLE public.humor_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_date date NOT NULL,
  slot smallint NOT NULL,
  metal text NOT NULL CHECK (metal IN ('iron','silver','lead','quicksilver')),
  headline text NOT NULL,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'nvidia',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (drop_date, slot, metal)
);
GRANT SELECT ON public.humor_drops TO authenticated;
GRANT ALL ON public.humor_drops TO service_role;
ALTER TABLE public.humor_drops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read humor drops" ON public.humor_drops FOR SELECT TO authenticated USING (true);
CREATE INDEX humor_drops_created_idx ON public.humor_drops (created_at DESC);