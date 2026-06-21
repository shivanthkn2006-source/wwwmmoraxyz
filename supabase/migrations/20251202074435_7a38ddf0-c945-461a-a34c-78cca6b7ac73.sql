-- Create job queue table
CREATE TABLE IF NOT EXISTS public.job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create audit reports table
CREATE TABLE IF NOT EXISTS public.audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.job_queue(id) ON DELETE CASCADE,
  report_data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_queue (admin only)
CREATE POLICY "Admins can view job queue"
ON public.job_queue
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert jobs"
ON public.job_queue
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update jobs"
ON public.job_queue
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for audit_reports (admin only)
CREATE POLICY "Admins can view audit reports"
ON public.audit_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Service role can insert reports"
ON public.audit_reports
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_job_queue_status ON public.job_queue(status);
CREATE INDEX idx_job_queue_created ON public.job_queue(created_at DESC);
CREATE INDEX idx_audit_reports_job ON public.audit_reports(job_id);