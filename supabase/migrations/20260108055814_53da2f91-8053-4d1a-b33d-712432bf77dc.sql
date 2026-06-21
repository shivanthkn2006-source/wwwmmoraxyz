-- Add unique constraint on user_id for proper upsert functionality
-- First, remove duplicate enrollments (keep the most recent one)
DELETE FROM public.voice_print_enrollments a
USING public.voice_print_enrollments b
WHERE a.created_at < b.created_at
  AND a.user_id = b.user_id;

-- Now add the unique constraint
ALTER TABLE public.voice_print_enrollments
ADD CONSTRAINT voice_print_enrollments_user_id_unique UNIQUE (user_id);