-- Fix security warnings: Add search_path to functions without it

-- Fix update_zoe_updated_at function
CREATE OR REPLACE FUNCTION update_zoe_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix update_emotional_state_timestamp function
CREATE OR REPLACE FUNCTION update_emotional_state_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix increment_macro_execution function
CREATE OR REPLACE FUNCTION public.increment_macro_execution(macro_id UUID)
RETURNS void 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE voice_macros 
  SET execution_count = execution_count + 1, 
      last_executed_at = NOW()
  WHERE id = macro_id;
END;
$$;

-- Fix update_voice_macro_timestamp function
CREATE OR REPLACE FUNCTION public.update_voice_macro_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;