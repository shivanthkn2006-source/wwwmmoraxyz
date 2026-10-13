-- Members can no longer set their own resonance balance; it only changes through server functions.
CREATE OR REPLACE FUNCTION public.exodus_players_guard_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NEW.resonance_points IS DISTINCT FROM OLD.resonance_points THEN
    RAISE EXCEPTION 'resonance_points can only change through server functions';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS exodus_players_guard_points ON public.exodus_players;
CREATE TRIGGER exodus_players_guard_points BEFORE UPDATE ON public.exodus_players
FOR EACH ROW EXECUTE FUNCTION public.exodus_players_guard_points();

-- The old award/deduct helpers took any player id; keep them server-only.
REVOKE EXECUTE ON FUNCTION public.award_resonance_points(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_resonance_points(uuid, integer, text) FROM PUBLIC, anon, authenticated;

-- Spending one's own points, checked against the real balance.
CREATE OR REPLACE FUNCTION public.spend_resonance_points(p_points integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); bal integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF p_points IS NULL OR p_points <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  SELECT resonance_points INTO bal FROM exodus_players WHERE user_id = uid FOR UPDATE;
  IF bal IS NULL OR bal < p_points THEN RAISE EXCEPTION 'not enough points'; END IF;
  UPDATE exodus_players SET resonance_points = bal - p_points, updated_at = now() WHERE user_id = uid;
  RETURN bal - p_points;
END $$;
REVOKE EXECUTE ON FUNCTION public.spend_resonance_points(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_resonance_points(integer) TO authenticated;