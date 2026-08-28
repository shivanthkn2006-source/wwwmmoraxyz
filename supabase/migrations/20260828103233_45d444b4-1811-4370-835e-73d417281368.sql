-- ═══════════════════════════════════════════════════════════════
-- PERSONAL GROWTH ENGINE — isolated habit & content pipeline
-- Namespace: growth_*  (zero collision with existing tables)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.growth_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  focus_areas text[] NOT NULL DEFAULT '{}',
  reflection_style text NOT NULL DEFAULT 'actionable',
  delivery_frequency smallint NOT NULL DEFAULT 5,
  paused boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'UTC',
  onboarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT growth_prefs_style_chk CHECK (reflection_style IN ('actionable','philosophical','biographical','strategic')),
  CONSTRAINT growth_prefs_freq_chk CHECK (delivery_frequency BETWEEN 1 AND 5),
  CONSTRAINT growth_prefs_focus_chk CHECK (array_length(focus_areas, 1) IS NULL OR array_length(focus_areas, 1) <= 12)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_preferences TO authenticated;
GRANT ALL ON public.growth_preferences TO service_role;
ALTER TABLE public.growth_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "growth_prefs_owner_all" ON public.growth_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER growth_prefs_touch
  BEFORE UPDATE ON public.growth_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── generated insight rows ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.growth_feed_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot text NOT NULL,
  local_date date NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Growth',
  content text NOT NULL,
  actionable_step text,
  source text NOT NULL DEFAULT 'vault',
  status text NOT NULL DEFAULT 'shadow',
  correlation_id uuid,
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT growth_items_slot_chk CHECK (slot IN ('morning','midday','afternoon','evening','night')),
  CONSTRAINT growth_items_source_chk CHECK (source IN ('llm','vault')),
  CONSTRAINT growth_items_status_chk CHECK (status IN ('published','shadow')),
  CONSTRAINT growth_items_unique_slot UNIQUE (user_id, local_date, slot)
);

GRANT SELECT, UPDATE ON public.growth_feed_items TO authenticated;
GRANT ALL ON public.growth_feed_items TO service_role;
ALTER TABLE public.growth_feed_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "growth_items_owner_read" ON public.growth_feed_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "growth_items_owner_mark_seen" ON public.growth_feed_items
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS growth_items_user_date_idx
  ON public.growth_feed_items (user_id, local_date DESC, created_at DESC);

-- ── singleton worker state ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.growth_dispatch_state (
  id text PRIMARY KEY DEFAULT 'singleton',
  lease_owner text,
  lease_expires_at timestamptz,
  paused boolean NOT NULL DEFAULT false,
  paused_reason text,
  paused_at timestamptz,
  shadow_mode boolean NOT NULL DEFAULT true,
  consecutive_rate_limits smallint NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  last_run_processed integer NOT NULL DEFAULT 0,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.growth_dispatch_state TO authenticated;
GRANT ALL ON public.growth_dispatch_state TO service_role;
ALTER TABLE public.growth_dispatch_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "growth_state_admin_read" ON public.growth_dispatch_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.growth_dispatch_state (id) VALUES ('singleton')
  ON CONFLICT (id) DO NOTHING;