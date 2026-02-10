-- User Relationships Table - Family & Personal Connections
CREATE TABLE public.user_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  requester_label TEXT, -- How requester sees recipient (e.g., "son")
  recipient_label TEXT, -- How recipient sees requester (e.g., "father")
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  UNIQUE(requester_id, recipient_id),
  CONSTRAINT different_users CHECK (requester_id != recipient_id)
);

-- Enable RLS
ALTER TABLE public.user_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view relationships they are part of"
ON public.user_relationships FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create relationship requests"
ON public.user_relationships FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update relationships they are part of"
ON public.user_relationships FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can delete their own relationship requests"
ON public.user_relationships FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Index for faster lookups
CREATE INDEX idx_user_relationships_requester ON public.user_relationships(requester_id);
CREATE INDEX idx_user_relationships_recipient ON public.user_relationships(recipient_id);
CREATE INDEX idx_user_relationships_status ON public.user_relationships(status);

-- Add to realtime for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_relationships;

-- Insert the relationship between @moksh50 (father) and @John (son) as per user request
DO $$
DECLARE
  moksh_id UUID;
  john_id UUID;
BEGIN
  -- Get user IDs
  SELECT user_id INTO moksh_id FROM public.profiles WHERE username = 'moksh50' LIMIT 1;
  SELECT user_id INTO john_id FROM public.profiles WHERE username = 'Justmkbhd' LIMIT 1;
  
  -- Only insert if both users exist
  IF moksh_id IS NOT NULL AND john_id IS NOT NULL THEN
    INSERT INTO public.user_relationships (requester_id, recipient_id, relationship_type, status, requester_label, recipient_label, confirmed_at)
    VALUES (moksh_id, john_id, 'parent_child', 'confirmed', 'son', 'father', now())
    ON CONFLICT (requester_id, recipient_id) DO NOTHING;
  END IF;
END $$;