-- Add permission column for Zoe to access profile data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS zoe_data_access_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS zoe_last_profile_analysis timestamp with time zone,
ADD COLUMN IF NOT EXISTS zoe_discovered_interests jsonb DEFAULT '[]'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.zoe_data_access_enabled IS 'Permission for Zoe to analyze full profile data for personalization';
COMMENT ON COLUMN public.profiles.zoe_last_profile_analysis IS 'Timestamp of last Zoe profile analysis';
COMMENT ON COLUMN public.profiles.zoe_discovered_interests IS 'Interests discovered by Zoe from profile analysis';