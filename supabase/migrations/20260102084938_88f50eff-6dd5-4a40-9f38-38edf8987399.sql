-- Fix function search path for security
CREATE OR REPLACE FUNCTION public.get_daily_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.divine_notifications
    WHERE user_id = p_user_id
    AND sent_at >= CURRENT_DATE
    AND sent_at < CURRENT_DATE + INTERVAL '1 day'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_campaign_claims_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.brand_campaigns
  SET current_claims = current_claims + 1,
      updated_at = now()
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;