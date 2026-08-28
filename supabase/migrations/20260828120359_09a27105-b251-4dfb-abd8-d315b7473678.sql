ALTER TABLE public.growth_preferences ADD COLUMN IF NOT EXISTS notify_on_new_insight boolean NOT NULL DEFAULT true;

ALTER TABLE public.growth_feed_items ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.growth_feed_items ADD COLUMN IF NOT EXISTS regen_count smallint NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.growth_card_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.growth_feed_items(id) ON DELETE CASCADE,
  slot text NOT NULL,
  category text,
  focus_areas text[] NOT NULL DEFAULT '{}',
  event_type text NOT NULL CHECK (event_type IN ('impression','click')),
  surface text NOT NULL DEFAULT 'home',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS growth_card_events_unique
  ON public.growth_card_events (user_id, item_id, event_type);
CREATE INDEX IF NOT EXISTS growth_card_events_slot_idx
  ON public.growth_card_events (slot, event_type);

GRANT SELECT, INSERT, DELETE ON public.growth_card_events TO authenticated;
GRANT ALL ON public.growth_card_events TO service_role;
ALTER TABLE public.growth_card_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "growth_card_events_own_select" ON public.growth_card_events;
CREATE POLICY "growth_card_events_own_select" ON public.growth_card_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "growth_card_events_own_insert" ON public.growth_card_events;
CREATE POLICY "growth_card_events_own_insert" ON public.growth_card_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "growth_card_events_own_delete" ON public.growth_card_events;
CREATE POLICY "growth_card_events_own_delete" ON public.growth_card_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "growth_card_events_admin_select" ON public.growth_card_events;
CREATE POLICY "growth_card_events_admin_select" ON public.growth_card_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.growth_dispatch_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'run',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  processed integer NOT NULL DEFAULT 0,
  written integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  vault integer NOT NULL DEFAULT 0,
  catchups integer NOT NULL DEFAULT 0,
  paused boolean NOT NULL DEFAULT false,
  parked boolean NOT NULL DEFAULT false,
  shadow_mode boolean NOT NULL DEFAULT true,
  errors text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS growth_dispatch_runs_started_idx
  ON public.growth_dispatch_runs (started_at DESC);

GRANT SELECT ON public.growth_dispatch_runs TO authenticated;
GRANT ALL ON public.growth_dispatch_runs TO service_role;
ALTER TABLE public.growth_dispatch_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "growth_dispatch_runs_admin_select" ON public.growth_dispatch_runs;
CREATE POLICY "growth_dispatch_runs_admin_select" ON public.growth_dispatch_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));