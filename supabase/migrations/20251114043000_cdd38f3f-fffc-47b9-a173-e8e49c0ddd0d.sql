-- Add voice characteristics columns to moe_settings table
ALTER TABLE moe_settings 
ADD COLUMN IF NOT EXISTS voice_warmth DECIMAL DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS voice_grain DECIMAL DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS voice_breath DECIMAL DEFAULT 0.4,
ADD COLUMN IF NOT EXISTS voice_emotion DECIMAL DEFAULT 0.6,
ADD COLUMN IF NOT EXISTS speech_style TEXT DEFAULT 'conversational',
ADD COLUMN IF NOT EXISTS accent TEXT DEFAULT 'neutral';

-- Add check constraints for valid ranges
ALTER TABLE moe_settings
DROP CONSTRAINT IF EXISTS voice_warmth_range,
DROP CONSTRAINT IF EXISTS voice_grain_range,
DROP CONSTRAINT IF EXISTS voice_breath_range,
DROP CONSTRAINT IF EXISTS voice_emotion_range;

ALTER TABLE moe_settings
ADD CONSTRAINT voice_warmth_range CHECK (voice_warmth >= 0 AND voice_warmth <= 1),
ADD CONSTRAINT voice_grain_range CHECK (voice_grain >= 0 AND voice_grain <= 1),
ADD CONSTRAINT voice_breath_range CHECK (voice_breath >= 0 AND voice_breath <= 1),
ADD CONSTRAINT voice_emotion_range CHECK (voice_emotion >= 0 AND voice_emotion <= 1);