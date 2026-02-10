-- Add new voice-related columns to moe_settings table
ALTER TABLE public.moe_settings 
ADD COLUMN IF NOT EXISTS voice_gender TEXT DEFAULT 'female',
ADD COLUMN IF NOT EXISTS voice_warmth DECIMAL(3,2) DEFAULT 0.70,
ADD COLUMN IF NOT EXISTS voice_grain DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS voice_breath DECIMAL(3,2) DEFAULT 0.40,
ADD COLUMN IF NOT EXISTS voice_emotion DECIMAL(3,2) DEFAULT 0.60,
ADD COLUMN IF NOT EXISTS speech_style TEXT DEFAULT 'conversational',
ADD COLUMN IF NOT EXISTS accent TEXT DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS voice TEXT DEFAULT 'aria';

COMMENT ON COLUMN public.moe_settings.voice_gender IS 'Gender preference for voice selection (male/female)';
COMMENT ON COLUMN public.moe_settings.voice_warmth IS 'Voice warmth level (0.0-1.0)';
COMMENT ON COLUMN public.moe_settings.voice_grain IS 'Voice grain texture (0.0-1.0)';
COMMENT ON COLUMN public.moe_settings.voice_breath IS 'Voice breath and resonance (0.0-1.0)';
COMMENT ON COLUMN public.moe_settings.voice_emotion IS 'Emotional expression level (0.0-1.0)';
COMMENT ON COLUMN public.moe_settings.speech_style IS 'Overall speaking style';
COMMENT ON COLUMN public.moe_settings.accent IS 'Voice accent preference';
COMMENT ON COLUMN public.moe_settings.voice IS 'Selected voice identifier';