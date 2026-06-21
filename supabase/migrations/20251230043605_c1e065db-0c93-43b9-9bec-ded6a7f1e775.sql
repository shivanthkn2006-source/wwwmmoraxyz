-- Fix search_path for functions
ALTER FUNCTION public.calculate_cognitive_access(NUMERIC) SET search_path = public;
ALTER FUNCTION public.calculate_zoe_tone(NUMERIC) SET search_path = public;