import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface MerchantStats {
  activeCampaigns: number;
  totalImpressions: number;
  totalClaims: number;
  conversionRate: number;
  budgetSpent: number;
  budgetTotal: number;
}

export const useMerchantStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) {
        setStats(null);
        setIsLoading(false);
        return;
      }

      try {
        // Get campaigns
        const { data: campaigns } = await supabase
          .from('brand_campaigns')
          .select('id, status, budget_total, budget_spent, current_claims, max_claims')
          .eq('merchant_user_id', user.id)
          .neq('status', 'deleted');

        if (!campaigns) {
          setStats({
            activeCampaigns: 0,
            totalImpressions: 0,
            totalClaims: 0,
            conversionRate: 0,
            budgetSpent: 0,
            budgetTotal: 0
          });
          return;
        }

        const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
        const totalClaims = campaigns.reduce((sum, c) => sum + (c.current_claims || 0), 0);
        const budgetSpent = campaigns.reduce((sum, c) => sum + (c.budget_spent || 0), 0);
        const budgetTotal = campaigns.reduce((sum, c) => sum + (c.budget_total || 0), 0);
        
        // Estimate impressions (claims * avg view ratio)
        const totalImpressions = totalClaims * 15; // Assume 15 views per claim
        
        // Calculate conversion rate
        const maxClaims = campaigns.reduce((sum, c) => sum + (c.max_claims || 0), 0);
        const conversionRate = maxClaims > 0 ? Math.round((totalClaims / maxClaims) * 100) : 0;

        setStats({
          activeCampaigns,
          totalImpressions,
          totalClaims,
          conversionRate,
          budgetSpent,
          budgetTotal
        });
      } catch (err) {
        console.error('Error fetching merchant stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return { stats, isLoading };
};
