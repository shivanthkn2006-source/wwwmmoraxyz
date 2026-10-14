CREATE TABLE public.vr_story_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  ref text NOT NULL,
  platform text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.vr_story_events TO authenticated;
GRANT ALL ON public.vr_story_events TO service_role;
ALTER TABLE public.vr_story_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members log own story events" ON public.vr_story_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND length(kind) <= 40 AND length(ref) <= 80);
CREATE POLICY "Admin reads story events" ON public.vr_story_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX vr_story_events_ref_idx ON public.vr_story_events (kind, ref, created_at DESC);