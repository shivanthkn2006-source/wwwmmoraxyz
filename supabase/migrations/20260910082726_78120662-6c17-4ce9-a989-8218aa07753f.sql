INSERT INTO public.onboarding_progress (user_id, completed, skipped, current_step, completed_steps)
SELECT u.id, true, true, 1, '["genesis_intro"]'::jsonb
FROM auth.users u
WHERE lower(u.email) = 'demo@mmora.xyz'
ON CONFLICT (user_id) DO UPDATE
SET completed = true, skipped = true, updated_at = now();