-- ═══════════════════════════════════════════════════════════════════════════════
-- ZOE INFINITY ISOLATION: Create separate messages table
-- Hard wall between Zoe Classic (MMORA Orb) and Zoe Infinity
-- ═══════════════════════════════════════════════════════════════════════════════

-- Step 1: Create the new Zoe Infinity messages table
CREATE TABLE public.zoe_infinity_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  media_url TEXT,
  media_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Step 2: Enable Row Level Security
ALTER TABLE public.zoe_infinity_messages ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for user access
CREATE POLICY "Users can read own Infinity messages"
  ON public.zoe_infinity_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Infinity messages"
  ON public.zoe_infinity_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Infinity messages"
  ON public.zoe_infinity_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Infinity messages"
  ON public.zoe_infinity_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Step 4: Create index for efficient queries
CREATE INDEX idx_zoe_infinity_messages_user_id ON public.zoe_infinity_messages(user_id);
CREATE INDEX idx_zoe_infinity_messages_created_at ON public.zoe_infinity_messages(created_at DESC);

-- Step 5: Enable realtime for the new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.zoe_infinity_messages;

-- Step 6: Migrate existing Infinity data from ai_companion_messages
-- Strip the legacy [[ZOE_INFINITY]] marker from content during migration
INSERT INTO public.zoe_infinity_messages (id, user_id, role, content, created_at, media_url, media_type)
SELECT 
  id, 
  user_id, 
  role, 
  REGEXP_REPLACE(content, '^\[\[ZOE_INFINITY\]\]\s*', '') as content,
  created_at, 
  media_url, 
  media_type
FROM public.ai_companion_messages
WHERE variant = 'zoe_infinity';

-- Step 7: Add Infinity-specific columns to profiles for complete separation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS zoe_infinity_intimacy_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS zoe_infinity_nickname TEXT,
ADD COLUMN IF NOT EXISTS zoe_infinity_voice_preference TEXT DEFAULT 'deepgram',
ADD COLUMN IF NOT EXISTS zoe_infinity_genesis_complete BOOLEAN DEFAULT false;