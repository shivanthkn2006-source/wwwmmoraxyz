import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface Campaign {
  id: string;
  campaign_name: string;
  description: string | null;
  reward_type: string;
  reward_amount: number;
  currency: string | null;
  geofence_center_lat: number;
  geofence_center_lng: number;
  geofence_radius_meters: number;
  start_time: string;
  end_time: string;
  max_claims: number | null;
  current_claims: number | null;
  budget_total: number | null;
  budget_spent: number | null;
  status: string;
  target_tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export const useMerchantCampaigns = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!user) {
      setCampaigns([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('brand_campaigns')
        .select('*')
        .eq('merchant_user_id', user.id)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setCampaigns(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('merchant-campaigns')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'brand_campaigns',
          filter: `merchant_user_id=eq.${user.id}`
        },
        () => {
          fetchCampaigns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCampaigns]);

  return {
    campaigns,
    isLoading,
    error,
    refetchCampaigns: fetchCampaigns
  };
};
