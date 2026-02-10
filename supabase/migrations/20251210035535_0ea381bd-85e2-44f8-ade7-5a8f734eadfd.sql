-- Fix security definer view by setting security invoker
ALTER VIEW public.safe_public_profiles SET (security_invoker = true);