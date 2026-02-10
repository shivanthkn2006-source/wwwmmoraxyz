-- Fix search path for the trigger function
DROP TRIGGER IF EXISTS update_emotional_state_timestamp_trigger ON public.lisa_emotional_state;
DROP FUNCTION IF EXISTS update_emotional_state_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION update_emotional_state_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_emotional_state_timestamp_trigger
  BEFORE UPDATE ON public.lisa_emotional_state
  FOR EACH ROW
  EXECUTE FUNCTION update_emotional_state_timestamp();