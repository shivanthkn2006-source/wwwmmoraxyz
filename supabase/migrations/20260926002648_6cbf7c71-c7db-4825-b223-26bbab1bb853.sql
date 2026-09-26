ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS utc_offset_minutes integer,
  ADD COLUMN IF NOT EXISTS timezone_confirmed_at timestamptz;