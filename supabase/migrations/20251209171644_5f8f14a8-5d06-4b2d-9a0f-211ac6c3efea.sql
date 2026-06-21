-- Fix remaining functions without search_path

CREATE OR REPLACE FUNCTION public.update_security_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_premium_access(user_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- @moksh50 and @Justmkbhd have unlimited access
  RETURN user_username IN ('moksh50', 'Justmkbhd');
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_feature_limit(p_user_id uuid, p_feature text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_username text;
  v_limits record;
  v_can_use boolean := false;
  v_remaining integer := 0;
BEGIN
  -- Get username
  SELECT username INTO v_username
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  -- Check if premium user (unlimited access)
  IF has_premium_access(v_username) THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', 999999,
      'tier', 'unlimited',
      'is_premium', true
    );
  END IF;
  
  -- Get user limits
  SELECT * INTO v_limits
  FROM public.user_tier_limits
  WHERE user_id = p_user_id;
  
  -- If no limits record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_tier_limits (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_limits;
  END IF;
  
  -- Check specific feature limits
  CASE p_feature
    WHEN 'architect' THEN
      v_can_use := v_limits.architect_projects_used < v_limits.architect_projects_limit;
      v_remaining := v_limits.architect_projects_limit - v_limits.architect_projects_used;
    WHEN 'timeline_search' THEN
      v_can_use := v_limits.timeline_searches_used < v_limits.timeline_searches_limit;
      v_remaining := v_limits.timeline_searches_limit - v_limits.timeline_searches_used;
    WHEN 'dreams' THEN
      v_can_use := v_limits.dreams_analysis_used < v_limits.dreams_analysis_limit;
      v_remaining := v_limits.dreams_analysis_limit - v_limits.dreams_analysis_used;
    WHEN 'video' THEN
      v_can_use := v_limits.video_creation_used < v_limits.video_creation_limit;
      v_remaining := v_limits.video_creation_limit - v_limits.video_creation_used;
    WHEN 'multiagent' THEN
      v_can_use := v_limits.multiagent_executions_used < v_limits.multiagent_executions_limit;
      v_remaining := v_limits.multiagent_executions_limit - v_limits.multiagent_executions_used;
    WHEN 'api' THEN
      v_can_use := v_limits.api_calls_used < v_limits.api_calls_limit;
      v_remaining := v_limits.api_calls_limit - v_limits.api_calls_used;
    ELSE
      v_can_use := false;
  END CASE;
  
  RETURN jsonb_build_object(
    'allowed', v_can_use,
    'remaining', v_remaining,
    'tier', v_limits.tier,
    'is_premium', false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_feature_usage(p_user_id uuid, p_feature text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_username text;
BEGIN
  -- Get username
  SELECT username INTO v_username
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  -- Skip increment for premium users
  IF has_premium_access(v_username) THEN
    RETURN;
  END IF;
  
  -- Increment usage counter
  UPDATE public.user_tier_limits
  SET 
    architect_projects_used = CASE WHEN p_feature = 'architect' THEN architect_projects_used + 1 ELSE architect_projects_used END,
    timeline_searches_used = CASE WHEN p_feature = 'timeline_search' THEN timeline_searches_used + 1 ELSE timeline_searches_used END,
    dreams_analysis_used = CASE WHEN p_feature = 'dreams' THEN dreams_analysis_used + 1 ELSE dreams_analysis_used END,
    video_creation_used = CASE WHEN p_feature = 'video' THEN video_creation_used + 1 ELSE video_creation_used END,
    multiagent_executions_used = CASE WHEN p_feature = 'multiagent' THEN multiagent_executions_used + 1 ELSE multiagent_executions_used END,
    api_calls_used = CASE WHEN p_feature = 'api' THEN api_calls_used + 1 ELSE api_calls_used END,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$function$;