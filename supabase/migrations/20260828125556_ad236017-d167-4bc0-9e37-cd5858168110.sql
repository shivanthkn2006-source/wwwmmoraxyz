ALTER TABLE public.growth_dispatch_state
  ADD COLUMN IF NOT EXISTS last_candidate_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'growth_feed_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.growth_feed_items;
  END IF;
END
$$;