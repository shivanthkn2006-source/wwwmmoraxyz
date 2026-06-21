-- Add unique constraint on profiles.user_id to ensure one-to-one relationships
ALTER TABLE profiles
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);