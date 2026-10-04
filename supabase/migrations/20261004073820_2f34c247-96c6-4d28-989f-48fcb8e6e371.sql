CREATE TABLE public.spatial_tile_cache (
  tile_key text PRIMARY KEY,
  data jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.spatial_tile_cache TO service_role;
ALTER TABLE public.spatial_tile_cache ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS share_real_location boolean NOT NULL DEFAULT false;