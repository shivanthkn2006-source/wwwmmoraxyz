-- Remove MOE-related database objects

-- Drop moe_settings table
DROP TABLE IF EXISTS public.moe_settings CASCADE;

-- Remove moe_visible and moe_custom_commands columns from voice_assistant_settings
ALTER TABLE public.voice_assistant_settings 
  DROP COLUMN IF EXISTS moe_visible,
  DROP COLUMN IF EXISTS moe_custom_commands;