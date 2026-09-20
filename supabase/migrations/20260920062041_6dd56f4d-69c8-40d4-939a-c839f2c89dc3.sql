ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activity_status text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS activity_message text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_activity_status_check CHECK (
    activity_status = ANY (ARRAY[
      'away'::text, 'cooking'::text, 'dining'::text, 'driving'::text,
      'family_time'::text, 'farming'::text, 'fitness'::text, 'gaming'::text,
      'library'::text, 'meditation'::text, 'movie'::text, 'online'::text,
      'party'::text, 'play'::text, 'sleep'::text, 'sports'::text,
      'studying'::text, 'transit'::text, 'traveling'::text, 'tv'::text,
      'vacation'::text, 'work'::text, 'yoga'::text
    ])
  ),
  ADD CONSTRAINT profiles_activity_message_length_check CHECK (
    activity_message IS NULL OR char_length(activity_message) <= 80
  );

UPDATE public.profiles
SET activity_status = status
WHERE status IN ('online', 'away');