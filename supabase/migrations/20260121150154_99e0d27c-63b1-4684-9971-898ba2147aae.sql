-- Identity Wall: separate Zoe Classic vs Zoe Infinity inside ai_companion_messages

-- 1) Add variant column (nullable initially so we can backfill safely)
ALTER TABLE public.ai_companion_messages
ADD COLUMN IF NOT EXISTS variant TEXT;

-- 2) Backfill existing rows based on Zoe Infinity marker
UPDATE public.ai_companion_messages
SET variant = 'zoe_infinity'
WHERE variant IS NULL
  AND content LIKE '%[[ZOE_INFINITY]]%';

-- 3) Default all remaining legacy rows to classic
UPDATE public.ai_companion_messages
SET variant = 'zoe_classic'
WHERE variant IS NULL;

-- 4) Enforce default + non-null going forward
ALTER TABLE public.ai_companion_messages
ALTER COLUMN variant SET DEFAULT 'zoe_classic';

ALTER TABLE public.ai_companion_messages
ALTER COLUMN variant SET NOT NULL;

-- 5) Helpful index for per-user variant history lookups
CREATE INDEX IF NOT EXISTS idx_ai_companion_messages_user_variant_created
ON public.ai_companion_messages (user_id, variant, created_at);