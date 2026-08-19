CREATE TABLE IF NOT EXISTS public.zoe_daily_motivations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_date date not null,
  theme text not null default 'daily-routine',
  headline text not null,
  body text not null,
  action_step text not null default '',
  quote text not null default '',
  poster_path text,
  source text not null default 'model',
  created_at timestamptz not null default now(),
  unique (user_id, target_date)
);

GRANT SELECT ON public.zoe_daily_motivations TO authenticated;
GRANT ALL ON public.zoe_daily_motivations TO service_role;

ALTER TABLE public.zoe_daily_motivations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read their own motivation" ON public.zoe_daily_motivations;
CREATE POLICY "Members read their own motivation"
  ON public.zoe_daily_motivations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS zoe_daily_motivations_user_date_idx
  ON public.zoe_daily_motivations (user_id, target_date DESC);