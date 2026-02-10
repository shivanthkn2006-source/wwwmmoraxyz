-- Fix RLS for core telemetry + invite flow

-- behavioral_events: users can read/write only their own events
ALTER TABLE public.behavioral_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own behavioral events" ON public.behavioral_events;
CREATE POLICY "Users can view their own behavioral events"
ON public.behavioral_events
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own behavioral events" ON public.behavioral_events;
CREATE POLICY "Users can insert their own behavioral events"
ON public.behavioral_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own behavioral events" ON public.behavioral_events;
CREATE POLICY "Users can update their own behavioral events"
ON public.behavioral_events
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own behavioral events" ON public.behavioral_events;
CREATE POLICY "Users can delete their own behavioral events"
ON public.behavioral_events
FOR DELETE
USING (auth.uid() = user_id);


-- platform_health_logs: users can read/write only their own logs
ALTER TABLE public.platform_health_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own platform health logs" ON public.platform_health_logs;
CREATE POLICY "Users can view their own platform health logs"
ON public.platform_health_logs
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own platform health logs" ON public.platform_health_logs;
CREATE POLICY "Users can insert their own platform health logs"
ON public.platform_health_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);


-- zoe_settings: users can read/insert/update only their own settings
ALTER TABLE public.zoe_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own zoe settings" ON public.zoe_settings;
CREATE POLICY "Users can view their own zoe settings"
ON public.zoe_settings
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own zoe settings" ON public.zoe_settings;
CREATE POLICY "Users can insert their own zoe settings"
ON public.zoe_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own zoe settings" ON public.zoe_settings;
CREATE POLICY "Users can update their own zoe settings"
ON public.zoe_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- invite_codes: allow anyone to validate an active, non-expired, available invite code
-- (needed for invite links to work before login)
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can validate active invite codes" ON public.invite_codes;
CREATE POLICY "Public can validate active invite codes"
ON public.invite_codes
FOR SELECT
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (max_uses IS NULL OR COALESCE(current_uses, 0) < max_uses)
);

-- Allow authenticated users to mark a code as used (increment usage / attach user)
DROP POLICY IF EXISTS "Authenticated users can consume invite codes" ON public.invite_codes;
CREATE POLICY "Authenticated users can consume invite codes"
ON public.invite_codes
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (max_uses IS NULL OR COALESCE(current_uses, 0) < max_uses)
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (max_uses IS NULL OR COALESCE(current_uses, 0) < max_uses)
);
