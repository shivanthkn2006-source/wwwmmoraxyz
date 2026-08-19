
CREATE TABLE IF NOT EXISTS public.astro_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  birth_date DATE NOT NULL,
  birth_time TIME NOT NULL DEFAULT '12:00:00',
  birth_timezone TEXT NOT NULL DEFAULT 'UTC',
  birth_latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  birth_longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  display_timezone TEXT NOT NULL DEFAULT 'UTC',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.astro_profiles TO authenticated;
GRANT ALL ON public.astro_profiles TO service_role;
ALTER TABLE public.astro_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "astro_profiles_own" ON public.astro_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.astro_mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mood_mode TEXT NOT NULL DEFAULT 'Balanced',
  intensity INT NOT NULL DEFAULT 3 CHECK (intensity BETWEEN 1 AND 5),
  notes TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.astro_mood_logs TO authenticated;
GRANT ALL ON public.astro_mood_logs TO service_role;
ALTER TABLE public.astro_mood_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "astro_mood_logs_own" ON public.astro_mood_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_astro_mood_logs_user ON public.astro_mood_logs(user_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS public.astro_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_date DATE NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('morning','noon','evening','night')),
  idempotency_key TEXT NOT NULL UNIQUE,
  transits_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
  prediction_headline TEXT NOT NULL,
  prediction_body TEXT NOT NULL,
  motivational_quote TEXT NOT NULL,
  poster_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','shadow','fallback','failed')),
  engine_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.astro_predictions TO authenticated;
GRANT ALL ON public.astro_predictions TO service_role;
ALTER TABLE public.astro_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "astro_predictions_own_read" ON public.astro_predictions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_astro_predictions_user_date ON public.astro_predictions(user_id, target_date DESC);

CREATE TABLE IF NOT EXISTS public.astro_feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prediction_id UUID REFERENCES public.astro_predictions(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL DEFAULT 'mora_zoe_daily',
  slot TEXT NOT NULL DEFAULT 'morning',
  content_text TEXT NOT NULL,
  media_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  publish_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.astro_feed_posts TO authenticated;
GRANT ALL ON public.astro_feed_posts TO service_role;
ALTER TABLE public.astro_feed_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "astro_feed_posts_own_read" ON public.astro_feed_posts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "astro_feed_posts_own_delete" ON public.astro_feed_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_astro_feed_posts_user ON public.astro_feed_posts(user_id, publish_at DESC);

CREATE TABLE IF NOT EXISTS public.astro_dispatch_state (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  shadow_mode BOOLEAN NOT NULL DEFAULT true,
  paused BOOLEAN NOT NULL DEFAULT false,
  pause_reason TEXT,
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  last_run_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  consecutive_rate_limits INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.astro_dispatch_state TO authenticated;
GRANT ALL ON public.astro_dispatch_state TO service_role;
ALTER TABLE public.astro_dispatch_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "astro_dispatch_state_admin_read" ON public.astro_dispatch_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER astro_profiles_updated_at BEFORE UPDATE ON public.astro_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
