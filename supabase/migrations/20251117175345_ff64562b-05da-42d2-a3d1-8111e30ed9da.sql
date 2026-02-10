-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION public.increment_macro_execution(macro_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.voice_macros
  SET execution_count = execution_count + 1,
      updated_at = now()
  WHERE id = macro_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_voice_macro_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;