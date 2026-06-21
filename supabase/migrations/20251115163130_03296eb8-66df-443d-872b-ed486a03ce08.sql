-- Add ElevenLabs advanced voice parameters to moe_settings table
ALTER TABLE public.moe_settings 
ADD COLUMN IF NOT EXISTS voice_stability NUMERIC DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS voice_similarity_boost NUMERIC DEFAULT 0.75,
ADD COLUMN IF NOT EXISTS voice_style NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS voice_use_speaker_boost BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS emotion_preset TEXT DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS pause_duration NUMERIC DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS emphasis_level NUMERIC DEFAULT 0.5;

-- Add check constraints for valid ranges
ALTER TABLE public.moe_settings
ADD CONSTRAINT voice_stability_range CHECK (voice_stability >= 0 AND voice_stability <= 1),
ADD CONSTRAINT voice_similarity_boost_range CHECK (voice_similarity_boost >= 0 AND voice_similarity_boost <= 1),
ADD CONSTRAINT voice_style_range CHECK (voice_style >= 0 AND voice_style <= 1),
ADD CONSTRAINT pause_duration_range CHECK (pause_duration >= 0 AND pause_duration <= 2),
ADD CONSTRAINT emphasis_level_range CHECK (emphasis_level >= 0 AND emphasis_level <= 1);