CREATE OR REPLACE FUNCTION public.increment_shortcut_execution(shortcut_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- mmora_caller_guard: only the owner (or an admin) may bump a shortcut counter
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  UPDATE public.voice_shortcuts
  SET execution_count = execution_count + 1,
      updated_at = now()
  WHERE id = shortcut_uuid
    AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not authorized for this shortcut';
  END IF;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.video_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  playback_url text NOT NULL,
  low_bandwidth_url text,
  poster_url text,
  width integer,
  height integer,
  duration_seconds numeric,
  source_bytes bigint,
  delivered_bytes bigint,
  container text,
  codec text,
  transcoded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_assets TO authenticated;
GRANT ALL ON public.video_assets TO service_role;

ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in members can view video assets"
  ON public.video_assets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners can add their own video assets"
  ON public.video_assets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can update their own video assets"
  ON public.video_assets FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can remove their own video assets"
  ON public.video_assets FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS video_assets_post_idx ON public.video_assets(post_id);
CREATE INDEX IF NOT EXISTS video_assets_user_idx ON public.video_assets(user_id, created_at DESC);

CREATE TRIGGER update_video_assets_updated_at
  BEFORE UPDATE ON public.video_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();