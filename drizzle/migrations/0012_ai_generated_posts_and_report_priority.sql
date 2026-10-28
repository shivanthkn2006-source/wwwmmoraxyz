ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.content_reports ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE public.content_reports ADD COLUMN IF NOT EXISTS due_at timestamptz;
ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_priority_check;
ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_priority_check CHECK (priority IN ('normal','urgent'));

CREATE OR REPLACE FUNCTION public.content_reports_set_priority()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reason IN ('Intimate image shared without consent','Child safety concern') THEN
    NEW.priority := 'urgent';
    NEW.due_at := now() + interval '24 hours';
  ELSE
    NEW.priority := 'normal';
    NEW.due_at := now() + interval '48 hours';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS content_reports_set_priority ON public.content_reports;
CREATE TRIGGER content_reports_set_priority BEFORE INSERT ON public.content_reports
FOR EACH ROW EXECUTE FUNCTION public.content_reports_set_priority();

CREATE OR REPLACE FUNCTION public.content_reports_notify_urgent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.priority = 'urgent' THEN
    INSERT INTO public.notifications (user_id, from_user_id, type, context_data)
    SELECT ur.user_id, NEW.reporter_id, 'system_alert',
      jsonb_build_object('alert_type','urgent_report','title','Urgent report: ' || NEW.reason,
        'report_id', NEW.id, 'due_at', NEW.due_at)
    FROM public.user_roles ur WHERE ur.role = 'admin'::app_role;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.content_reports_notify_urgent() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS content_reports_notify_urgent ON public.content_reports;
CREATE TRIGGER content_reports_notify_urgent AFTER INSERT ON public.content_reports
FOR EACH ROW EXECUTE FUNCTION public.content_reports_notify_urgent();