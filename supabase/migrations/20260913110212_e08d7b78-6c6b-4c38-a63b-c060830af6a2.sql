CREATE TABLE IF NOT EXISTS public.ai_batch_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  user_id uuid,
  target_date text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_batch_queue_pending_key
  ON public.ai_batch_queue (job_type, user_id, target_date)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS ai_batch_queue_due_idx
  ON public.ai_batch_queue (job_type, next_attempt_at)
  WHERE status = 'pending';

GRANT ALL ON public.ai_batch_queue TO service_role;
GRANT SELECT ON public.ai_batch_queue TO authenticated;

ALTER TABLE public.ai_batch_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can view ai batch queue"
  ON public.ai_batch_queue FOR SELECT TO authenticated
  USING (public.is_sovereign_admin(auth.uid()));

CREATE TRIGGER ai_batch_queue_updated_at
  BEFORE UPDATE ON public.ai_batch_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();