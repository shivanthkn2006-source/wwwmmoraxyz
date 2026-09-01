CREATE TABLE public.dhf_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  figure_slug TEXT NOT NULL,
  figure_name TEXT NOT NULL,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'wisdom',
  youtube_video_id TEXT,
  youtube_url TEXT,
  youtube_channel TEXT,
  tiktok_url TEXT,
  instagram_url TEXT,
  thumbnail_url TEXT,
  source TEXT NOT NULL DEFAULT 'youtube_api',
  published_at TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX dhf_videos_youtube_video_id_key ON public.dhf_videos (youtube_video_id) WHERE youtube_video_id IS NOT NULL;
CREATE INDEX dhf_videos_active_created_idx ON public.dhf_videos (active, created_at DESC);
CREATE INDEX dhf_videos_figure_idx ON public.dhf_videos (figure_slug);

GRANT SELECT ON public.dhf_videos TO anon;
GRANT SELECT ON public.dhf_videos TO authenticated;
GRANT ALL ON public.dhf_videos TO service_role;

ALTER TABLE public.dhf_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active DHF videos"
ON public.dhf_videos FOR SELECT
USING (active = true);

CREATE POLICY "Admins manage DHF videos"
ON public.dhf_videos FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.dhf_video_dispatch_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  requested INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  detail JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT ON public.dhf_video_dispatch_runs TO authenticated;
GRANT ALL ON public.dhf_video_dispatch_runs TO service_role;

ALTER TABLE public.dhf_video_dispatch_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read DHF video dispatch runs"
ON public.dhf_video_dispatch_runs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_dhf_videos()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER dhf_videos_touch
BEFORE UPDATE ON public.dhf_videos
FOR EACH ROW EXECUTE FUNCTION public.touch_dhf_videos();