-- Add city and location_enabled fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS location_enabled BOOLEAN DEFAULT false;