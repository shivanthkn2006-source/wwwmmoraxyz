-- Fix security warnings: Add search_path to functions that are missing it

-- Fix get_tier_from_points function
CREATE OR REPLACE FUNCTION public.get_tier_from_points(points integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF points >= 35000 THEN
    RETURN 'Diamond';
  ELSIF points >= 20000 THEN
    RETURN 'Platinum';
  ELSIF points >= 10000 THEN
    RETURN 'Gold';
  ELSIF points >= 5000 THEN
    RETURN 'Silver';
  ELSIF points >= 2500 THEN
    RETURN 'Bronze';
  ELSE
    RETURN NULL;
  END IF;
END;
$function$;

-- Fix should_show_hint function
CREATE OR REPLACE FUNCTION public.should_show_hint(p_user_id uuid, p_hint_key text, p_max_count integer DEFAULT 3)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hint_record RECORD;
BEGIN
  SELECT * INTO v_hint_record
  FROM public.user_hints
  WHERE user_id = p_user_id AND hint_key = p_hint_key;
  
  -- If no record, should show
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- If dismissed, don't show
  IF v_hint_record.dismissed THEN
    RETURN false;
  END IF;
  
  -- If shown count is less than max, should show
  IF v_hint_record.shown_count < p_max_count THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;