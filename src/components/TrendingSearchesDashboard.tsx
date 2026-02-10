import React from 'react';
import { TrendingUp, Search, Users, Flame } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTrendingSearches } from '@/hooks/useTrendingSearches';
import { Badge } from '@/components/ui/badge';

interface TrendingSearchesDashboardProps {
  onSelectSearch: (query: string) => void;
}

export const TrendingSearchesDashboard: React.FC<TrendingSearchesDashboardProps> = ({
  onSelectSearch
}) => {
  const { trendingSearches, loading } = useTrendingSearches();

  const getTrendingBadge = (index: number) => {
    if (index === 0) return <Flame className="w-4 h-4 text-red-500" />;
    if (index === 1) return <Flame className="w-4 h-4 text-orange-500" />;
    if (index === 2) return <Flame className="w-4 h-4 text-yellow-500" />;
    return null;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
        >
          <TrendingUp className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background/95 backdrop-blur-lg border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Trending Searches
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-xs text-white/70 mb-4">
            Most popular searches in the last 24 hours
          </p>

          {loading ? (
            <div className="text-center py-8">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 animate-pulse text-white/50" />
              <p className="text-white/50 text-sm">Loading trending searches...</p>
            </div>
          ) : trendingSearches.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 mx-auto mb-2 text-white/30" />
              <p className="text-white/50 text-sm">No trending searches yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {trendingSearches.map((trend, index) => (
                <button
                  key={trend.search_query}
                  onClick={() => onSelectSearch(trend.search_query)}
                  className="w-full p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                      {getTrendingBadge(index) || (
                        <span className="text-xs font-bold text-white/70">#{index + 1}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm mb-1 group-hover:text-primary transition-colors">
                        {trend.search_query}
                      </p>
                      
                      <div className="flex items-center gap-3 text-xs text-white/50">
                        <div className="flex items-center gap-1">
                          <Search className="w-3 h-3" />
                          <span>{trend.search_count} searches</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{trend.unique_users} users</span>
                        </div>
                      </div>
                    </div>

                    {index < 3 && (
                      <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-0">
                        Hot
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
