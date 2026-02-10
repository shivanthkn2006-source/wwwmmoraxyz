-- Add image generation tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS daily_image_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_image_reset_date date DEFAULT CURRENT_DATE;