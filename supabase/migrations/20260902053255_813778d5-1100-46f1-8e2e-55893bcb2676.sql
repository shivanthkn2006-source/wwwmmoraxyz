-- Seed starter growth preferences for members who have none, so the growth
-- engine can deliver to them. onboarded_at stays NULL so each member still
-- sees the in-app onboarding flow and can change every choice.
INSERT INTO public.growth_preferences (user_id, focus_areas, reflection_styles, reflection_style, delivery_frequency, timezone)
SELECT p.user_id,
       ARRAY['mindset','discipline','wisdom']::text[],
       ARRAY['actionable']::text[],
       'actionable',
       3,
       'UTC'
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.growth_preferences g WHERE g.user_id = p.user_id)
ON CONFLICT (user_id) DO NOTHING;