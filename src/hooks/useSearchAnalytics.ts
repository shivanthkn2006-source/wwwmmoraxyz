import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface SearchPattern {
  query: string;
  count: number;
  lastSearched: string;
}

interface TimeBasedStats {
  date: string;
  count: number;
}

interface SearchAnalytics {
  totalSearches: number;
  uniqueSearches: number;
  topSearches: SearchPattern[];
  recentSearches: SearchPattern[];
  dailyStats: TimeBasedStats[];
  weeklyStats: TimeBasedStats[];
}

export const useSearchAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch all search history for the user
      const { data: searches, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!searches || searches.length === 0) {
        setAnalytics({
          totalSearches: 0,
          uniqueSearches: 0,
          topSearches: [],
          recentSearches: [],
          dailyStats: [],
          weeklyStats: []
        });
        return;
      }

      // Calculate total and unique searches
      const totalSearches = searches.length;
      const uniqueQueries = new Set(searches.map(s => s.search_query.toLowerCase()));
      const uniqueSearches = uniqueQueries.size;

      // Group by query and count occurrences
      const queryCount = searches.reduce((acc: Record<string, { count: number; lastSearched: string }>, search) => {
        const query = search.search_query.toLowerCase();
        if (!acc[query]) {
          acc[query] = { count: 0, lastSearched: search.created_at };
        }
        acc[query].count++;
        if (new Date(search.created_at) > new Date(acc[query].lastSearched)) {
          acc[query].lastSearched = search.created_at;
        }
        return acc;
      }, {});

      // Get top searches
      const topSearches: SearchPattern[] = Object.entries(queryCount)
        .map(([query, data]) => ({ query, count: data.count, lastSearched: data.lastSearched }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get recent unique searches
      const recentSearches: SearchPattern[] = Array.from(
        new Map(searches.map(s => [s.search_query.toLowerCase(), s]))
          .values()
      )
        .slice(0, 10)
        .map(s => ({
          query: s.search_query,
          count: queryCount[s.search_query.toLowerCase()].count,
          lastSearched: s.created_at
        }));

      // Calculate daily stats (last 7 days)
      const dailyStats: TimeBasedStats[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const count = searches.filter(s => {
          const searchDate = new Date(s.created_at).toISOString().split('T')[0];
          return searchDate === dateStr;
        }).length;

        dailyStats.push({ date: dateStr, count });
      }

      // Calculate weekly stats (last 4 weeks)
      const weeklyStats: TimeBasedStats[] = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const count = searches.filter(s => {
          const searchDate = new Date(s.created_at);
          return searchDate >= weekStart && searchDate <= weekEnd;
        }).length;

        weeklyStats.push({
          date: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          count
        });
      }

      setAnalytics({
        totalSearches,
        uniqueSearches,
        topSearches,
        recentSearches,
        dailyStats,
        weeklyStats
      });
    } catch (error) {
      console.error('Error loading search analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return { analytics, loading, refresh: loadAnalytics };
};
