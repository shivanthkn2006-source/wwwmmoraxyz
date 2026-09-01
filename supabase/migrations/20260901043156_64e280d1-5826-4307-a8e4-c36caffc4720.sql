-- PROFILES: prevent privilege/tenant escalation on update
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.profiles_guard_immutable_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.user_id := OLD.user_id;
  IF to_jsonb(OLD) ? 'tenant_id' THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('tenant_id', to_jsonb(OLD)->'tenant_id'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_immutable_columns_trg ON public.profiles;
CREATE TRIGGER profiles_guard_immutable_columns_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_immutable_columns();

-- MESSAGES: recipients can only update their own received rows, and cannot rewrite participants
DROP POLICY IF EXISTS "Users can update messages they received" ON public.messages;
CREATE POLICY "Users can update messages they received"
ON public.messages FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

CREATE OR REPLACE FUNCTION public.messages_guard_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.sender_id := OLD.sender_id;
  NEW.receiver_id := OLD.receiver_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_guard_participants_trg ON public.messages;
CREATE TRIGGER messages_guard_participants_trg
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_guard_participants();

-- INVITE CODES: consumers may only increment usage, never change control fields
CREATE OR REPLACE FUNCTION public.invite_codes_guard_control_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.code := OLD.code;
  NEW.max_uses := OLD.max_uses;
  NEW.is_active := OLD.is_active;
  NEW.expires_at := OLD.expires_at;
  IF to_jsonb(OLD) ? 'created_by' THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('created_by', to_jsonb(OLD)->'created_by'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invite_codes_guard_control_columns_trg ON public.invite_codes;
CREATE TRIGGER invite_codes_guard_control_columns_trg
BEFORE UPDATE ON public.invite_codes
FOR EACH ROW EXECUTE FUNCTION public.invite_codes_guard_control_columns();