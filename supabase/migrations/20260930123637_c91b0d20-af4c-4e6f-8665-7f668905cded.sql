CREATE TABLE public.activity_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('walking','running','cycling','riding','workout')),
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  distance_m numeric NOT NULL DEFAULT 0,
  steps integer NOT NULL DEFAULT 0,
  pace_min_per_km numeric,
  karma_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activity_sessions TO authenticated;
GRANT ALL ON public.activity_sessions TO service_role;
ALTER TABLE public.activity_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own activity sessions" ON public.activity_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.record_activity_session(p_kind text, p_started timestamptz, p_finished timestamptz, p_distance_m numeric, p_steps integer, p_units integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_secs numeric; v_pace numeric; v_karma int := 0; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'sign in required'; END IF;
  IF p_kind NOT IN ('walking','running','cycling','riding','workout') THEN RAISE EXCEPTION 'bad kind'; END IF;
  IF p_finished <= p_started OR p_finished > now() + interval '1 minute' OR p_started < now() - interval '12 hours' THEN RAISE EXCEPTION 'bad times'; END IF;
  v_secs := extract(epoch FROM p_finished - p_started);
  IF p_distance_m < 0 OR p_distance_m > v_secs * 45 THEN RAISE EXCEPTION 'distance not possible'; END IF;
  v_pace := CASE WHEN p_distance_m > 10 THEN round((v_secs/60) / (p_distance_m/1000), 2) END;
  IF p_units > 0 THEN v_karma := public.earn_activity_karma(p_kind, LEAST(p_units, 100)); END IF;
  INSERT INTO public.activity_sessions(user_id, kind, started_at, finished_at, distance_m, steps, pace_min_per_km, karma_earned)
  VALUES (v_uid, p_kind, p_started, p_finished, round(p_distance_m,1), GREATEST(p_steps,0), v_pace, COALESCE(v_karma,0)) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'karma', COALESCE(v_karma,0), 'pace', v_pace);
END $$;
REVOKE ALL ON FUNCTION public.record_activity_session(text,timestamptz,timestamptz,numeric,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_activity_session(text,timestamptz,timestamptz,numeric,integer,integer) TO authenticated;