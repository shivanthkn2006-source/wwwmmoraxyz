-- Add location fields for Selfie City / map pins
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision,
  ADD COLUMN IF NOT EXISTS location_name text;

-- Helpful index for geo queries
CREATE INDEX IF NOT EXISTS idx_posts_location_lat_lng ON public.posts (location_lat, location_lng);
