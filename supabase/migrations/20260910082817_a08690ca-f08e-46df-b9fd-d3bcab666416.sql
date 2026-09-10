INSERT INTO public.growth_preferences (user_id, focus_areas, reflection_styles, onboarded_at, timezone)
SELECT u.id, ARRAY['Deep Focus & Productivity','Emotional Resilience','Purpose & Meaning'], ARRAY['actionable'], now(), 'UTC'
FROM auth.users u
WHERE lower(u.email) = 'demo@mmora.xyz'
ON CONFLICT (user_id) DO UPDATE
SET focus_areas = EXCLUDED.focus_areas,
    onboarded_at = COALESCE(public.growth_preferences.onboarded_at, now()),
    updated_at = now();