import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrendingSearch {
  search_query: string;
  search_count: number;
  unique_users: number;
  last_searched_at: string;
}

export const useTrendingSearches = () => {
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrendingSearches = async () => {
    try {
      const { data, error } = await supabase
        .from('trending_searches')
        .select('*')
        .limit(10);

      if (error) throw error;
      setTrendingSearches(data || []);
    } catch (error) {
      console.error('Error loading trending searches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrendingSearches();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadTrendingSearches, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    trendingSearches,
    loading,
    refresh: loadTrendingSearches
  };
};
