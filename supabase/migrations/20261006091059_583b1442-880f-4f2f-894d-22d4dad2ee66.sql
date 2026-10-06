CREATE TABLE public.vr_save_games (
  user_id uuid PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vr_save_games TO authenticated;
GRANT ALL ON public.vr_save_games TO service_role;
ALTER TABLE public.vr_save_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own save read" ON public.vr_save_games FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own save insert" ON public.vr_save_games FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own save update" ON public.vr_save_games FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.earn_activity_karma(p_kind text, p_units integer DEFAULT 1)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE per integer; cap integer; u integer := LEAST(GREATEST(COALESCE(p_units,1),1),60);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'sign in required'; END IF;
  CASE p_kind
    WHEN 'time_spent' THEN per:=1; cap:=60;
    WHEN 'feature_use' THEN per:=1; cap:=20;
    WHEN 'walking' THEN per:=2; cap:=40;
    WHEN 'running' THEN per:=3; cap:=60;
    WHEN 'cycling' THEN per:=3; cap:=60;
    WHEN 'workout' THEN per:=3; cap:=60;
    WHEN 'riding' THEN per:=2; cap:=40;
    WHEN 'vr_talk' THEN per:=1; cap:=30;
    WHEN 'vr_coin' THEN per:=1; cap:=60;
    ELSE RAISE EXCEPTION 'unknown activity';
  END CASE;
  RETURN karma_award_internal(auth.uid(), per*u, p_kind, NULL, cap);
END $function$;