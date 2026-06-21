-- Enable Row Level Security on private_timelines table
-- This table has policies defined but RLS was not enabled, allowing unauthorized access
ALTER TABLE public.private_timelines ENABLE ROW LEVEL SECURITY;