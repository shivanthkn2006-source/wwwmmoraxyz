-- Add new columns to moe_settings table
ALTER TABLE moe_settings 
ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS voice_feedback BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS output_mode TEXT DEFAULT 'both',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en-US';

-- Update existing wake_word default to 'hi moe'
ALTER TABLE moe_settings 
ALTER COLUMN wake_word SET DEFAULT 'hi moe';