import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, Zap } from 'lucide-react';
import { useChallengeSeasons } from '@/hooks/useChallengeSeasons';
import { format } from 'date-fns';

export const ChallengeSeasonDisplay = () => {
  const { activeSeasons, loading, getSeasonProgress, isSeasonActive } = useChallengeSeasons();

  if (loading) {
    return null;
  }

  if (activeSeasons.length === 0) {
    return null;
  }

  const getTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-semibold">Active Seasons</h3>
      </div>

      <div className="space-y-4">
        {activeSeasons.map((season) => {
          const progress = getSeasonProgress(season.id);
          const active = isSeasonActive(season.id);

          return (
            <Card key={season.id} className="p-4 bg-background/50">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">{season.season_name}</h4>
                    <p className="text-sm text-muted-foreground">{season.description}</p>
                  </div>
                  {active && (
                    <Badge variant="default" className="bg-purple-500">
                      <Zap className="w-3 h-3 mr-1" />
                      Live
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(season.start_date), 'MMM d')} - {format(new Date(season.end_date), 'MMM d')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {getTimeRemaining(season.end_date)} left
                  </span>
                  <Badge variant="outline">
                    {season.bonus_multiplier}x bonus
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Season Progress</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-sm font-medium">🎁 Special Rewards Available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Complete seasonal challenges to earn exclusive {season.theme}-themed badges!
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
};
