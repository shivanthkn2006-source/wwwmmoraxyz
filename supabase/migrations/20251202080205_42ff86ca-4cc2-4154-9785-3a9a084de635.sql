-- Insert admin roles for the two authorized users (using existing TEXT-based role column)
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'
FROM public.profiles
WHERE username IN ('Moksh50', 'Justmkbhd')
ON CONFLICT (user_id, role) DO NOTHING;