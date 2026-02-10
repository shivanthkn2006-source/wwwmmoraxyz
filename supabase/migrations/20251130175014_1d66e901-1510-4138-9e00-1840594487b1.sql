-- Fix voice settings constraints to allow correct Zoe personality values
-- The columns already exist as zoe_*, but the constraints reference old lisa_* names

-- Drop the old check constraints (using the old lisa_ constraint names)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_lisa_personality_tone_check;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_lisa_conversation_style_check;

-- Add new check constraints with correct Zoe personality values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_zoe_personality_tone_check 
CHECK (zoe_personality_tone IN ('casual', 'professional', 'enthusiastic', 'friendly', 'empathetic', 'warm', 'calm', 'energetic'));

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_zoe_conversation_style_check 
CHECK (zoe_conversation_style IN ('concise', 'balanced', 'detailed', 'conversational', 'formal'));