-- Add voice column to moe_settings table
ALTER TABLE public.moe_settings
ADD COLUMN IF NOT EXISTS voice TEXT DEFAULT 'nova';