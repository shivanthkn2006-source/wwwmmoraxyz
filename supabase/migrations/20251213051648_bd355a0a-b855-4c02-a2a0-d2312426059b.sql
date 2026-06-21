-- Function to track viral share (fixed syntax)
CREATE OR REPLACE FUNCTION public.track_viral_share(
  p_user_id UUID, 
  p_content_type TEXT, 
  p_content_id TEXT, 
  p_platform TEXT,
  p_optimized_content JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_share_id UUID;
  v_latest_zsmt_id UUID;
BEGIN
  INSERT INTO public.viral_content_shares (user_id, content_type, content_id, platform, platform_optimized_content)
  VALUES (p_user_id, p_content_type, p_content_id, p_platform, p_optimized_content)
  RETURNING id INTO v_share_id;
  
  -- Find latest ZSMT entry for this user
  SELECT id INTO v_latest_zsmt_id
  FROM public.zoe_sovereign_memory
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Update the specific row
  IF v_latest_zsmt_id IS NOT NULL THEN
    UPDATE public.zoe_sovereign_memory
    SET external_virality_score = LEAST(100, COALESCE(external_virality_score, 0) + 5)
    WHERE id = v_latest_zsmt_id;
  END IF;
  
  RETURN v_share_id;
END;
$$;