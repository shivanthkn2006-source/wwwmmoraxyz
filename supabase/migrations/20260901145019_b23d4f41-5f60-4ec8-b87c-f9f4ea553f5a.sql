CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT edge_rate_limits_bucket_window_key UNIQUE (bucket, window_start)
);
GRANT ALL ON public.edge_rate_limits TO service_role;
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS edge_rate_limits_window_idx ON public.edge_rate_limits (window_start);

CREATE TABLE IF NOT EXISTS public.dhf_social_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_key text NOT NULL UNIQUE,
  headline text,
  category text,
  youtube_video_id text,
  youtube_url text,
  youtube_title text,
  youtube_channel text,
  tiktok_url text,
  instagram_url text,
  source text NOT NULL DEFAULT 'youtube_api',
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dhf_social_links TO authenticated;
GRANT SELECT ON public.dhf_social_links TO anon;
GRANT ALL ON public.dhf_social_links TO service_role;
ALTER TABLE public.dhf_social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read resolved social links"
  ON public.dhf_social_links FOR SELECT
  USING (true);