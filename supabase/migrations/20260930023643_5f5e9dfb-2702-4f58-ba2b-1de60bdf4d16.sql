CREATE OR REPLACE FUNCTION public.exchange_karma_for_credits(p_karma integer)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid(); v_have int; v_credits int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'sign in required'; END IF;
  IF p_karma IS NULL OR p_karma < 100 THEN RAISE EXCEPTION 'Minimum 100 karma required for 1 credit'; END IF;
  SELECT resonance_points INTO v_have FROM public.exodus_players WHERE user_id = v_uid AND banned = false FOR UPDATE;
  IF v_have IS NULL OR v_have < p_karma THEN RAISE EXCEPTION 'Insufficient karma points'; END IF;
  v_credits := p_karma / 100;
  UPDATE public.exodus_players SET resonance_points = resonance_points - v_credits * 100, updated_at = now() WHERE user_id = v_uid;
  PERFORM set_config('app.points_award', 'on', true);
  UPDATE public.profiles SET total_points = COALESCE(total_points,0) + v_credits * 1000 WHERE user_id = v_uid;
  PERFORM set_config('app.points_award', 'off', true);
  RETURN v_credits;
END; $$;
REVOKE ALL ON FUNCTION public.exchange_karma_for_credits(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exchange_karma_for_credits(integer) TO authenticated;