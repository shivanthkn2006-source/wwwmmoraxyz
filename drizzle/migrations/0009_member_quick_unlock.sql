CREATE TABLE public.member_quick_unlock (
  user_id uuid PRIMARY KEY,
  code_hash text NOT NULL,
  salt text NOT NULL,
  iterations integer NOT NULL DEFAULT 600000,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.member_quick_unlock TO service_role;
REVOKE ALL ON public.member_quick_unlock FROM anon, authenticated;
ALTER TABLE public.member_quick_unlock ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.member_quick_unlock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX member_quick_unlock_events_user_idx ON public.member_quick_unlock_events(user_id, created_at DESC);
GRANT SELECT ON public.member_quick_unlock_events TO authenticated;
GRANT ALL ON public.member_quick_unlock_events TO service_role;
ALTER TABLE public.member_quick_unlock_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own quick unlock events" ON public.member_quick_unlock_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin reads quick unlock events" ON public.member_quick_unlock_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Atomic wrong-try counter: 5 = 1 min wait, 10 = 15 min wait, 15 = code erased.
CREATE OR REPLACE FUNCTION public.quick_unlock_record_failure(_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer; lock_at timestamptz;
BEGIN
  UPDATE public.member_quick_unlock
     SET failed_attempts = failed_attempts + 1, updated_at = now()
   WHERE user_id = _uid RETURNING failed_attempts INTO n;
  IF n IS NULL THEN RETURN jsonb_build_object('state','none'); END IF;
  IF n >= 15 THEN
    DELETE FROM public.member_quick_unlock WHERE user_id = _uid;
    INSERT INTO public.member_quick_unlock_events(user_id, event) VALUES (_uid, 'erased');
    RETURN jsonb_build_object('state','erased','attempts',n);
  ELSIF n % 5 = 0 THEN
    lock_at := now() + CASE WHEN n >= 10 THEN interval '15 minutes' ELSE interval '1 minute' END;
    UPDATE public.member_quick_unlock SET locked_until = lock_at WHERE user_id = _uid;
    INSERT INTO public.member_quick_unlock_events(user_id, event) VALUES (_uid, 'locked');
    RETURN jsonb_build_object('state','locked','attempts',n,'locked_until',lock_at);
  END IF;
  RETURN jsonb_build_object('state','wrong','attempts',n);
END $$;
REVOKE ALL ON FUNCTION public.quick_unlock_record_failure(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quick_unlock_record_failure(uuid) TO service_role;