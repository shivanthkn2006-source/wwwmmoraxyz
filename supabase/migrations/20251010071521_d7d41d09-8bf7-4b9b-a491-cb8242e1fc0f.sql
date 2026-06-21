-- Add event tracking columns to profiles table
ALTER TABLE profiles 
ADD COLUMN event_date DATE,
ADD COLUMN event_type TEXT CHECK (event_type IN ('birthday', 'fundraising', 'talk', 'other'));