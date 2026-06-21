import React from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, Sparkles } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';

export const Leaderboard = () => {
  const { leaderboard, userRank, loading, getTopByBadges, getTopByFeatures } = useLeaderboard();

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Leaderboard</h3>
        </div>
        <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
      </Card>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const LeaderboardList = ({ entries, metric }: { entries: any[], metric: 'points' | 'badges' | 'features' }) => (
    <div className="space-y-2">
      {entries.slice(0, 10).map((entry, index) => (
        <div
          key={entry.user_id}
          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
        >
          <span className="text-lg font-bold w-8 text-center">
            {getRankIcon(index + 1)}
          </span>
          <Avatar className="w-10 h-10">
            <AvatarImage src={entry.profile_photo_url || undefined} />
            <AvatarFallback>{entry.display_name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{entry.display_name}</p>
            <p className="text-xs text-muted-foreground truncate">@{entry.username}</p>
          </div>
          <div className="text-right">
            {metric === 'points' && (
              <>
                <p className="font-bold text-primary">{entry.total_points || 0}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </>
            )}
            {metric === 'badges' && (
              <>
                <p className="font-bold text-primary">{entry.badge_count || 0}</p>
                <p className="text-xs text-muted-foreground">badges</p>
              </>
            )}
            {metric === 'features' && (
              <>
                <p className="font-bold text-primary">{entry.features_discovered || 0}</p>
                <p className="text-xs text-muted-foreground">features</p>
              </>
            )}
          </div>
          {entry.current_tier && (
            <Badge variant="outline" className="ml-2">
              {entry.current_tier}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Leaderboard</h3>
        </div>
        {userRank && (
          <Badge variant="secondary">
            Your Rank: #{userRank}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="points" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="points" className="text-xs sm:text-sm">
            <Trophy className="w-4 h-4 mr-1" />
            Points
          </TabsTrigger>
          <TabsTrigger value="badges" className="text-xs sm:text-sm">
            <Award className="w-4 h-4 mr-1" />
            Badges
          </TabsTrigger>
          <TabsTrigger value="features" className="text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 mr-1" />
            Discovery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="points" className="mt-4">
          <LeaderboardList entries={leaderboard} metric="points" />
        </TabsContent>

        <TabsContent value="badges" className="mt-4">
          <LeaderboardList entries={getTopByBadges()} metric="badges" />
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          <LeaderboardList entries={getTopByFeatures()} metric="features" />
        </TabsContent>
      </Tabs>
    </Card>
  );
};
