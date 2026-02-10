-- Fix security warnings by setting search_path on functions
ALTER FUNCTION public.check_collection_completion() SET search_path = 'public';
ALTER FUNCTION public.notify_friends_badge_earned() SET search_path = 'public';
ALTER FUNCTION public.notify_friends_challenge_completed() SET search_path = 'public';