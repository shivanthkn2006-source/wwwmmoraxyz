-- Fix function search paths for security
CREATE OR REPLACE FUNCTION calculate_phoenix_sync_score(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  memory_count INTEGER;
  message_count INTEGER;
  emotion_count INTEGER;
  voice_count INTEGER;
  total_score NUMERIC;
BEGIN
  SELECT COUNT(*) INTO memory_count FROM public.zoe_sovereign_memory WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO message_count FROM public.behavioral_events WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO emotion_count FROM public.ecn_history WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO voice_count FROM public.zoe_command_history WHERE user_id = p_user_id;
  
  total_score := LEAST(100, (
    (LEAST(memory_count, 1000) / 10.0) +
    (LEAST(message_count, 5000) / 50.0) +
    (LEAST(emotion_count, 500) / 5.0) +
    (LEAST(voice_count, 500) / 5.0)
  ));
  
  RETURN ROUND(total_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_phoenix_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;