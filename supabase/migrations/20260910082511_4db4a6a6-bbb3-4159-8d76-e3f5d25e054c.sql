INSERT INTO public.profiles (user_id, username, display_name, bio)
SELECT u.id, 'mmora_demo', 'M''Mora Demo', 'Shared demo account — look around, this is what M''Mora feels like.'
FROM auth.users u
WHERE lower(u.email) = 'demo@mmora.xyz'
ON CONFLICT (user_id) DO UPDATE
SET username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio;