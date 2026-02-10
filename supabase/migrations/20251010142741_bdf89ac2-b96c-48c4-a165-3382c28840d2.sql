-- Add custom event details and recurring flag to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS event_custom_details TEXT,
ADD COLUMN IF NOT EXISTS event_recurring BOOLEAN DEFAULT true;