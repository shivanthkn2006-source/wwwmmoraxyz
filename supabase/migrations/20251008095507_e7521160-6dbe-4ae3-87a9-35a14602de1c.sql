-- Add text generation usage tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS daily_text_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_text_reset_date DATE DEFAULT CURRENT_DATE;