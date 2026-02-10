-- Add status field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'none' CHECK (status IN ('online', 'away', 'offline', 'none'));

-- Ensure parent_comment_id exists in post_comments for reply functionality
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE;

-- Create notifications table if it doesn't exist (already exists based on schema)
-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON post_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- Update sync function to include status
CREATE OR REPLACE FUNCTION public.sync_public_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.public_profiles (user_id, username, display_name, profile_photo_url, bio, profile_visibility)
    VALUES (NEW.user_id, NEW.username, NEW.display_name, NEW.profile_photo_url, NEW.bio, NEW.profile_visibility);
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.public_profiles
    SET 
      username = NEW.username,
      display_name = NEW.display_name,
      profile_photo_url = NEW.profile_photo_url,
      bio = NEW.bio,
      profile_visibility = NEW.profile_visibility
    WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE user_id = OLD.user_id;
  END IF;
  RETURN NEW;
END;
$function$;