-- Server-side credit spending, mirroring spend_resonance_points: the client
-- can no longer deduct credits with a direct profiles update (unchecked and
-- non-atomic); it calls this function, which locks the row and verifies the
-- real balance before deducting.
CREATE OR REPLACE FUNCTION public.spend_credits(p_credits integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); bal integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF p_credits IS NULL OR p_credits <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  SELECT total_points INTO bal FROM profiles WHERE user_id = uid FOR UPDATE;
  IF bal IS NULL OR bal < p_credits THEN RAISE EXCEPTION 'not enough credits'; END IF;
  UPDATE profiles SET total_points = bal - p_credits WHERE user_id = uid;
  RETURN bal - p_credits;
END $$;
REVOKE EXECUTE ON FUNCTION public.spend_credits(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_credits(integer) TO authenticated;