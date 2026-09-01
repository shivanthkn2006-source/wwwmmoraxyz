CREATE TABLE public.dhf_essay_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.dhf_daily_posts(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  delivered_at TIMESTAMP WITH TIME ZONE,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT dhf_essay_schedules_status_check CHECK (status IN ('scheduled','delivered','cancelled')),
  CONSTRAINT dhf_essay_schedules_unique UNIQUE (user_id, post_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dhf_essay_schedules TO authenticated;
GRANT ALL ON public.dhf_essay_schedules TO service_role;

ALTER TABLE public.dhf_essay_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own essay schedules"
  ON public.dhf_essay_schedules FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members schedule their own essays"
  ON public.dhf_essay_schedules FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.dhf_daily_posts p
      WHERE p.id = post_id AND p.user_id = dhf_essay_schedules.user_id
    )
  );

CREATE POLICY "Members update their own essay schedules"
  ON public.dhf_essay_schedules FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members delete their own essay schedules"
  ON public.dhf_essay_schedules FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_dhf_essay_schedules_due
  ON public.dhf_essay_schedules (scheduled_for)
  WHERE status = 'scheduled';

CREATE INDEX idx_dhf_essay_schedules_user
  ON public.dhf_essay_schedules (user_id, scheduled_for DESC);

CREATE OR REPLACE FUNCTION public.dhf_essay_schedules_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dhf_essay_schedules_touch
  BEFORE UPDATE ON public.dhf_essay_schedules
  FOR EACH ROW EXECUTE FUNCTION public.dhf_essay_schedules_touch();

-- Bounded, idempotent delivery sweep: at most 200 essays per run, and each row
-- flips to `delivered` in the same statement that creates its notification.
CREATE OR REPLACE FUNCTION public.deliver_due_dhf_essays()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delivered_count INTEGER := 0;
BEGIN
  WITH due AS (
    SELECT s.id, s.user_id, s.post_id
    FROM public.dhf_essay_schedules s
    WHERE s.status = 'scheduled'
      AND s.scheduled_for <= now()
    ORDER BY s.scheduled_for
    LIMIT 200
    FOR UPDATE SKIP LOCKED
  ), marked AS (
    UPDATE public.dhf_essay_schedules s
    SET status = 'delivered', delivered_at = now()
    FROM due
    WHERE s.id = due.id
    RETURNING s.user_id, s.post_id
  ), notified AS (
    INSERT INTO public.notifications (user_id, type, post_id, from_user_id, priority, context_data)
    SELECT m.user_id,
           'dhf_essay',
           NULL,
           m.user_id,
           4,
           jsonb_build_object('dhf_post_id', m.post_id, 'headline', p.headline, 'route', '/dhf/essay/' || m.post_id)
    FROM marked m
    JOIN public.dhf_daily_posts p ON p.id = m.post_id
    RETURNING 1
  )
  SELECT count(*) INTO delivered_count FROM notified;

  RETURN delivered_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deliver_due_dhf_essays() FROM anon;

SELECT cron.schedule(
  'deliver-due-dhf-essays',
  '*/5 * * * *',
  $$SELECT public.deliver_due_dhf_essays();$$
);